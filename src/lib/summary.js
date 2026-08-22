import { computeNet } from './calc.js'

/** Plain-Hindi paragraph combining confluence + key numbers. */
export function makeSummary(conf, bundle) {
  const parts = []
  const oi = bundle?.sources?.participant_oi
  const net = oi ? (oi.net || computeNet(oi)) : null

  // headline
  const v = conf.verdict
  parts.push(`आज का कुल रुझान: ${v} (${conf.agreement}% sources सहमत, ${conf.sourcesUsed.length} reports से)।`)

  if (net) {
    const fii = net.FII.idxFut.net
    const cl = net.Client.idxFut.net
    if (fii < 0) parts.push(`FII index futures में शुद्ध शॉर्ट (${fii.toLocaleString('en-IN')}) — smart money सतर्क/मंदी में।`)
    else if (fii > 0) parts.push(`FII index futures में शुद्ध लॉन्ग (${fii.toLocaleString('en-IN')}) — smart money तेजी में।`)
    if (cl > 0 && net.Client.idxCall.net > 0 && net.Client.idxPut.net < 0)
      parts.push('Retail भारी तेजी में फँसा है (long calls/futures, short puts) — ऊपर resistance संभव।')
  }

  const fs = bundle?.sources?.fii_stats?.stats
  if (fs?.indexFut) {
    const n = fs.indexFut.netAmt
    parts.push(`FII stats: index futures में net ₹ ${n < 0 ? 'बिकवाली' : 'खरीदारी'} (${n.toLocaleString('en-IN')})।`)
  }

  if (conf.levels && (conf.levels.support || conf.levels.resistance)) {
    parts.push(`Levels: नीचे support ${conf.levels.support ?? '—'}, ऊपर resistance ${conf.levels.resistance ?? '—'}${conf.levels.pcr != null ? ` (PCR ${conf.levels.pcr})` : ''}।`)
  }

  parts.push('⚠️ यह जानकारी शिक्षा के लिए है, निवेश सलाह नहीं। अपना risk खुद तय करें।')
  return parts.join(' ')
}
