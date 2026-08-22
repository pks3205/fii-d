import { computeNet, computeChange, INSTRUMENTS, PARTICIPANTS, PARTICIPANT_LABEL } from './calc.js'
import { jsPDF } from 'jspdf'
import { Share } from '@capacitor/share'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

/** Build a full CSV string of the analysis for a bundle. */
export function bundleToCSV(bundle, prevBundle, conf) {
  const oi = bundle?.sources?.participant_oi
  const lines = []
  lines.push(`Operator OI Tracker,Date:,${bundle.date}`)
  lines.push(`Verdict,${conf?.verdict || ''},Agreement,${conf?.agreement || ''}%`)
  if (conf?.lsr) lines.push(`FII Long-Short,${conf.lsr.longPct}% long,ratio,${conf.lsr.ratio ?? ''}`)
  if (conf?.maxPain) lines.push(`Max Pain,${conf.maxPain}`)
  if (conf?.range) lines.push(`Expected Range,${conf.range.low},to,${conf.range.high}`)
  lines.push('')

  if (oi) {
    const net = oi.net || computeNet(oi)
    const prevNet = prevBundle?.sources?.participant_oi ? (prevBundle.sources.participant_oi.net || computeNet(prevBundle.sources.participant_oi)) : null
    const change = computeChange(net, prevNet)
    lines.push('NET POSITIONS (Long-Short)')
    lines.push(['Participant', ...INSTRUMENTS.map((i) => i.label)].join(','))
    for (const p of PARTICIPANTS) lines.push([PARTICIPANT_LABEL[p], ...INSTRUMENTS.map((i) => net[p][i.key].net)].join(','))
    lines.push('')
    if (change) {
      lines.push("TODAY'S CHANGE")
      lines.push(['Participant', ...INSTRUMENTS.map((i) => i.label)].join(','))
      for (const p of PARTICIPANTS) lines.push([PARTICIPANT_LABEL[p], ...INSTRUMENTS.map((i) => change[p][i.key] ?? '')].join(','))
      lines.push('')
    }
  }
  if (conf?.levels) {
    lines.push('LEVELS')
    lines.push(`Support,${conf.levels.support ?? ''},Resistance,${conf.levels.resistance ?? ''},PCR,${conf.levels.pcr ?? ''}`)
  }
  if (conf?.votes?.length) {
    lines.push(''); lines.push('SIGNALS')
    conf.votes.forEach((v) => lines.push(`${v.dir > 0 ? 'Bullish' : v.dir < 0 ? 'Bearish' : 'Neutral'},${v.source},"${v.why}"`))
  }
  return lines.join('\n')
}

