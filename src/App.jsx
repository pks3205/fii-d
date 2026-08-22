import React, { useState, useRef, useMemo, useCallback } from 'react'
import { parseFile } from './lib/parse.js'
import { computeNet, computeChange } from './lib/calc.js'
import { decode } from './lib/decode.js'
import { loadHistory, saveDay, clearHistory, deleteDay } from './lib/store.js'
import { SAMPLE_DAYS } from './lib/sample.js'
import { NetTable, ChangeTable, TrendTable } from './components/Tables.jsx'
import PathCanvas from './components/PathCanvas.jsx'

export default function App() {
  const [history, setHistory] = useState(loadHistory())
  const [error, setError] = useState('')
  const [tab, setTab] = useState('dash')
  const [drag, setDrag] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const fileRef = useRef(null)

  // Which day are we viewing? default = newest
  const activeIdx = useMemo(() => {
    if (!history.length) return -1
    if (!selectedDate) return 0
    const i = history.findIndex((h) => h.date === selectedDate)
    return i >= 0 ? i : 0
  }, [history, selectedDate])

  const today = activeIdx >= 0 ? history[activeIdx] : null
  const prev = activeIdx >= 0 ? history[activeIdx + 1] : null

  const todayNet = today?.net || (today ? computeNet(today) : null)
  const prevNet = prev?.net || (prev ? computeNet(prev) : null)
  const change = useMemo(
    () => (todayNet ? computeChange(todayNet, prevNet) : null),
    [todayNet, prevNet]
  )
  const decoded = useMemo(() => {
    if (!todayNet) return null
    const histFromActive = history.slice(activeIdx)
    return decode(todayNet, change, histFromActive)
  }, [todayNet, change, history, activeIdx])

  const ingest = useCallback((day) => {
    const updated = saveDay(day)
    setHistory(updated)
    setSelectedDate(day.date)
    setError('')
  }, [])

  const onFile = async (file) => {
    if (!file) return
    try {
      setError('')
      const day = await parseFile(file)
      ingest(day)
      setTab('dash')
    } catch (e) {
      setError(e.message || 'File parse नहीं हो पाई। सही NSE Participant OI फ़ाइल (.xlsx/.csv) चुनें।')
    }
  }

  const loadSample = () => {
    clearHistory()
    SAMPLE_DAYS.forEach((d) => saveDay(d))
    const h = loadHistory()
    setHistory(h)
    setSelectedDate(h[0]?.date || null)
    setError('')
    setTab('dash')
  }

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files?.[0]
    onFile(f)
  }

  return (
    <div className="app">
      <div className="hdr">
        <div className="brand">
          <div className="logo">OI</div>
          <div>
            <h1>Operator OI Tracker</h1>
            <div className="sub">Participant-wise Open Interest · Smart-Money Decoder</div>
          </div>
        </div>
        {today && <div className="cap" style={{ color: 'var(--muted)', fontSize: 12 }}>📅 {today.date}</div>}
      </div>

      {/* Upload zone */}
      <div
        className={`drop ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        role="button"
      >
        <div className="big">📤 Upload NSE Sheet (.xlsx / .csv)</div>
        <div className="hint">"Participant wise Open Interest" फ़ाइल यहाँ tap करके चुनें या drag करें</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      <div className="toolbar">
        <button className="btn sm ghost" onClick={loadSample}>🧪 Sample data से try करें</button>
        {history.length > 0 && (
          <button className="btn sm ghost" onClick={() => { clearHistory(); setHistory([]); setSelectedDate(null) }}>🗑️ सब मिटाएँ</button>
        )}
      </div>

      {error && <div className="warnbox">⚠️ {error}</div>}

      {!today ? (
        <EmptyState onSample={loadSample} />
      ) : (
        <>
          <div className="tabs">
            <div className={`tab ${tab === 'dash' ? 'active' : ''}`} onClick={() => setTab('dash')}>🧭 Dashboard</div>
            <div className={`tab ${tab === 'tables' ? 'active' : ''}`} onClick={() => setTab('tables')}>📊 Tables</div>
            <div className={`tab ${tab === 'trend' ? 'active' : ''}`} onClick={() => setTab('trend')}>📈 3-Day Trend</div>
            <div className={`tab ${tab === 'path' ? 'active' : ''}`} onClick={() => setTab('path')}>🎯 Path</div>
            <div className={`tab ${tab === 'hist' ? 'active' : ''}`} onClick={() => setTab('hist')}>🗂️ History</div>
          </div>

          {tab === 'dash' && <Dashboard decoded={decoded} today={today} prev={prev} />}
          {tab === 'tables' && (
            <>
              <ChangeTable change={change} />
              <NetTable todayNet={todayNet} />
            </>
          )}
          {tab === 'trend' && <TrendTable history={history.slice(activeIdx)} />}
          {tab === 'path' && <PathCanvas bias={decoded?.bias} />}
          {tab === 'hist' && (
            <HistoryList
              history={history}
              active={today?.date}
              onSelect={(d) => { setSelectedDate(d); setTab('dash') }}
              onDelete={(d) => setHistory(deleteDay(d))}
            />
          )}
        </>
      )}

      <div className="footer">
        ⚠️ यह ऐप केवल शिक्षा व data-organisation के लिए है। कोई भी signal निवेश सलाह नहीं है — 90%+ F&O ट्रेडर नुकसान करते हैं (SEBI). अपना risk खुद समझें.<br />
        Data source: NSE "Participant wise Open Interest" report · Method inspired by public OI-reading techniques.
      </div>
    </div>
  )
}

function Dashboard({ decoded, today, prev }) {
  if (!decoded) return null
  const { bias, score, signals } = decoded
  const cls = bias.key === 'bull' ? 'bias-bull' : bias.key === 'bear' ? 'bias-bear' : bias.key === 'vol' ? 'bias-vol' : 'bias-neutral'
  const knob = Math.max(0, Math.min(100, 50 + score * 8))
  return (
    <>
      <div className="card">
        <h2>🧭 Market Bias <span className="cap">आज का overall झुकाव</span></h2>
        <div className="gauge">
          <div className={`bias-pill ${cls}`}>{bias.label} · {bias.hi}</div>
          <div className="meter">
            <div className="meter-track"><div className="meter-knob" style={{ left: `${knob}%` }} /></div>
            <div className="meter-labels"><span>मंदी Bearish</span><span>तेजी Bullish</span></div>
          </div>
        </div>
        <p className="disclaimer" style={{ marginTop: 10 }}>
          ✅ Loaded: <b>{today.fileName}</b>{prev ? ` · तुलना ${prev.date} से` : ' · (पिछले दिन का data नहीं — change के लिए एक और दिन upload करें)'}
        </p>
      </div>

      <div className="card">
        <h2>🔎 Decoded Signals <span className="cap">आसान भाषा में</span></h2>
        {signals.map((s, i) => (
          <div key={i} className={`sig ${s.level}`}>
            <div className="t">{icon(s.level)} {s.title}</div>
            <div className="hi">{s.hi}</div>
            <div className="en">{s.en}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function icon(level) {
  return level === 'danger' ? '🚨' : level === 'warn' ? '⚠️' : level === 'good' ? '✅' : 'ℹ️'
}

function HistoryList({ history, active, onSelect, onDelete }) {
  return (
    <div className="card">
      <h2>🗂️ Uploaded Days <span className="cap">{history.length} दिन save</span></h2>
      {history.map((h) => (
        <div className="hist-row" key={h.date}>
          <div onClick={() => onSelect(h.date)} style={{ cursor: 'pointer', flex: 1 }}>
            <b style={{ color: h.date === active ? 'var(--indigo)' : 'var(--txt)' }}>📅 {h.date}</b>
            <div className="cap" style={{ color: 'var(--muted)', fontSize: 11 }}>{h.fileName}</div>
          </div>
          <button className="btn sm ghost" onClick={() => onSelect(h.date)}>View</button>
          <button className="btn sm ghost" onClick={() => onDelete(h.date)}>🗑️</button>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onSample }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 28 }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
      <h2 style={{ justifyContent: 'center' }}>शुरू करने के लिए एक फ़ाइल upload करें</h2>
      <p className="disclaimer" style={{ maxWidth: 460, margin: '6px auto 16px' }}>
        NSE की वेबसाइट से रोज़ शाम "Participant wise Open Interest" फ़ाइल download करें और ऊपर upload करें।
        या बिना फ़ाइल के देखने के लिए sample data आज़माएँ।
      </p>
      <button className="btn primary" onClick={onSample}>🧪 Sample data load करें</button>
    </div>
  )
}
