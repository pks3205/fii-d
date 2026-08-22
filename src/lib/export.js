import { computeNet, computeChange, INSTRUMENTS, PARTICIPANTS, PARTICIPANT_LABEL } from './calc.js'

/** Build a CSV string of the full analysis for a bundle. */
export function bundleToCSV(bundle, prevBundle, conf) {
  const oi = bundle?.sources?.participant_oi
  if (!oi) return 'No Participant OI data'
  const net = oi.net || computeNet(oi)
  const prevNet = prevBundle?.sources?.participant_oi
    ? (prevBundle.sources.participant_oi.net || computeNet(prevBundle.sources.participant_oi))
    : null
  const change = computeChange(net, prevNet)

  const lines = []
  lines.push(`Operator OI Tracker Export,Date:,${bundle.date}`)
  lines.push('')
  lines.push(`Verdict,${conf?.verdict || ''},Agreement,${conf?.agreement || ''}%`)
  lines.push('')

  // Net positions
  lines.push('NET POSITIONS (Long - Short)')
  lines.push(['Participant', ...INSTRUMENTS.map((i) => i.label)].join(','))
  for (const p of PARTICIPANTS) {
    lines.push([PARTICIPANT_LABEL[p], ...INSTRUMENTS.map((i) => net[p][i.key].net)].join(','))
  }
  lines.push('')

  // Today's change
  if (change) {
    lines.push("TODAY'S NET CHANGE (Bought/Sold)")
    lines.push(['Participant', ...INSTRUMENTS.map((i) => i.label)].join(','))
    for (const p of PARTICIPANTS) {
      lines.push([PARTICIPANT_LABEL[p], ...INSTRUMENTS.map((i) => change[p][i.key] ?? '')].join(','))
    }
    lines.push('')
  }

  // Levels
  if (conf?.levels) {
    lines.push('LEVELS')
    lines.push(`Support,${conf.levels.support ?? ''},Resistance,${conf.levels.resistance ?? ''},PCR,${conf.levels.pcr ?? ''}`)
    if (conf.levels.supports?.length) lines.push('Supports,' + conf.levels.supports.map((s) => s.strike).join(','))
    if (conf.levels.resistances?.length) lines.push('Resistances,' + conf.levels.resistances.map((s) => s.strike).join(','))
    lines.push('')
  }

  // Signals
  if (conf?.votes?.length) {
    lines.push('SIGNALS')
    conf.votes.forEach((v) => lines.push(`${v.dir > 0 ? 'Bullish' : v.dir < 0 ? 'Bearish' : 'Neutral'},${v.source},"${v.why}"`))
  }
  return lines.join('\n')
}

export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Open a print-friendly window → user can "Save as PDF" or share. */
export function exportPDF(bundle, conf, summaryText) {
  const win = window.open('', '_blank')
  if (!win) { alert('Popup blocked — कृपया popup allow करें।'); return }
  const rows = (conf?.votes || []).map((v) =>
    `<tr><td>${v.dir > 0 ? '🟢' : v.dir < 0 ? '🔴' : '⚪'}</td><td>${v.source}</td><td>${v.why}</td></tr>`).join('')
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OI Report ${bundle.date}</title>
    <style>
      body{font-family:sans-serif;padding:24px;color:#111;max-width:760px;margin:auto}
      h1{font-size:20px;margin:0 0 4px} .sub{color:#666;font-size:13px}
      .verdict{display:inline-block;padding:6px 14px;border-radius:8px;font-weight:800;margin:12px 0;
        background:${conf?.key === 'bull' ? '#d6f5e3' : conf?.key === 'bear' ? '#fdd9e1' : '#eee'};
        color:${conf?.key === 'bull' ? '#0a7a44' : conf?.key === 'bear' ? '#b3123c' : '#333'}}
      table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
      td,th{border:1px solid #ddd;padding:6px 8px;text-align:left}
      .lvl{display:flex;gap:16px;font-size:14px;margin:8px 0}
      .foot{color:#888;font-size:11px;margin-top:20px;border-top:1px solid #eee;padding-top:10px}
    </style></head><body>
    <h1>📊 Operator OI Tracker</h1>
    <div class="sub">Date: ${bundle.date} · Sources: ${conf?.sourcesUsed?.length || 0}</div>
    <div class="verdict">${conf?.verdict || ''} · ${conf?.agreement || 0}% agreement</div>
    <p style="font-size:14px;line-height:1.6">${summaryText || ''}</p>
    <div class="lvl"><b>🟢 Support:</b> ${conf?.levels?.support ?? '—'} &nbsp; <b>🔴 Resistance:</b> ${conf?.levels?.resistance ?? '—'} &nbsp; <b>PCR:</b> ${conf?.levels?.pcr ?? '—'}</div>
    <h3>Signals</h3>
    <table><tr><th></th><th>Source</th><th>Why</th></tr>${rows}</table>
    <div class="foot">⚠️ Educational only — not investment advice. 90%+ F&O traders lose money (SEBI).</div>
    <script>setTimeout(()=>window.print(),400)</script>
    </body></html>`)
  win.document.close()
}
