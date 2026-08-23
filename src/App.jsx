import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { parseFile, FILE_TYPES } from './lib/parse.js'
import { computeNet, computeChange } from './lib/calc.js'
import { decode } from './lib/decode.js'
import { buildConfluence } from './lib/confluence.js'
import { makeSummary } from './lib/summary.js'
import { loadBundles, addSource, clearAll, setManualVix, deleteSource, deleteDays } from './lib/store.js'
import { SAMPLE_BUNDLES } from './lib/sample.js'
import UploadSlots from './components/UploadSlots.jsx'
import NseDownload from './components/NseDownload.jsx'
import { ConfluenceCard, ScenarioCard, SummaryCard, SourcesCard } from './components/Confluence.jsx'
import { NetTable, ChangeTable, TrendTable } from './components/Tables.jsx'
import TrendGraph from './components/TrendGraph.jsx'
import LevelMigration from './components/LevelMigration.jsx'
import PathCanvas from './components/PathCanvas.jsx'
import Overview from './components/Overview.jsx'
import Settings from './components/Settings.jsx'
import { expiryInfo } from './lib/expiry.js'
import { shareCSV, sharePDF } from './lib/export.js'

function confirmExit() {
  if (window.confirm('क्या आप app बंद करना चाहते हैं? / Exit the app?')) {
    if (CapApp?.exitApp) CapApp.exitApp().catch(() => {})
    else window.close()
  }
}

