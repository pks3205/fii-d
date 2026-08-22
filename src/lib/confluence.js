/**
 * Confluence engine — merges ALL uploaded NSE sources for a day into a single,
 * clear verdict, and reports HOW MANY sources agree (the strength of the signal).
 *
 * Inputs (any subset may be present):
 *   oi        : participant_oi parsed  (net matrix via computeNet)
 *   oiChange  : today's net change matrix
 *   vol       : participant_vol parsed
 *   fiiStats  : fii_stats parsed
 *   optionChain: option_chain parsed
 *
 * HONESTY: This is a probability/edge tool, not a guarantee. Institutional shorts
 * may be hedges; retail is not always wrong. Output is context, not a trigger.
 */

import { computeNet } from './calc.js'

const net = (m, p, k) => m?.[p]?.[k]?.net ?? 0

export function buildConfluence({ oi, oiChange, vol, fiiStats, optionChain }) {
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

  const vixFlag = null

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
    sourcesUsed: countSources({ oi, vol, fiiStats, optionChain }),
  }
}

function countSources(obj) {
  return Object.entries(obj).filter(([, v]) => v).map(([k]) => k)
}

/** Next-session scenario probabilities (illustrative, honesty-labelled). */
export function scenarioProbs(conf) {
  const s = conf.scoreNet
  let gapDown = 33, flat = 34, gapUp = 33
  if (s <= -2) { gapDown = 55; flat = 30; gapUp = 15 }
  else if (s < 0) { gapDown = 45; flat = 35; gapUp = 20 }
  else if (s >= 2) { gapUp = 55; flat = 30; gapDown = 15 }
  else if (s > 0) { gapUp = 45; flat = 35; gapDown = 20 }
  const sum = gapDown + flat + gapUp
  return { gapDown: Math.round(gapDown / sum * 100), flat: Math.round(flat / sum * 100), gapUp: Math.round(gapUp / sum * 100) }
}
