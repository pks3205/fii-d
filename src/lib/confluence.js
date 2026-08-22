/**
 * Confluence engine — merges ALL uploaded NSE sources for a day into a single,
 * clear verdict, and reports HOW MANY sources agree (the strength of the signal).
 *
 * Inputs (any subset may be present):
 *   oi        : participant_oi parsed  (net matrix via computeNet)
 *   oiChange  : today's net change matrix
 *   vol       : participant_vol parsed
 *   fiiStats  : fii_stats parsed
 *   cash      : fii_dii_cash parsed
 *   optionChain: option_chain parsed
 *   vix       : vix parsed
 *
 * HONESTY: This is a probability/edge tool, not a guarantee. Institutional shorts
 * may be hedges; retail is not always wrong. Output is context, not a trigger.
 */

import { computeNet } from './calc.js'

const net = (m, p, k) => m?.[p]?.[k]?.net ?? 0

export function buildConfluence({ oi, oiChange, vol, fiiStats, cash, optionChain, vix }) {
  const votes = [] // {source, dir:+1/-1/0, weight, why}

  const todayNet = oi ? (oi.net || computeNet(oi)) : null

  // --- FII from OI (index futures) ---
  if (todayNet) {
    const f = net(todayNet, 'FII', 'idxFut')
    if (Math.abs(f) > 15000) votes.push({ source: 'FII OI (Index Fut)', dir: Math.sign(f), weight: 2,
      why: `FII index futures net ${f > 0 ? 'long' : 'short'} (${f.toLocaleString('en-IN')})` })

    const c = net(todayNet, 'Client', 'idxFut')
    const cc = net(todayNet, 'Client', 'idxCall')
    const cp = net(todayNet, 'Client', 'idxPut')
    if (c > 0 && cc > 0 && cp < 0) votes.push({ source: 'Retail lean (contrarian)', dir: -1, weight: 1.5,
      why: 'Retail heavily bullish → contrarian bearish lean' })
    if (c < 0 && cc < 0 && cp > 0) votes.push({ source: 'Retail lean (contrarian)', dir: +1, weight: 1.5,
      why: 'Retail heavily bearish → contrarian bullish lean' })

    const pPut = net(todayNet, 'Pro', 'idxPut')
    const pCall = net(todayNet, 'Pro', 'idxCall')
    if (pPut > 80000 && pCall < pPut) votes.push({ source: 'Pro options', dir: -1, weight: 1.5, why: 'Pro net long puts (short-term bearish)' })
    if (pCall > 80000 && pPut < pCall) votes.push({ source: 'Pro options', dir: +1, weight: 1.5, why: 'Pro net long calls (short-term bullish)' })
  }

  // --- FII rupee flow from stats ---
  if (fiiStats?.stats) {
    const idxFut = fiiStats.stats.indexFut?.netAmt ?? 0
    if (Math.abs(idxFut) > 1) votes.push({ source: 'FII ₹ (Index Fut Stats)', dir: Math.sign(idxFut), weight: 1.5,
      why: `FII net ₹ ${idxFut > 0 ? 'buy' : 'sell'} in index futures` })
  }

  // --- FII/DII cash flow ---
  if (cash?.cash) {
    const f = cash.cash.FII?.net ?? 0
    const d = cash.cash.DII?.net ?? 0
    if (Math.abs(f) > 1) votes.push({ source: 'FII Cash', dir: Math.sign(f), weight: 1.5,
      why: `FII cash net ₹${f.toLocaleString('en-IN')} Cr` })
    if (Math.abs(d) > 1) votes.push({ source: 'DII Cash', dir: Math.sign(d), weight: 0.75,
      why: `DII cash net ₹${d.toLocaleString('en-IN')} Cr` })
  }

  // --- Conviction boost from volumes ---
  let convictionNote = null
  if (vol?.volumes?.FII) {
    convictionNote = 'Volume data मौजूद — high volume वाले moves ज़्यादा भरोसेमंद।'
  }

  // --- Option chain levels (context, small directional weight via PCR) ---
  let levels = null
  if (optionChain) {
    levels = { support: optionChain.support, resistance: optionChain.resistance, pcr: optionChain.pcr }
    if (optionChain.pcr != null) {
      if (optionChain.pcr > 1.3) votes.push({ source: 'PCR', dir: +1, weight: 0.75, why: `PCR ${optionChain.pcr} (>1.3, puts writers = bullish support)` })
      else if (optionChain.pcr < 0.7) votes.push({ source: 'PCR', dir: -1, weight: 0.75, why: `PCR ${optionChain.pcr} (<0.7, call writers = bearish)` })
    }
  }

  // --- VIX (risk / gap flag, not directional) ---
  let vixFlag = null
  if (vix?.vix != null) {
    if (vix.vix >= 18) vixFlag = { level: 'high', text: `VIX ${vix.vix} — ऊँचा। बड़ी चाल / gap का जोखिम।` }
    else if (vix.vix <= 12) vixFlag = { level: 'low', text: `VIX ${vix.vix} — शांत। सीमित चाल की संभावना।` }
    else vixFlag = { level: 'mid', text: `VIX ${vix.vix} — सामान्य।` }
  }

  // --- Tally ---
  const bullWeight = votes.filter((v) => v.dir > 0).reduce((a, v) => a + v.weight, 0)
  const bearWeight = votes.filter((v) => v.dir < 0).reduce((a, v) => a + v.weight, 0)
  const scoreNet = bullWeight - bearWeight
  const total = bullWeight + bearWeight
  const bullVotes = votes.filter((v) => v.dir > 0).length
  const bearVotes = votes.filter((v) => v.dir < 0).length
  const agreement = total > 0 ? Math.round((Math.max(bullWeight, bearWeight) / total) * 100) : 0

  let verdict, key
  if (scoreNet >= 3 && agreement >= 65) { verdict = 'Strong Bullish'; key = 'bull' }
  else if (scoreNet <= -3 && agreement >= 65) { verdict = 'Strong Bearish'; key = 'bear' }
  else if (scoreNet > 0.5) { verdict = 'Bullish lean'; key = 'bull' }
  else if (scoreNet < -0.5) { verdict = 'Bearish lean'; key = 'bear' }
  else if (bullVotes && bearVotes) { verdict = 'Mixed / Volatile'; key = 'vol' }
  else { verdict = 'Neutral / Range'; key = 'neutral' }

  return {
    verdict, key, scoreNet: +scoreNet.toFixed(2), agreement,
    bullVotes, bearVotes, votes, levels, vixFlag, convictionNote,
    sourcesUsed: countSources({ oi, vol, fiiStats, cash, optionChain, vix }),
  }
}

function countSources(obj) {
  return Object.entries(obj).filter(([, v]) => v).map(([k]) => k)
}

/** Next-session scenario probabilities (illustrative, honesty-labelled). */
export function scenarioProbs(conf) {
  const s = conf.scoreNet
  const highVix = conf.vixFlag?.level === 'high'
  let gapDown = 33, flat = 34, gapUp = 33
  if (s <= -2) { gapDown = 55; flat = 30; gapUp = 15 }
  else if (s < 0) { gapDown = 45; flat = 35; gapUp = 20 }
  else if (s >= 2) { gapUp = 55; flat = 30; gapDown = 15 }
  else if (s > 0) { gapUp = 45; flat = 35; gapDown = 20 }
  if (highVix) { // volatility widens the tails
    flat = Math.max(15, flat - 15)
    gapDown += 8; gapUp += 7
  }
  const sum = gapDown + flat + gapUp
  return { gapDown: Math.round(gapDown / sum * 100), flat: Math.round(flat / sum * 100), gapUp: Math.round(gapUp / sum * 100) }
}
