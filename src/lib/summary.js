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

  const cash = bundle?.sources?.fii_dii_cash?.cash
  if (cash) {
    parts.push(`Cash में FII ने ₹${cash.FII.net.toLocaleString('en-IN')} Cr ${cash.FII.net < 0 ? 'बेचा' : 'खरीदा'}, DII ने ₹${cash.DII.net.toLocaleString('en-IN')} Cr ${cash.DII.net < 0 ? 'बेचा' : 'खरीदा'}।`)
  }

  if (conf.levels && (conf.levels.support || conf.levels.resistance)) {
    parts.push(`Levels: नीचे support ${conf.levels.support ?? '—'}, ऊपर resistance ${conf.levels.resistance ?? '—'}${conf.levels.pcr != null ? ` (PCR ${conf.levels.pcr})` : ''}।`)
  }

  if (conf.vixFlag) parts.push(conf.vixFlag.text)

  parts.push('⚠️ यह जानकारी शिक्षा के लिए है, निवेश सलाह नहीं। अपना risk खुद तय करें।')
  return parts.join(' ')
}
