import React, { useState } from 'react'
import { FILE_TYPES } from '../lib/parse.js'

/**
 * Settings / Manage Data — शोज़ all uploaded files date-wise.
 * User can mark (checkbox) multiple days and remove them, or remove a single
 * file within a day, or clear everything.
 */
export default function Settings({ bundles, onDeleteSource, onDeleteDays, onClearAll }) {
  const [sel, setSel] = useState(new Set())
  const [confirmClear, setConfirmClear] = useState(false)

  const toggle = (date) => {
    const n = new Set(sel)
    n.has(date) ? n.delete(date) : n.add(date)
    setSel(n)
  }
  const allSelected = bundles.length > 0 && sel.size === bundles.length
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(bundles.map((b) => b.date)))

  const removeSelected = () => {
    if (!sel.size) return
    if (window.confirm(`${sel.size} दिन का data हटाएँ? यह वापस नहीं आएगा।`)) {
      onDeleteDays([...sel]); setSel(new Set())
    }
  }

  const totalFiles = bundles.reduce((a, b) => a + Object.keys(b.sources).length, 0)

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h2>⚙️ Data Manager</h2>
          <span className="date-chip">{bundles.length} दिन · {totalFiles} files</span>
        </div>
        <p className="muted-note">यहाँ आपकी सारी uploaded files date-wise हैं। किसी दिन को tick करके नीचे से हटाएँ, या किसी एक file को 🗑️ से।</p>

        {bundles.length > 0 && (
          <div className="mng-toolbar">
            <label className="date-toggle" style={{ fontSize: 12 }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span>सब select</span>
            </label>
            <button className="btn sm" disabled={!sel.size} onClick={removeSelected}>
              🗑️ चुने हुए हटाएँ ({sel.size})
            </button>
          </div>
        )}
      </div>

      {bundles.length === 0 && (
        <div className="card empty">
          <div className="empty-ic">🗂️</div>
          <h2>अभी कोई data नहीं</h2>
          <p>Upload करने पर आपकी files यहाँ date-wise दिखेंगी।</p>
        </div>
      )}

      {bundles.map((b) => (
        <div className={`card day-card ${sel.has(b.date) ? 'sel' : ''}`} key={b.date}>
          <div className="day-head">
            <label className="date-toggle" style={{ flex: 1 }}>
              <input type="checkbox" checked={sel.has(b.date)} onChange={() => toggle(b.date)} />
              <span style={{ fontWeight: 800, fontSize: 14 }}>📅 {b.date}</span>
            </label>
            <span className="cap" style={{ color: 'var(--muted)', fontSize: 11 }}>{Object.keys(b.sources).length} files</span>
          </div>
          <div className="file-list">
            {Object.keys(b.sources).map((t) => (
              <div className="file-row" key={t}>
                <span className="file-ic">{FILE_TYPES[t]?.icon || (t === 'vix' ? '🌡️' : '📄')}</span>
                <span className="file-name">{FILE_TYPES[t]?.label || (t === 'vix' ? 'India VIX' : t)}</span>
                <button className="file-del" title="हटाएँ"
                  onClick={() => { if (window.confirm(`${b.date} की यह file हटाएँ?`)) onDeleteSource(b.date, t) }}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {bundles.length > 0 && (
        <div className="card">
          <h2>⚠️ सब कुछ मिटाएँ</h2>
          {!confirmClear ? (
            <button className="btn ghost" onClick={() => setConfirmClear(true)}>🧹 पूरा data clear करें</button>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
                onClick={() => { onClearAll(); setConfirmClear(false); setSel(new Set()) }}>हाँ, सब मिटाओ</button>
              <button className="btn ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          )}
          <p className="muted-note" style={{ marginTop: 8 }}>यह सारा history हमेशा के लिए हटा देगा।</p>
        </div>
      )}
    </div>
  )
}
