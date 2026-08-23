/**
 * Advanced analytics computed from a bundle (+ history for trends).
 * All heuristics; context not triggers.
 */
import { computeNet } from './calc.js'

/** FII Long-Short Ratio from participant OI (index futures). */
export function fiiLongShortRatio(oi) {
  if (!oi) return null
  const p = oi.participants?.FII
  if (!p) return null
  const long = p.futIdxLong || 0
  const short = p.futIdxShort || 0
  if (!long && !short) return null
  const ratio = short ? +(long / short).toFixed(2) : null
  const longPct = (long + short) ? Math.round((long / (long + short)) * 100) : null
  let read, key
  if (longPct == null) { read = '—'; key = 'neutral' }
  else if (longPct >= 60) { read = 'Strongly Long (Bullish)'; key = 'bull' }
  else if (longPct >= 45) { read = 'Neutral'; key = 'neutral' }
  else if (longPct >= 30) { read = 'Bearish lean'; key = 'bear' }
  else if (longPct >= 15) { read = 'Heavily Short (Bearish)'; key = 'bear' }
  else { read = 'Extreme Short — reversal/bounce संभव'; key = 'contrarian' }
  return { ratio, longPct, long, short, read, key }
}

/** Max Pain from option chain calls/puts OI maps. Needs raw strike OI. */
export function maxPain(optionChain) {
  if (!optionChain?.callOI || !optionChain?.putOI) return null
  const calls = optionChain.callOI, puts = optionChain.putOI
  const strikes = [...new Set([...Object.keys(calls), ...Object.keys(puts)].map(Number))].sort((a, b) => a - b)
  if (strikes.length < 3) return null
  let best = null
  for (const X of strikes) {
    let loss = 0
    for (const k of strikes) {
      if (k < X) loss += (X - k) * (calls[k] || 0) // ITM calls
      if (k > X) loss += (k - X) * (puts[k] || 0)  // ITM puts
    }
    if (best === null || loss < best.loss) best = { strike: X, loss }
  }
  return best ? best.strike : null
}

/** Distance reading of spot vs max-pain. */
export function maxPainRead(spot, mp) {
  if (!spot || !mp) return null
  const pct = ((spot - mp) / mp) * 100
  let text, key
  if (pct > 2) { text = `Spot max-pain से ${pct.toFixed(1)}% ऊपर — strong bullish momentum`; key = 'bull' }
  else if (pct > 0.5) { text = `Spot थोड़ा ऊपर (${pct.toFixed(1)}%) — max-pain की ओर drift संभव`; key = 'neutral' }
  else if (pct >= -0.5) { text = `Spot max-pain पर pinned (±0.5%) — range-bound, sellers favoured`; key = 'neutral' }
  else if (pct >= -2) { text = `Spot थोड़ा नीचे (${pct.toFixed(1)}%) — ऊपर pull संभव`; key = 'neutral' }
  else { text = `Spot max-pain से ${Math.abs(pct).toFixed(1)}% नीचे — strong bearish momentum`; key = 'bear' }
  return { pct: +pct.toFixed(2), text, key }
}

/** Cash x Futures confirmation matrix. */
export function cashFuturesMatrix(cash, oi) {
  if (!cash?.cash?.FII) return null
  const cashNet = cash.cash.FII.net
  const net = oi ? (oi.net || computeNet(oi)) : null
  const futNet = net?.FII?.idxFut?.net ?? null
  if (futNet == null) return null
  const cashDir = Math.sign(cashNet), futDir = Math.sign(futNet)
  let verdict, key
  if (cashDir < 0 && futDir < 0) { verdict = 'Genuine BEARISH — Cash बेचा + Futures short (high conviction)'; key = 'bear' }
  else if (cashDir > 0 && futDir > 0) { verdict = 'Genuine BULLISH — Cash खरीदा + Futures long (high conviction)'; key = 'bull' }
  else if (cashDir > 0 && futDir < 0) { verdict = 'HEDGING — Cash खरीदा पर Futures short → मंदी नहीं, बचाव'; key = 'neutral' }
  else if (cashDir < 0 && futDir > 0) { verdict = 'Mixed — Cash बेचा पर Futures long → सावधानी'; key = 'neutral' }
  else { verdict = 'Flat'; key = 'neutral' }
  return { cashNet, futNet, verdict, key }
}

/** Expected 1-day range from VIX (or ATM IV). */
export function expectedRange(spot, vix) {
  if (!spot || !vix) return null
  const move = spot * (vix / 100) * Math.sqrt(1 / 365)
  return { move: Math.round(move), low: Math.round(spot - move), high: Math.round(spot + move), vix }
}

/** Change-in-OI buildup classification (needs price + OI change). */
export function buildupState(priceChg, oiChg) {
  if (priceChg == null || oiChg == null) return null
  if (priceChg > 0 && oiChg > 0) return { state: 'Long Buildup', key: 'bull', hi: 'भाव↑ OI↑ — नई खरीदारी (bullish)' }
  if (priceChg < 0 && oiChg > 0) return { state: 'Short Buildup', key: 'bear', hi: 'भाव↓ OI↑ — नई बिकवाली (bearish)' }
  if (priceChg > 0 && oiChg < 0) return { state: 'Short Covering', key: 'bull', hi: 'भाव↑ OI↓ — शॉर्ट कवरिंग (weak bullish)' }
  if (priceChg < 0 && oiChg < 0) return { state: 'Long Unwinding', key: 'bear', hi: 'भाव↓ OI↓ — मुनाफ़ावसूली (weak bearish)' }
  return null
}