export default function App() {
  const [bundles, setBundles] = useState(loadBundles())
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')
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
      optionChain: s.option_chain, cash: s.fii_dii_cash, vix: s.vix,
    })
  }, [bundle, oi, change])

  const decoded = useMemo(() => {
    if (!todayNet) return null
    const hist = bundles.slice(activeIdx).filter((b) => b.sources?.participant_oi)
      .map((b) => ({ date: b.date, net: b.sources.participant_oi.net || computeNet(b.sources.participant_oi) }))
    return decode(todayNet, change, hist)
  }, [todayNet, change, bundles, activeIdx])

  const summary = useMemo(() => (conf && bundle ? makeSummary(conf, bundle) : ''), [conf, bundle])

  const onUpload = useCallback(async (file, forcedType, uploadDate = null) => {
    try {
      setError('')
      const parsed = await parseFile(file, forcedType)
      const date = uploadDate || parsed.date
      if (!date) { setError(`📅 "${file.name}" की date नहीं मिली — ऊपर "Date खुद चुनें" करके दोबारा डालें।`); return }
      const updated = addSource(parsed, date)
      setBundles(updated)
      setSelectedDate(date)
    } catch (e) {
      setError((e && e.message) || 'File parse नहीं हो पाई।')
    }
  }, [])

  // Upload MANY files at once — auto-detect each and route to the right slot.
  // Upload MANY files at once — auto-detect each, route to the right slot, and
  // group them BY THEIR OWN DATE so each trading day becomes its own saved
  // bundle (multi-day history builds up). Files of one NSE day share a date, so
  // they group together automatically. An optional uploadDate overrides this
  // (useful if a file's date can't be detected).
  const onUploadMany = useCallback(async (fileList, uploadDate = null) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setError('')
    const failed = []          // couldn't parse at all
    const noDate = []          // parsed but no date found & no manual date given
    const datesTouched = new Set()
    let added = 0
    for (const file of files) {
      try {
        const parsed = await parseFile(file) // auto-detect type + date
        // Priority: manual override date → file's own detected date
        const date = uploadDate || parsed.date
        if (!date) { noDate.push(file.name); continue }
        addSource(parsed, date)
        datesTouched.add(date)
        added++
      } catch (e) {
        failed.push(file.name)
      }
    }
    setBundles(loadBundles())
    const newest = [...datesTouched].sort().pop()
    if (newest) setSelectedDate(newest)

    // Friendly, specific feedback
    const msgs = []
    if (added) msgs.push(`✅ ${added} file(s), ${datesTouched.size} दिन में save हुईं।`)
    if (noDate.length) msgs.push(`📅 इनकी date नहीं मिली — ऊपर "Date खुद चुनें" करके दोबारा डालें: ${noDate.join(', ')}`)
    if (failed.length) msgs.push(`⚠️ ये पढ़ी नहीं गईं (सही NSE file?): ${failed.join(', ')}`)
    setError(noDate.length || failed.length ? msgs.join('  ') : '')
    return { added, days: datesTouched.size }
  }, [])

  const onSetVix = useCallback((uploadDate, vix) => {
    const date = uploadDate || selectedDate || new Date().toISOString().slice(0, 10)
    setBundles(setManualVix(date, vix))
    setSelectedDate(date)
  }, [selectedDate])

  const onDone = useCallback(() => setTab('overview'), [])
  const onDeleteSource = useCallback((date, type) => setBundles(deleteSource(date, type)), [])
  const onDeleteDays = useCallback((dates) => setBundles(deleteDays(dates)), [])
  const onClearAll = useCallback(() => { clearAll(); setBundles([]); setSelectedDate(null) }, [])

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
      <div className="appbar">
        <div className="brand">
          <div className="logo">OI</div>
          <div>
            <h1>Operator OI</h1>
            <div className="sub">Smart-Money Decoder</div>
          </div>
        </div>
        <div className="appbar-right">
          {bundle && <span className="date-chip">📅 {bundle.date}</span>}
          <button className="icon-btn" onClick={loadSample} title="Sample data">🧪</button>
          <button className="icon-btn" onClick={confirmExit} title="Exit">✕</button>
        </div>
      </div>

      {/* Sub-tabs shown only inside the Analysis section */}
      {['overview', 'dash', 'signals', 'tables', 'trend', 'path'].includes(tab) && bundle && (
        <div className="seg">
          {[
            ['overview', 'Overview'], ['dash', 'Confluence'], ['signals', 'Signals'],
            ['tables', 'Tables'], ['trend', 'Trend'], ['path', 'Path'],
          ].map(([id, label]) => (
            <div key={id} className={`seg-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</div>
          ))}
        </div>
      )}

      {tab === 'get' && <NseDownload />}

      {tab === 'upload' && <UploadSlots bundle={bundle} onUpload={onUpload} onUploadMany={onUploadMany} onSetVix={onSetVix} onDone={onDone} error={error} />}

      {['overview', 'dash', 'signals', 'tables', 'trend', 'path'].includes(tab) && !bundle && (
        <div className="card empty">
          <div className="empty-ic">📊</div>
          <h2>अभी कोई data नहीं</h2>
          <p>NSE की files upload करें — फिर यहाँ पूरा smart-money analysis, levels और "कल क्या होगा" दिखेगा।</p>
          <button className="btn primary" onClick={() => setTab('upload')}>📤 Files Upload करें</button>
          <div style={{ marginTop: 10 }}><button className="btn sm ghost" onClick={loadSample}>या Sample आज़माएँ</button></div>
        </div>
      )}

      {bundle && tab === 'overview' && <Overview bundles={bundles} />}

      {bundle && tab === 'dash' && (
        <>
          <ExpiryCard bundle={bundle} />
          <ConfluenceCard conf={conf} date={bundle.date} />
          {conf?.divergence?.active && (
            <div className="card" style={{ borderLeft: '4px solid var(--amber)' }}>
              <h2>⚡ FII vs Pro Divergence</h2>
              <div className="sig warn"><div className="hi">{conf.divergence.text}</div></div>
            </div>
          )}
          <SummaryCard text={summary} />
          <ScenarioCard conf={conf} />
          <ExportCard bundle={bundle} prevBundle={prevBundle} conf={conf} summary={summary} />
          <SourcesCard bundle={bundle} onGoUpload={() => setTab('upload')} />
        </>
      )}

      {bundle && tab === 'signals' && (
        decoded ? <SignalsView decoded={decoded} /> :
        <div className="card"><p className="muted-note">Signals के लिए Participant OI file चाहिए। Upload में डालें।</p></div>
      )}

      {bundle && tab === 'tables' && (
        todayNet ? <><ChangeTable change={change} /><NetTable todayNet={todayNet} /></> :
        <div className="card"><p className="muted-note">Tables के लिए Participant OI file चाहिए।</p></div>
      )}

      {bundle && tab === 'trend' && (
        <>
          <TrendGraph bundles={bundles} />
          <LevelMigration bundles={bundles} />
          <TrendTable history={bundles.slice(activeIdx).filter((b)=>b.sources?.participant_oi).map((b)=>({date:b.date, net:b.sources.participant_oi.net||computeNet(b.sources.participant_oi)}))} />
        </>
      )}

      {bundle && tab === 'path' && <PathCanvas bias={conf ? { key: conf.key } : decoded?.bias} levels={conf?.levels} conf={conf} />}

      {tab === 'hist' && (
        <DaysList bundles={bundles} active={bundle?.date}
          onSelect={(d) => { setSelectedDate(d); setTab('dash') }} />
      )}

      {tab === 'settings' && (
        <Settings bundles={bundles} onDeleteSource={onDeleteSource} onDeleteDays={onDeleteDays} onClearAll={onClearAll} />
      )}

      <BottomNav tab={tab} setTab={setTab} bundle={bundle} />
    </div>
  )
}

function BottomNav({ tab, setTab, bundle }) {
  const analysisTabs = ['overview', 'dash', 'signals', 'tables', 'trend', 'path']
  const items = [
    { id: 'get', ic: '⬇️', label: 'NSE' },
    { id: 'upload', ic: '📤', label: 'Upload' },
    { id: 'overview', ic: '📊', label: 'Analysis', match: analysisTabs },
    { id: 'hist', ic: '🗂️', label: 'Days' },
    { id: 'settings', ic: '⚙️', label: 'Settings' },
  ]
  return (
    <nav className="bottomnav">
      {items.map((it) => {
        const active = it.match ? it.match.includes(tab) : tab === it.id
        return (
          <button key={it.id} className={`navitem ${active ? 'active' : ''}`}
            onClick={() => setTab(it.id === 'overview' && !bundle ? 'upload' : it.id)}>
            <span className="ic">{it.ic}</span>
            <span>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function ExpiryCard({ bundle }) {
  const e = expiryInfo(bundle.date)
  const cls = e.urgency === 'high' ? 'sig danger' : e.urgency === 'mid' ? 'sig warn' : 'sig info'
  return (
    <div className="card">
      <h2>⏳ Expiry <span className="cap">{e.expiryDate}{e.isMonthly ? ' · Monthly' : ' · Weekly'}</span></h2>
      <div className={cls}>
        <div className="t">📅 {e.label}</div>
        <div className="hi">{e.note}</div>
      </div>
    </div>
  )
}

function ExportCard({ bundle, prevBundle, conf, summary }) {
  const [busy, setBusy] = React.useState('')
  const run = async (kind) => {
    setBusy(kind)
    try {
      if (kind === 'csv') await shareCSV(bundle, prevBundle, conf)
      else await sharePDF(bundle, prevBundle, conf, summary)
    } catch (e) { alert('Share/save नहीं हुआ: ' + (e?.message || e)) }
    setBusy('')
  }
  return (
    <div className="card">
      <h2>📤 पूरी Report Share करें</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={busy} onClick={() => run('pdf')}>
          {busy === 'pdf' ? '⏳...' : '📑 PDF Report (tables + chart)'}
        </button>
        <button className="btn" disabled={busy} onClick={() => run('csv')}>
          {busy === 'csv' ? '⏳...' : '📄 CSV'}
        </button>
      </div>
      <p className="muted-note" style={{ marginTop: 8 }}>PDF में verdict, सारी tables, levels, max-pain, signals — सब एक साथ। फोन में native share sheet खुलेगा (WhatsApp/Gmail)।</p>
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

function DaysList({ bundles, active, onSelect }) {
  return (
    <div className="card">
      <h2>🗂️ Saved Days <span className="cap">{bundles.length} दिन का इतिहास</span></h2>
      {bundles.map((b) => (
        <div className="hist-row" key={b.date} onClick={() => onSelect(b.date)} style={{ cursor: 'pointer' }}>
          <div style={{ flex: 1 }}>
            <b style={{ color: b.date === active ? 'var(--indigo)' : 'var(--txt)' }}>📅 {b.date}</b>
            <div className="cap" style={{ color: 'var(--muted)', fontSize: 11 }}>{Object.keys(b.sources).length} sources</div>
          </div>
          <button className="btn sm ghost">View</button>
        </div>
      ))}
    </div>
  )
}
