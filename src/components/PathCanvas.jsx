import React, { useRef, useEffect } from 'react'

/**
 * Scenario path painter WITH real support/resistance levels overlaid.
 * If `levels` (from Option OI) is provided, the chart uses actual strike prices:
 * spot proxy is the baseline, supports/resistances are drawn as horizontal lines,
 * and the scenario path moves between them. Illustration only — not a forecast.
 */
export default function PathCanvas({ bias, levels }) {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    const w = cv.clientWidth, h = 300
    cv.width = w * dpr; cv.height = h * dpr
    const ctx = cv.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const key = bias?.key || 'neutral'
    const padR = 62 // room for price labels on right

    // Build price scale from levels if available
    const res = (levels?.resistances || []).map((l) => l.strike).filter(Boolean)
    const sup = (levels?.supports || []).map((l) => l.strike).filter(Boolean)
    const spot = levels?.spotProxy || (res[0] && sup[0] ? (res[0] + sup[0]) / 2 : null)
    const haveLevels = res.length && sup.length && spot

    let priceMax, priceMin
    if (haveLevels) {
      priceMax = Math.max(...res, spot) * 1.002
      priceMin = Math.min(...sup, spot) * 0.998
    }

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1
    for (let i = 1; i < 6; i++) { const y = (h / 6) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w - padR, y); ctx.stroke() }

    const yOf = (price) => {
      if (!haveLevels) return h * 0.5
      return h - 14 - (h - 34) * ((price - priceMin) / (priceMax - priceMin))
    }
    const base = haveLevels ? yOf(spot) : h * 0.5

    // Draw support/resistance lines
    if (haveLevels) {
      const drawLevel = (price, color, tag, strong) => {
        const y = yOf(price)
        ctx.strokeStyle = color; ctx.lineWidth = strong ? 2 : 1
        ctx.setLineDash(strong ? [] : [4, 4])
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w - padR, y); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = color; ctx.font = `${strong ? 'bold ' : ''}10px sans-serif`; ctx.textAlign = 'left'
        ctx.fillText(`${tag} ${price.toLocaleString('en-IN')}`, w - padR + 4, y + 3)
      }
      res.forEach((p, i) => drawLevel(p, '#ff2d55', 'R', i === 0))
      sup.forEach((p, i) => drawLevel(p, '#00e676', 'S', i === 0))
      // spot baseline
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w - padR, base); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = 'bold 10px sans-serif'
      ctx.fillText(`Spot ~${Math.round(spot).toLocaleString('en-IN')}`, w - padR + 4, base - 4)
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([5, 5])
      ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w - padR, base); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '11px sans-serif'
      ctx.fillText("Yesterday's Close", 6, base - 6)
    }

    // Scenario path — normalized -1..1 mapped to level band (or fixed band)
    const bandUp = haveLevels ? (base - yOf(res[0])) : h * 0.32
    const bandDn = haveLevels ? (yOf(sup[0]) - base) : h * 0.32
    const drawPath = (pts, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath()
      pts.forEach((p, i) => {
        const x = (w - padR) * p[0]
        const y = base - (p[1] >= 0 ? p[1] * bandUp : p[1] * bandDn)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    let msg, color
    if (key === 'bear') { drawPath([[0, 0], [0.2, -0.45], [0.6, -0.75], [1, -1]], '#ff2d55'); msg = 'Bearish: support की ओर, sell-on-rise'; color = '#ff2d55' }
    else if (key === 'bull') { drawPath([[0, 0], [0.2, 0.45], [0.6, 0.75], [1, 1]], '#00e676'); msg = 'Bullish: resistance की ओर, buy-on-dip'; color = '#00e676' }
    else if (key === 'vol') { drawPath([[0, 0], [0.08, -0.6], [0.22, -0.9], [0.45, -0.3], [0.72, 0.4], [1, 0.85]], '#ffb020'); msg = 'Nike: gap-down → SL hunt → reclaim'; color = '#ffb020' }
    else { drawPath([[0, 0], [0.3, 0.2], [0.6, -0.2], [1, 0.05]], '#5b7cff'); msg = 'Range-bound / neutral'; color = '#5b7cff' }

    ctx.fillStyle = color; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(msg, 6, h - 6)
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '10px sans-serif'
    ctx.fillText('Open', 6, 12)
    ctx.textAlign = 'right'; ctx.fillText('Next session →', w - padR - 4, 12); ctx.textAlign = 'left'
  }, [bias, levels])

  const hasLevels = (levels?.resistances?.length && levels?.supports?.length)
  return (
    <div className="card">
      <h2>🎯 Scenario Path + Levels <span className="cap">(illustration — forecast नहीं)</span></h2>
      <canvas ref={ref} style={{ width: '100%', height: 300, display: 'block' }} />
      <p className="disclaimer" style={{ marginTop: 8 }}>
        {hasLevels
          ? '🔴 R = Resistance, 🟢 S = Support (Option OI से actual strikes)। लाइन scenario path है — असली prediction नहीं।'
          : '⚠️ Levels दिखाने के लिए Option Chain / Bhavcopy file upload करें। अभी यह सिर्फ़ bias-आधारित illustration है।'}
      </p>
    </div>
  )
}
