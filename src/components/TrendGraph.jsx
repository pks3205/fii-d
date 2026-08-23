import React, { useRef, useEffect, useState } from 'react'
import { computeNet, INSTRUMENTS, PARTICIPANTS, PARTICIPANT_LABEL, fmtC } from '../lib/calc.js'

/** Multi-day trend of a chosen participant+instrument net position — polished. */
export default function TrendGraph({ bundles }) {
  const [participant, setParticipant] = useState('FII')
  const [instKey, setInstKey] = useState('idxFut')
  const ref = useRef(null)

  const series = [...bundles]
    .filter((b) => b.sources?.participant_oi)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((b) => {
      const net = b.sources.participant_oi.net || computeNet(b.sources.participant_oi)
      return { date: b.date, val: net?.[participant]?.[instKey]?.net ?? null }
    })
  const pts = series.filter((s) => s.val != null)
  const latest = pts[pts.length - 1]?.val ?? null
  const first = pts[0]?.val ?? null
  const chg = latest != null && first != null ? latest - first : null

  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const dpr = window.devicePixelRatio || 1
    const w = cv.clientWidth, h = 220
    cv.width = w * dpr; cv.height = h * dpr
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h)
    const padX = 8, padTop = 16, padBot = 26

    if (pts.length === 0) { ctx.fillStyle = '#6b7385'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('इस चुनाव के लिए data नहीं', w / 2, h / 2); return }

    const vals = pts.map((p) => p.val)
    let min = Math.min(0, ...vals), max = Math.max(0, ...vals)
    if (min === max) { min -= 1; max += 1 }
    const range = max - min
    const x = (i) => padX + (w - padX * 2) * (pts.length === 1 ? 0.5 : i / (pts.length - 1))
    const y = (v) => h - padBot - (h - padTop - padBot) * ((v - min) / range)

    // gridlines
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1
    for (let i = 0; i <= 3; i++) { const yy = padTop + ((h - padTop - padBot) / 3) * i; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke() }

    // zero line
    if (min < 0 && max > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(0, y(0)); ctx.lineTo(w, y(0)); ctx.stroke(); ctx.setLineDash([])
    }

    const up = latest >= 0
    const col = up ? '#22e08a' : '#ff3b5c'

    // area fill
    const grad = ctx.createLinearGradient(0, padTop, 0, h - padBot)
    grad.addColorStop(0, up ? 'rgba(34,224,138,.28)' : 'rgba(255,59,92,.28)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.val)) : ctx.moveTo(x(i), y(p.val))))
    ctx.lineTo(x(pts.length - 1), y(min)); ctx.lineTo(x(0), y(min)); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()

    // line
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.val)) : ctx.moveTo(x(i), y(p.val))))
    ctx.stroke()

    // dots
    pts.forEach((p, i) => { ctx.fillStyle = p.val >= 0 ? '#22e08a' : '#ff3b5c'; ctx.beginPath(); ctx.arc(x(i), y(p.val), i === pts.length - 1 ? 4.5 : 2.8, 0, 7); ctx.fill() })

    // latest badge
    const lx = x(pts.length - 1), ly = y(latest)
    ctx.fillStyle = col; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(fmtC(latest), Math.min(lx, w - 6), Math.max(ly - 8, 14))

    // x labels (first, last, and middle if room)
    ctx.fillStyle = '#6b7385'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'
    const idxs = pts.length <= 4 ? pts.map((_, i) => i) : [0, Math.floor(pts.length / 2), pts.length - 1]
    idxs.forEach((i) => ctx.fillText(pts[i].date.slice(5), x(i), h - 8))
    ctx.textAlign = 'left'
  }, [participant, instKey, bundles])

  return (
    <div className="card">
      <div className="card-head">
        <h2>📈 Multi-Day Trend</h2>
        {chg != null && <span className={`badge ${chg >= 0 ? 'pos' : 'neg'}`}>{chg >= 0 ? '▲' : '▼'} {fmtC(chg)} ({pts.length}d)</span>}
      </div>
      <div className="pick-row">
        <select value={participant} onChange={(e) => setParticipant(e.target.value)}>
          {PARTICIPANTS.map((p) => <option key={p} value={p}>{PARTICIPANT_LABEL[p]}</option>)}
        </select>
        <select value={instKey} onChange={(e) => setInstKey(e.target.value)}>
          {INSTRUMENTS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
        </select>
      </div>
      <canvas ref={ref} style={{ width: '100%', height: 220, display: 'block' }} />
      {chg != null && (
        <div className="hint-line">
          {PARTICIPANT_LABEL[participant]} ने {INSTRUMENTS.find((i) => i.key === instKey)?.label} में {pts.length} दिन में{' '}
          <b className={chg >= 0 ? 'pos' : 'neg'}>{chg >= 0 ? 'position बढ़ाई' : 'position घटाई'}</b> ({fmtC(chg)})।
          अभी net: <b className={latest >= 0 ? 'pos' : 'neg'}>{fmtC(latest)}</b> ({latest >= 0 ? 'long' : 'short'})।
        </div>
      )}
    </div>
  )
}


