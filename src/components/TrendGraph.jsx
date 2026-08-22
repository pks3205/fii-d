import React, { useRef, useEffect, useState } from 'react'
import { computeNet, INSTRUMENTS, PARTICIPANTS, PARTICIPANT_LABEL } from '../lib/calc.js'

/** Multi-day line graph of a chosen participant+instrument net position. */
export default function TrendGraph({ bundles }) {
  const [participant, setParticipant] = useState('FII')
  const [instKey, setInstKey] = useState('idxFut')
  const ref = useRef(null)

  // oldest→newest series of {date, net}
  const series = [...bundles]
    .filter((b) => b.sources?.participant_oi)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((b) => {
      const oi = b.sources.participant_oi
      const net = oi.net || computeNet(oi)
      return { date: b.date, val: net?.[participant]?.[instKey]?.net ?? null }
    })

  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const dpr = window.devicePixelRatio || 1
    const w = cv.clientWidth, h = 240
    cv.width = w * dpr; cv.height = h * dpr
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h)
    const pad = 34
    const pts = series.filter((s) => s.val != null)
    if (pts.length === 0) { ctx.fillStyle = '#8b93a7'; ctx.font = '13px sans-serif'; ctx.fillText('कोई data नहीं', pad, h / 2); return }
    const vals = pts.map((p) => p.val)
    let min = Math.min(0, ...vals), max = Math.max(0, ...vals)
    if (min === max) { min -= 1; max += 1 }
    const x = (i) => pad + (w - pad * 1.5) * (pts.length === 1 ? 0.5 : i / (pts.length - 1))
    const y = (v) => h - pad - (h - pad * 1.6) * ((v - min) / (max - min))

    // zero line
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(pad, y(0)); ctx.lineTo(w - pad / 2, y(0)); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = '#8b93a7'; ctx.font = '10px sans-serif'; ctx.fillText('0', 6, y(0) + 3)
    ctx.fillText(max.toLocaleString('en-IN'), 6, y(max) + 3)
    ctx.fillText(min.toLocaleString('en-IN'), 6, y(min) + 3)

    // line
    ctx.strokeStyle = '#5b7cff'; ctx.lineWidth = 2.5; ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.val)) : ctx.moveTo(x(i), y(p.val))))
    ctx.stroke()
    // dots + labels
    pts.forEach((p, i) => {
      ctx.fillStyle = p.val >= 0 ? '#00e676' : '#ff2d55'
      ctx.beginPath(); ctx.arc(x(i), y(p.val), 3.5, 0, 7); ctx.fill()
      ctx.fillStyle = '#8b93a7'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(p.date.slice(5), x(i), h - 12); ctx.textAlign = 'left'
    })
  }, [series, participant, instKey])

  return (
    <div className="card">
      <h2>📈 Multi-Day Trend <span className="cap">5-10 दिन ज़्यादा भरोसेमंद</span></h2>
      <div className="pick-row">
        <select value={participant} onChange={(e) => setParticipant(e.target.value)}>
          {PARTICIPANTS.map((p) => <option key={p} value={p}>{PARTICIPANT_LABEL[p]}</option>)}
        </select>
        <select value={instKey} onChange={(e) => setInstKey(e.target.value)}>
          {INSTRUMENTS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
        </select>
      </div>
      <canvas ref={ref} style={{ width: '100%', height: 240, display: 'block' }} />
      <p className="disclaimer" style={{ marginTop: 8 }}>Net position (Long − Short) — जितने दिन upload करेंगे, उतना लंबा trend।</p>
    </div>
  )
}
