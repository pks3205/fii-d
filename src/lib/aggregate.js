/**
 * Multi-day aggregation — "अभी market में कुल क्या चल रहा है" over the last N days.
 *
 * Instead of a single day's snapshot, this combines several days of participant
 * OI to answer:
 *   - हर player की LATEST net position (सबसे नए दिन का carry-forward)
 *   - पिछले N दिनों में हर player ने कुल कितना जोड़ा/घटाया (cumulative change)
 *   - किसका trend consistent है (लगातार बढ़ा रहा है या घटा रहा है)
 *   - सबका मिलाजुला cumulative bias
 */

import { computeNet, INSTRUMENTS, PARTICIPANTS, PARTICIPANT_LABEL } from './calc.js'

/**
 * @param bundles  newest-first array of bundles
 * @param nDays    how many recent days to consider (default 5)
 * Returns null if <1 OI day, else a rich aggregate object.
 */
export function aggregate(bundles, nDays = 5) {
  // OI days, newest first
  const oiDays = bundles
    .filter((b) => b.sources?.participant_oi)
    .map((b) => ({ date: b.date, net: b.sources.participant_oi.net || computeNet(b.sources.participant_oi) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, nDays)

  if (oiDays.length === 0) return null

  const newest = oiDays[0]
  const oldest = oiDays[oiDays.length - 1]
  const days = oiDays.length

  // Per participant per instrument:
  //   latest = newest net; cumChange = newest - oldest (net add/reduce over window)
  //   consistency = fraction of day-steps moving the same direction
  const perParticipant = {}
  for (const p of PARTICIPANTS) {
    perParticipant[p] = {}
    for (const inst of INSTRUMENTS) {
      const seriesNewToOld = oiDays.map((d) => d.net?.[p]?.[inst.key]?.net ?? 0)
      const latest = seriesNewToOld[0]
      const first = seriesNewToOld[seriesNewToOld.length - 1]
      const cumChange = latest - first

      // day-to-day steps (old→new)
      const chrono = [...seriesNewToOld].reverse()
      let up = 0, down = 0
      for (let i = 1; i < chrono.length; i++) {
        const diff = chrono[i] - chrono[i - 1]
        if (diff > 0) up++; else if (diff < 0) down++
      }
      const steps = up + down
      const consistency = steps ? Math.round((Math.max(up, down) / steps) * 100) : 0
      const trendDir = up > down ? 'building' : down > up ? 'reducing' : 'flat'

      perParticipant[p][inst.key] = { latest, cumChange, consistency, trendDir }
    }
  }

  // Overall cumulative bias — weight the "smart money" index-future stance
  const votes = []
  const push = (src, dir, wt, why) => votes.push({ src, dir, wt, why })

  const fii = perParticipant.FII.idxFut
  const pro = perParticipant.Pro.idxFut
  const cl = perParticipant.Client.idxFut
  const clCall = perParticipant.Client.idxCall
  const clPut = perParticipant.Client.idxPut

  if (fii.latest) push('FII', Math.sign(fii.latest), 2,
    `FII कुल ${fii.latest < 0 ? 'शॉर्ट' : 'लॉन्ग'} ${Math.abs(fii.latest).toLocaleString('en-IN')} (${days} दिन में ${fii.cumChange >= 0 ? '+' : ''}${fii.cumChange.toLocaleString('en-IN')})`)
  if (pro.latest) push('Pro', Math.sign(pro.latest), 1.5,
    `Pro कुल ${pro.latest < 0 ? 'शॉर्ट' : 'लॉन्ग'} (${days} दिन में ${pro.cumChange >= 0 ? '+' : ''}${pro.cumChange.toLocaleString('en-IN')})`)
  // Retail contrarian
  if (cl.latest > 0 && clCall.latest > 0 && clPut.latest < 0)
    push('Retail (contrarian)', -1, 1.5, 'Retail लगातार तेजी में फँसा — ऊपर सीमित')
  if (cl.latest < 0 && clCall.latest < 0 && clPut.latest > 0)
    push('Retail (contrarian)', +1, 1.5, 'Retail लगातार मंदी में — नीचे सीमित')

  const bull = votes.filter((v) => v.dir > 0).reduce((a, v) => a + v.wt, 0)
  const bear = votes.filter((v) => v.dir < 0).reduce((a, v) => a + v.wt, 0)
  const scoreNet = +(bull - bear).toFixed(2)
  const total = bull + bear
  const agreement = total ? Math.round((Math.max(bull, bear) / total) * 100) : 0

  let verdict, key
  if (scoreNet >= 3) { verdict = 'Strong Bullish'; key = 'bull' }
  else if (scoreNet <= -3) { verdict = 'Strong Bearish'; key = 'bear' }
  else if (scoreNet > 0.5) { verdict = 'Bullish'; key = 'bull' }
  else if (scoreNet < -0.5) { verdict = 'Bearish'; key = 'bear' }
  else if (bull && bear) { verdict = 'Mixed / Volatile'; key = 'vol' }
  else { verdict = 'Neutral'; key = 'neutral' }

  return {
    days, from: oldest.date, to: newest.date,
    perParticipant, votes, scoreNet, agreement, verdict, key,
  }
}

/** Human summary paragraph of the aggregate. */
export function aggregateSummary(agg) {
  if (!agg) return ''
  const parts = []
  parts.push(`पिछले ${agg.days} दिन (${agg.from} → ${agg.to}) का कुल निचोड़: ${agg.verdict} (${agg.agreement}% भरोसा)।`)
  for (const v of agg.votes) parts.push(v.why + '।')
  parts.push('⚠️ यह multi-day cumulative view है — शिक्षा हेतु, निवेश सलाह नहीं।')
  return parts.join(' ')
}

export { PARTICIPANTS, PARTICIPANT_LABEL, INSTRUMENTS }
