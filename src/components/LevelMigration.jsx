import React, { useRef, useEffect } from 'react'

/**
 * Multi-day movement of the strongest Support & Resistance (from Option OI).
 * Shows how levels migrate over days — rising S/R = bullish structure, falling = bearish.
 */
export default function LevelMigration({ bundles }) {
  const ref = useRef(null)

  // oldest→newest series with option_chain data
  const series = [...bundles]
    .filter((b) => b.sources?.option_chain?.support || b.sources?.option_chain?.resistance)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((b) => ({
      date: b.date,
      support: b.sources.option_chain.support,
      resistance: b.sources.option_chain.resistance,
      spot: b.sources.option_chain.spotProxy,
    }))

  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const dpr = window.devicePixelRatio || 1
    const w = cv.clientWidth, h = 260
    cv.width = w * dpr; cv.height = h * dpr
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h)
    const pad = 44

    if (series.length < 1) {
      ctx.fillStyle = '#8b93a7'; ctx.font = '13px sans-serif'
      ctx.fillText('Option Chain file वाले दिन चाहिए (कम से कम 1)', pad, h / 2); return
    }

    const allVals = series.flatMap((s) => [s.support, s.resistance, s.spot].filter(Boolean))
    let min = Math.min(...allVals), max = Math.max(...allVals)
    if (min === max) { min -= 100; max += 100 }
    const padV = (max - min) * 0.1; min -= padV; max += padV

    const x = (i) => pad + (w - pad * 1.4) * (series.length === 1 ? 0.5 : i / (series.length - 1))
    const y = (v) => h - pad + 6 - (h - pad * 1.5) * ((v - min) / (max - min))

    // y-axis labels
    ctx.fillStyle = '#8b93a7'; ctx.font = '10px sans-serif'
    ctx.fillText(Math.round(max).toLocaleString('en-IN'), 4, y(max) + 3)
    ctx.fillText(Math.round(min).toLocaleString('en-IN'), 4, y(min) + 3)

    const line = (key, color, dash = []) => {
      const pts = series.map((s, i) => [i, s[key]]).filter((p) => p[1])
      if (!pts.length) return
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash(dash); ctx.beginPath()
      pts.forEach(([i, v], k) => (k ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))))
      ctx.stroke(); ctx.setLineDash([])
      pts.forEach(([i, v]) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x(i), y(v), 3, 0, 7); ctx.fill() })
    }
    line('resistance', '#ff2d55')
    line('support', '#00e676')
    line('spot', 'rgba(255,255,255,.5)', [4, 4])

    // x labels
    ctx.fillStyle = '#8b93a7'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'
    series.forEach((s, i) => ctx.fillText(s.date.slice(5), x(i), h - 8))
    ctx.textAlign = 'left'
  }, [series])

  // trend hint
  let hint = null
  if (series.length >= 2) {
    const first = series[0], last = series[series.length - 1]
    const sUp = last.support > first.support, rUp = last.resistance > first.resistance
    if (sUp && rUp) hint = { t: 'good', text: '📈 Support और Resistance दोनों ऊपर खिसक रहे — bullish structure।' }
    else if (!sUp && !rUp) hint = { t: 'danger', text: '📉 दोनों levels नीचे खिसक रहे — bearish structure।' }
    else hint = { t: 'info', text: '↔️ Levels mixed/range — साफ़ दिशा नहीं।' }
  }

  return (
    <div className="card">
      <h2>🪜 Level Migration <span className="cap">S/R का multi-day movement</span></h2>
      <canvas ref={ref} style={{ width: '100%', height: 260, display: 'block' }} />
      <div className="path-legend">
        <span><span className="dot" style={{ background: '#ff2d55' }} />Resistance</span>
        <span><span className="dot" style={{ background: '#00e676' }} />Support</span>
        <span><span className="dot" style={{ background: 'rgba(255,255,255,.5)' }} />~Spot</span>
      </div>
      {hint && <div className={`sig ${hint.t}`} style={{ marginTop: 10 }}><div className="hi">{hint.text}</div></div>}
      <p className="disclaimer" style={{ marginTop: 8 }}>जितने दिन की Option Chain file डालेंगे, migration उतना साफ़ दिखेगा।</p>
    </div>
  )
}
