import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { parseFile, FILE_TYPES } from './lib/parse.js'
import { computeNet, computeChange } from './lib/calc.js'
import { decode } from './lib/decode.js'
import { buildConfluence } from './lib/confluence.js'
import { makeSummary } from './lib/summary.js'
import { loadBundles, addSource, clearAll, deleteBundle } from './lib/store.js'
import { SAMPLE_BUNDLES } from './lib/sample.js'
import UploadSlots from './components/UploadSlots.jsx'
import NseDownload from './components/NseDownload.jsx'
import { ConfluenceCard, ScenarioCard, SummaryCard, SourcesCard } from './components/Confluence.jsx'
import { NetTable, ChangeTable, TrendTable } from './components/Tables.jsx'
import TrendGraph from './components/TrendGraph.jsx'
import PathCanvas from './components/PathCanvas.jsx'

function confirmExit() {
  if (window.confirm('क्या आप app बंद करना चाहते हैं? / Exit the app?')) {
    if (CapApp?.exitApp) CapApp.exitApp().catch(() => {})
    else window.close()
  }
}

export default function App() {
  const [bundles, setBundles] = useState(loadBundles())
  const [error, setError] = useState('')
  const [tab, setTab] = useState('upload')
  const [selectedDate, setSelectedDate] = useState(null)

  // Android hardware back button → confirm exit (only when nothing to go back to)
  useEffect(() => {
    let handle
    try {
      const p = CapApp.addListener?.('backButton', () => confirmExit())
      Promise.resolve(p).then((h) => { handle = h }).catch(() => {})
    } catch { /* web: no-op */ }
    return () => { try { handle?.remove?.() } catch { /* ignore */ } }
  }, [])

  const activeIdx = useMemo(() => {
    if (!bundles.length) return -1
    if (!selectedDate) return 0
    const i = bundles.findIndex((b) => b.date === selectedDate)
    return i >= 0 ? i : 0
  }, [bundles, selectedDate])

  const bundle = activeIdx >= 0 ? bundles[activeIdx] : null
  const prevBundle = activeIdx >= 0 ? bundles[activeIdx + 1] : null

  const oi = bundle?.sources?.participant_oi
  const prevOi = prevBundle?.sources?.participant_oi
  const todayNet = oi ? (oi.net || computeNet(oi)) : null
  const prevNet = prevOi ? (prevOi.net || computeNet(prevOi)) : null
  const change = useMemo(() => (todayNet ? computeChange(todayNet, prevNet) : null), [todayNet, prevNet])

  const conf = useMemo(() => {
    if (!bundle) return null
    const s = bundle.sources
    return buildConfluence({
      oi, oiChange: change, vol: s.participant_vol, fiiStats: s.fii_stats,
      optionChain: s.option_chain,
    })
  }, [bundle, oi, change])

  const decoded = useMemo(() => {
    if (!todayNet) return null
    const hist = bundles.slice(activeIdx).filter((b) => b.sources?.participant_oi)
      .map((b) => ({ date: b.date, net: b.sources.participant_oi.net || computeNet(b.sources.participant_oi) }))
    return decode(todayNet, change, hist)
  }, [todayNet, change, bundles, activeIdx])

  const summary = useMemo(() => (conf && bundle ? makeSummary(conf, bundle) : ''), [conf, bundle])

  const onUpload = useCallback(async (file, forcedType) => {
    try {
      setError('')
      const parsed = await parseFile(file, forcedType)
      // Merge every uploaded file into the currently-active date so that files
      // with slightly different auto-detected dates don't scatter into separate
      // bundles (this was making earlier files "disappear"). The date of the
      // FIRST file uploaded (or currently viewed) becomes the bundle date.
      const target = selectedDate || parsed.date
      const updated = addSource(parsed, target)
      setBundles(updated)
      setSelectedDate(target)
    } catch (e) {
      setError((e && e.message) || 'File parse नहीं हो पाई।')
    }
  }, [selectedDate])

  // Upload MANY files at once — auto-detect each and route to the right slot.
  const onUploadMany = useCallback(async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setError('')
    let target = selectedDate
    const ok = [], failed = []
    for (const file of files) {
      try {
        const parsed = await parseFile(file) // no forcedType → auto-detect
        if (!target) target = parsed.date
        addSource(parsed, target)
        ok.push(FILE_TYPES[parsed.type]?.label || parsed.type)
      } catch (e) {
        failed.push(file.name)
      }
    }
    setBundles(loadBundles())
    if (target) setSelectedDate(target)
    if (failed.length) setError(`पहचान नहीं हुई: ${failed.join(', ')}। (सही NSE file है?)`)
  }, [selectedDate])

  const loadSample = () => {
    clearAll()
    let last = []
    for (const bundle of SAMPLE_BUNDLES) {
      for (const src of Object.values(bundle.sources)) last = addSource(src, bundle.date)
    }
    setBundles(last); setSelectedDate(last[0]?.date || null); setError(''); setTab('dash')
  }

  return (
    <div className="app">
      <div className="hdr">
        <div className="brand">
          <div className="logo">OI</div>
          <div>
            <h1>Operator OI Tracker</h1>
            <div className="sub">Multi-Source NSE Smart-Money Decoder</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {bundle && <div className="cap" style={{ color: 'var(--muted)', fontSize: 12 }}>📅 {bundle.date}</div>}
          <button className="btn sm ghost" onClick={confirmExit} title="Exit app">✖ Exit</button>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'get' ? 'active' : ''}`} onClick={() => setTab('get')}>⬇️ NSE</div>
        <div className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>📤 Upload</div>
        <div className={`tab ${tab === 'dash' ? 'active' : ''}`} onClick={() => setTab('dash')}>🎯 Confluence</div>
        <div className={`tab ${tab === 'signals' ? 'active' : ''}`} onClick={() => setTab('signals')}>🔎 Signals</div>
        <div className={`tab ${tab === 'tables' ? 'active' : ''}`} onClick={() => setTab('tables')}>📊 Tables</div>
        <div className={`tab ${tab === 'trend' ? 'active' : ''}`} onClick={() => setTab('trend')}>📈 Trend</div>
        <div className={`tab ${tab === 'path' ? 'active' : ''}`} onClick={() => setTab('path')}>🔮 Path</div>
        <div className={`tab ${tab === 'hist' ? 'active' : ''}`} onClick={() => setTab('hist')}>🗂️ Days</div>
      </div>

      <div className="toolbar">
        <button className="btn sm ghost" onClick={loadSample}>🧪 Sample (all sources)</button>
        {bundles.length > 0 && <button className="btn sm ghost" onClick={() => { clearAll(); setBundles([]); setSelectedDate(null) }}>🗑️ सब मिटाएँ</button>}
      </div>

      {tab === 'get' && <NseDownload />}

      {tab === 'upload' && <UploadSlots bundle={bundle} onUpload={onUpload} onUploadMany={onUploadMany} error={error} />}

      {tab !== 'upload' && tab !== 'get' && !bundle && (
        <div className="card" style={{ textAlign: 'center', padding: 26 }}>
          <div style={{ fontSize: 38 }}>📊</div>
          <h2 style={{ justifyContent: 'center' }}>पहले कोई NSE file upload करें</h2>
          <button className="btn primary" style={{ marginTop: 10 }} onClick={() => setTab('upload')}>📤 Upload पर जाएँ</button>
          <div style={{ marginTop: 8 }}><button className="btn sm ghost" onClick={loadSample}>या Sample आज़माएँ</button></div>
        </div>
      )}

      {bundle && tab === 'dash' && (
        <>
          <ConfluenceCard conf={conf} date={bundle.date} />
          <SummaryCard text={summary} />
          <ScenarioCard conf={conf} />
          <SourcesCard bundle={bundle} onGoUpload={() => setTab('upload')} />
        </>
      )}

      {bundle && tab === 'signals' && (
        decoded ? <SignalsView decoded={decoded} /> :
        <div className="card"><p className="disclaimer">Signals के लिए Participant OI file चाहिए। Upload में डालें।</p></div>
      )}

      {bundle && tab === 'tables' && (
        todayNet ? <><ChangeTable change={change} /><NetTable todayNet={todayNet} /></> :
        <div className="card"><p className="disclaimer">Tables के लिए Participant OI file चाहिए।</p></div>
      )}

      {bundle && tab === 'trend' && (
        <>
          <TrendGraph bundles={bundles} />
          <TrendTable history={bundles.slice(activeIdx).filter((b)=>b.sources?.participant_oi).map((b)=>({date:b.date, net:b.sources.participant_oi.net||computeNet(b.sources.participant_oi)}))} />
        </>
      )}

      {bundle && tab === 'path' && <PathCanvas bias={conf ? { key: conf.key } : decoded?.bias} />}

      {bundle && tab === 'hist' && (
        <DaysList bundles={bundles} active={bundle.date}
          onSelect={(d) => { setSelectedDate(d); setTab('dash') }}
          onDelete={(d) => setBundles(deleteBundle(d))} />
      )}

      <div className="footer">
        ⚠️ यह ऐप केवल शिक्षा व data-organisation के लिए है। कोई signal निवेश सलाह नहीं — 90%+ F&O ट्रेडर नुकसान करते हैं (SEBI)। अपना risk खुद समझें।<br />
        Sources: NSE All Reports (Derivatives). Institutional shorts कभी hedge होते हैं — यह context है, trigger नहीं।
      </div>
    </div>
  )
}

function SignalsView({ decoded }) {
  const icon = (l) => l === 'danger' ? '🚨' : l === 'warn' ? '⚠️' : l === 'good' ? '✅' : 'ℹ️'
  return (
    <div className="card">
      <h2>🔎 Decoded Signals <span className="cap">Participant OI से</span></h2>
      {decoded.signals.map((s, i) => (
        <div key={i} className={`sig ${s.level}`}>
          <div className="t">{icon(s.level)} {s.title}</div>
          <div className="hi">{s.hi}</div>
          <div className="en">{s.en}</div>
        </div>
      ))}
    </div>
  )
}

function DaysList({ bundles, active, onSelect, onDelete }) {
  return (
    <div className="card">
      <h2>🗂️ Uploaded Days <span className="cap">{bundles.length} दिन</span></h2>
      {bundles.map((b) => (
        <div className="hist-row" key={b.date}>
          <div onClick={() => onSelect(b.date)} style={{ cursor: 'pointer', flex: 1 }}>
            <b style={{ color: b.date === active ? 'var(--indigo)' : 'var(--txt)' }}>📅 {b.date}</b>
            <div className="cap" style={{ color: 'var(--muted)', fontSize: 11 }}>{Object.keys(b.sources).length} sources</div>
          </div>
          <button className="btn sm ghost" onClick={() => onSelect(b.date)}>View</button>
          <button className="btn sm ghost" onClick={() => onDelete(b.date)}>🗑️</button>
        </div>
      ))}
    </div>
  )
}