/** Build a full detailed PDF (jsPDF) and return a Blob + base64. */
export function buildPDF(bundle, prevBundle, conf, summary) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 40
  const line = (txt, size = 10, color = [30, 30, 30], bold = false) => {
    doc.setFontSize(size); doc.setTextColor(...color); doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(String(txt), 40, y); y += size + 6
  }
  const hr = () => { doc.setDrawColor(220); doc.line(40, y, W - 40, y); y += 12 }

  doc.setFillColor(13, 15, 22); doc.rect(0, 0, W, 60, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('Operator OI Tracker', 40, 32)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${bundle.date}  |  Sources: ${conf?.sourcesUsed?.length || 0}`, 40, 48)
  y = 82

  const k = conf?.key
  const vc = k === 'bull' ? [10, 122, 68] : k === 'bear' ? [179, 18, 60] : [80, 80, 80]
  line(`Verdict: ${conf?.verdict || '-'}  (${conf?.agreement || 0}% agreement)`, 13, vc, true)
  if (summary) {
    doc.setFontSize(9.5); doc.setTextColor(70, 70, 70); doc.setFont('helvetica', 'normal')
    const wrapped = doc.splitTextToSize(summary, W - 80)
    doc.text(wrapped, 40, y); y += wrapped.length * 13 + 6
  }
  hr()

  // Key metrics
  line('Smart Money Metrics', 12, [40, 40, 40], true)
  if (conf?.lsr) line(`FII Long-Short: ${conf.lsr.longPct}% long (ratio ${conf.lsr.ratio ?? '-'}) - ${conf.lsr.read}`)
  if (conf?.matrix) line(`Cash x Futures: ${conf.matrix.verdict}`)
  if (conf?.maxPain) line(`Max Pain: ${conf.maxPain}${conf.maxPainRead ? '  (' + conf.maxPainRead.text + ')' : ''}`)
  if (conf?.range) line(`Expected Range: ${conf.range.low} - ${conf.range.high} (+/-${conf.range.move})`)
  if (conf?.levels) line(`Support: ${conf.levels.support ?? '-'}  Resistance: ${conf.levels.resistance ?? '-'}  PCR: ${conf.levels.pcr ?? '-'}`)
  hr()

  // Net positions table
  const oi = bundle?.sources?.participant_oi
  if (oi) {
    const net = oi.net || computeNet(oi)
    line('Net Positions (Long - Short)', 12, [40, 40, 40], true)
    drawTable(doc, y, ['Player', ...INSTRUMENTS.map((i) => shortLbl(i.label))],
      PARTICIPANTS.map((p) => [abbr(p), ...INSTRUMENTS.map((i) => compact(net[p][i.key].net))]))
    y = doc.lastTableY + 14
  }

  // Signals
  if (conf?.votes?.length) {
    if (y > 700) { doc.addPage(); y = 40 }
    line('Signals', 12, [40, 40, 40], true)
    conf.votes.forEach((v) => {
      const c = v.dir > 0 ? [10, 122, 68] : v.dir < 0 ? [179, 18, 60] : [90, 90, 90]
      line(`${v.dir > 0 ? '+' : v.dir < 0 ? '-' : '='} ${v.source}: ${v.why}`, 9, c)
      if (y > 780) { doc.addPage(); y = 40 }
    })
  }

  doc.setFontSize(8); doc.setTextColor(150, 150, 150)
  doc.text('Educational only. Not investment advice.', 40, doc.internal.pageSize.getHeight() - 20)

  const blob = doc.output('blob')
  const base64 = doc.output('datauristring').split(',')[1]
  return { blob, base64 }
}

function drawTable(doc, startY, headers, rows) {
  const W = doc.internal.pageSize.getWidth()
  const x0 = 40, cols = headers.length
  const cw = (W - 80) / cols
  let y = startY
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.setFillColor(60, 70, 110); doc.rect(x0, y - 9, W - 80, 14, 'F')
  headers.forEach((h, i) => doc.text(String(h), x0 + i * cw + 2, y))
  y += 12
  doc.setFont('helvetica', 'normal')
  rows.forEach((r, ri) => {
    if (ri % 2 === 0) { doc.setFillColor(244, 246, 250); doc.rect(x0, y - 9, W - 80, 13, 'F') }
    r.forEach((cell, i) => {
      const val = String(cell)
      doc.setTextColor(i === 0 ? 30 : val.startsWith('-') ? 179 : val === '0' ? 130 : 10, i === 0 ? 30 : val.startsWith('-') ? 18 : 100, i === 0 ? 30 : val.startsWith('-') ? 60 : 50)
      doc.text(val, x0 + i * cw + 2, y)
    })
    y += 13
  })
  doc.lastTableY = y
}

const shortLbl = (s) => s.replace('Index ', 'Idx ').replace('Stock ', 'Stk ')
const abbr = (p) => p === 'Client' ? 'Client' : p
const compact = (n) => {
  if (n === 0) return '0'
  const a = Math.abs(n)
  if (a >= 1e5) return (n / 1e5).toFixed(1) + 'L'
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return String(n)
}

/** Save + share a file (native share sheet on Android; download on web). */
async function saveAndShare(filename, dataBase64OrText, mime, isBase64) {
  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({
      path: filename,
      data: dataBase64OrText,
      directory: Directory.Cache,
      encoding: isBase64 ? undefined : Encoding.UTF8,
    })
    await Share.share({ title: 'Operator OI Tracker', text: `OI Report ${filename}`, url: res.uri })
  } else {
    // Web fallback: blob download
    let blob
    if (isBase64) {
      const bin = atob(dataBase64OrText); const arr = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
      blob = new Blob([arr], { type: mime })
    } else {
      blob = new Blob([dataBase64OrText], { type: mime })
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }
}

export async function shareCSV(bundle, prevBundle, conf) {
  const csv = bundleToCSV(bundle, prevBundle, conf)
  await saveAndShare(`OI_${bundle.date}.csv`, csv, 'text/csv', false)
}

export async function sharePDF(bundle, prevBundle, conf, summary) {
  const { blob, base64 } = buildPDF(bundle, prevBundle, conf, summary)
  if (Capacitor.isNativePlatform()) {
    await saveAndShare(`OI_${bundle.date}.pdf`, base64, 'application/pdf', true)
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `OI_${bundle.date}.pdf`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }
}
