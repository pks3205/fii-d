import React, { useRef, useEffect } from 'react'

/**
 * Illustrative "path painter" — draws three scenario lines (Gap-Down+Reclaim / Nike,
 * Flat, Gap-Up) based on the decoded bias. This is a VISUAL ILLUSTRATION, not a
 * price forecast. Clearly labelled as such.
 */
export default function PathCanvas({ bias }) {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    const w = cv.clientWidth, h = 220
    cv.width = w * dpr; cv.height = h * dpr
    const ctx = cv.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.05)'
    ctx.lineWidth = 1
    for (let i = 1; i < 5; i++) {
      const y = (h / 5) * i
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    // baseline (open)
    const base = h * 0.5
    ctx.strokeStyle = 'rgba(255,255,255,.25)'
    ctx.setLineDash([5, 5])
    ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w, base); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,255,255,.45)'
    ctx.font = '11px sans-serif'
    ctx.fillText("Yesterday's Close", 6, base - 6)

    const key = bias?.key || 'neutral'

    const draw = (pts, color, width = 2.5) => {
      ctx.strokeStyle = color; ctx.lineWidth = width
      ctx.beginPath()
      pts.forEach((p, i) => {
        const x = (w) * p[0]
        const y = base - p[1] * (h * 0.32)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // scenarios in normalized units (-1..1 around base)
    if (key === 'bear') {
      draw([[0, 0], [0.15, -0.5], [0.5, -0.7], [1, -0.95]], '#ff2d55', 3)
      label(ctx, w, base, h, 'Bearish: sell-on-rise, lower levels likely', '#ff2d55')
    } else if (key === 'bull') {
      draw([[0, 0], [0.15, 0.4], [0.5, 0.7], [1, 0.95]], '#00e676', 3)
      label(ctx, w, base, h, 'Bullish: buy-on-dip, higher levels likely', '#00e676')
    } else if (key === 'vol') {
      // Nike curve: gap down, hunt SL, sharp reclaim
      draw([[0, 0], [0.08, -0.55], [0.22, -0.75], [0.4, -0.3], [0.7, 0.4], [1, 0.85]], '#ffb020', 3)
      label(ctx, w, base, h, 'Nike-Curve: gap-down → SL hunt → sharp reclaim', '#ffb020')
    } else {
      draw([[0, 0], [0.3, 0.15], [0.6, -0.15], [1, 0.05]], '#5b7cff', 3)
      label(ctx, w, base, h, 'Range-bound / neutral drift', '#5b7cff')
    }
  }, [bias])

  return (
    <div className="card">
      <h2>🎯 Scenario Path <span className="cap">(illustration — forecast नहीं)</span></h2>
      <canvas ref={ref} style={{ width: '100%', height: 220, display: 'block' }} />
      <p className="disclaimer" style={{ marginTop: 8 }}>
        ⚠️ यह केवल एक <b>चित्रण (illustration)</b> है जो decoded bias के आधार पर एक संभावित रास्ता दिखाता है। यह असली price prediction नहीं है — बाज़ार कुछ भी कर सकता है।
      </p>
    </div>
  )
}

function label(ctx, w, base, h, text, color) {
  ctx.fillStyle = color
  ctx.font = 'bold 12px sans-serif'
  ctx.fillText(text, 6, h - 10)
  // Today / Tomorrow markers
  ctx.fillStyle = 'rgba(255,255,255,.4)'
  ctx.font = '10px sans-serif'
  ctx.fillText('Open', 6, 14)
  ctx.textAlign = 'right'
  ctx.fillText('Next session →', w - 6, 14)
  ctx.textAlign = 'left'
}
