/**
 * Retailer (Client) vs FII head-to-head + total Buy/Sell pressure.
 * Answers: "data किधर भारी है?" — कौन long, कौन short, और कुल पलड़ा किधर।
 */
import { computeNet, INSTRUMENTS } from './calc.js'

/**
 * @param oi    participant_oi parsed (has .participants raw long/short)
 * @param cash  fii_dii_cash parsed (optional) — for FII/DII cash ₹
 * Returns a rich comparison object.
 */
export function versus(oi, cash) {
  if (!oi?.participants) return null
  const net = oi.net || computeNet(oi)
  const P = oi.participants

  // Per-instrument head-to-head (Client vs FII), net = long - short
  const rows = INSTRUMENTS.map((inst) => {
    const cl = net.Client[inst.key].net
    const fii = net.FII[inst.key].net
    // opposed = one long, other short (the interesting case)
    const opposed = Math.sign(cl) !== 0 && Math.sign(fii) !== 0 && Math.sign(cl) !== Math.sign(fii)
    return { key: inst.key, label: inst.abbr, full: inst.label, client: cl, fii, opposed }
  })

  // Focus rows the user asked about
  const idxFut = rows.find((r) => r.key === 'idxFut')

  // Total Buy(Long) vs Sell(Short) contracts — split Index vs Stock, all participants
  const sumL = (fields) => fields.reduce((a, f) => a + totalField(P, f), 0)
  const idxLong = sumL(['futIdxLong', 'optIdxCallLong', 'optIdxPutLong'])
  const idxShort = sumL(['futIdxShort', 'optIdxCallShort', 'optIdxPutShort'])
  const stkLong = sumL(['futStkLong', 'optStkCallLong', 'optStkPutLong'])
  const stkShort = sumL(['futStkShort', 'optStkCallShort', 'optStkPutShort'])
  const totLong = idxLong + stkLong
  const totShort = idxShort + stkShort

  // Cash ₹ head-to-head
  const cashData = cash?.cash ? {
    fii: cash.cash.FII?.net ?? null,
    dii: cash.cash.DII?.net ?? null,
  } : null

  // Verdict: where is the weight?
  const clFut = idxFut?.client ?? 0
  const fiiFut = idxFut?.fii ?? 0
  let verdict, key
  if (clFut > 0 && fiiFut < 0) { verdict = 'Retail LONG, FII SHORT — smart money मंदी में, retail फँसा (bearish tilt)'; key = 'bear' }
  else if (clFut < 0 && fiiFut > 0) { verdict = 'Retail SHORT, FII LONG — smart money तेजी में (bullish tilt)'; key = 'bull' }
  else if (clFut > 0 && fiiFut > 0) { verdict = 'दोनों LONG — broad bullish (पर retail crowd से सावधान)'; key = 'bull' }
  else if (clFut < 0 && fiiFut < 0) { verdict = 'दोनों SHORT — broad bearish'; key = 'bear' }
  else { verdict = 'साफ़ झुकाव नहीं'; key = 'neutral' }

  return {
    rows, idxFut, cashData,
    buySell: {
      idx: { long: idxLong, short: idxShort, tilt: tilt(idxLong, idxShort) },
      stk: { long: stkLong, short: stkShort, tilt: tilt(stkLong, stkShort) },
      total: { long: totLong, short: totShort, tilt: tilt(totLong, totShort) },
    },
    verdict, key,
  }
}

function totalField(P, field) {
  return ['Client', 'DII', 'FII', 'Pro'].reduce((a, p) => a + (P[p]?.[field] || 0), 0)
}

// tilt: +ve = buy(long) heavy, -ve = sell(short) heavy; returns {pct, side}
function tilt(long, short) {
  const t = long + short
  if (!t) return { pct: 50, side: 'flat', diff: 0 }
  const longPct = Math.round((long / t) * 100)
  return { pct: longPct, side: longPct > 53 ? 'buy' : longPct < 47 ? 'sell' : 'flat', diff: long - short }
}
