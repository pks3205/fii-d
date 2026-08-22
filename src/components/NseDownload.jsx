import React, { useState } from 'react'
import { nseLinks, NSE_ALL_REPORTS } from '../lib/nseLinks.js'

export default function NseDownload() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const links = nseLinks(date)

  return (
    <div className="card">
      <h2>⬇️ NSE से Files Download <span className="cap">direct links</span></h2>

      <div className="warnbox" style={{ marginBottom: 12 }}>
        💡 <b>ज़रूरी tip:</b> NSE का firewall सीधे link खोलने पर कभी-कभी रोक देता है (403)। पहले इसी browser में
        एक बार <a href={NSE_ALL_REPORTS} target="_blank" rel="noreferrer" style={{ color: '#9fb0ff' }}>nseindia.com</a> खोल
        लें, फिर नीचे के links काम करेंगे।
      </div>

      <div className="pick-row" style={{ alignItems: 'center' }}>
        <label className="cap" style={{ flex: '0 0 auto' }}>📅 Date:</label>
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)}
          style={{ flex: 1, background: 'var(--card2)', color: 'var(--txt)', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 10px', fontSize: 13 }} />
      </div>

      <p className="disclaimer" style={{ margin: '4px 0 12px' }}>
        उस दिन का data चुनें (weekend/holiday पर file नहीं बनती)। नीचे link tap करके download करें, फिर <b>Upload tab</b> में सही slot में डालें।
      </p>

      <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
        onClick={() => downloadAll(links)}>
        ⬇️⬇️ सभी 4 files एक साथ download करें
      </button>

      {links.map((l) => (
        <div key={l.type} className="dl-row">
          <span className="dl-icon">{l.icon}</span>
          <div className="dl-body">
            <div className="dl-title">{l.label}</div>
            <div className="dl-note">{l.note}</div>
            <div className="dl-url">{l.url}</div>
          </div>
          <div className="dl-actions">
            <a className="btn sm primary" href={l.url} target="_blank" rel="noreferrer">⬇️</a>
            <button className="btn sm ghost" onClick={() => copy(l.url)}>📋</button>
          </div>
        </div>
      ))}

      <a className="btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
        href={NSE_ALL_REPORTS} target="_blank" rel="noreferrer">
        🌐 NSE All Reports page खोलें (सारी files एक जगह)
      </a>
    </div>
  )
}

function copy(text) {
  try { navigator.clipboard?.writeText(text) } catch { /* ignore */ }
}

function downloadAll(links) {
  // Open each file in a new tab, staggered so the browser/NSE doesn't block.
  links.forEach((l, i) => {
    setTimeout(() => {
      const a = document.createElement('a')
      a.href = l.url
      a.target = '_blank'
      a.rel = 'noreferrer'
      a.download = ''
      document.body.appendChild(a)
      a.click()
      a.remove()
    }, i * 700)
  })
}
