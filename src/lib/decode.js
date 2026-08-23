/**
 * Decoding engine — rule-based interpretation of the participant OI data.
 *
 * IMPORTANT (honesty): These are heuristic rules based on the "Participant Wise
 * Open Interest" reading method popularised by Amit Dhamija. They organise and
 * interpret the data — they are NOT guaranteed predictions. Markets can do anything.
 */

import { INSTRUMENTS } from './calc.js'

// thresholds (in contracts/lots) — tuned to be meaningful but adjustable
const T = {
  fut: 20000,   // futures net threshold to call "heavy"
  opt: 100000,  // option net threshold
}

function net(m, p, key) {
  return m?.[p]?.[key]?.net ?? 0
}
function chg(c, p, key) {
  return c?.[p]?.[key] ?? 0
}

/**
 * @param todayNet net matrix for today
 * @param change   today's net change matrix (or null baseline)
 * @param history  array newest-first of {date, net}
 * Returns { bias, score, signals:[{level, title, hi, en}] }
 */
export function decode(todayNet, change, history = []) {
  const signals = []
  let bull = 0
  let bear = 0

  const clientFut = net(todayNet, 'Client', 'idxFut')
  const clientCall = net(todayNet, 'Client', 'idxCall')
  const clientPut = net(todayNet, 'Client', 'idxPut')
  const fiiFut = net(todayNet, 'FII', 'idxFut')
  const fiiStkFut = net(todayNet, 'FII', 'stkFut')
  const proPut = net(todayNet, 'Pro', 'idxPut')
  const proCall = net(todayNet, 'Pro', 'idxCall')

  const proPutChg = chg(change, 'Pro', 'idxPut')
  const proCallChg = chg(change, 'Pro', 'idxCall')
  const fiiFutChg = chg(change, 'FII', 'idxFut')

  // ---- Rule 1: Client contrarian (retail trap) ----
  const retailBull = clientFut > 0 && clientCall > 0 && clientPut < 0
  if (retailBull && (clientCall > T.opt || clientFut > T.fut)) {
    bear += 2
    signals.push({
      level: 'danger',
      title: 'Upside Capped — Retail Trap',
      hi: 'रिटेलर्स भारी मात्रा में तेजी (bullish) की पोजीशन में हैं — लॉन्ग फ्यूचर, लॉन्ग कॉल, शॉर्ट पुट। 90%+ रिटेलर नुकसान करते हैं, यानी स्मार्ट मनी ने इनके उलट बिकवाली की है। ऊपरी स्तरों पर तेजी सीमित रह सकती है।',
      en: 'Retailers are heavily bullish (long futures, long calls, short puts). Since most retail loses, smart money has likely sold to them — upside may be capped / sell-on-rise.',
    })
  }

  const retailBear = clientFut < 0 && clientCall < 0 && clientPut > 0
  if (retailBear && (Math.abs(clientCall) > T.opt || Math.abs(clientFut) > T.fut)) {
    bull += 2
    signals.push({
      level: 'good',
      title: 'Downside Limited — Retail Bearish',
      hi: 'रिटेलर्स भारी मंदी (bearish) में हैं। स्मार्ट मनी अक्सर इनके उलट होती है — निचले स्तरों पर गिरावट सीमित रह सकती है (buy-on-dip झुकाव)।',
      en: 'Retailers are heavily bearish. Smart money is usually contrarian — downside may be limited / buy-on-dip bias.',
    })
  }

  // ---- Rule 2: Pro desk ultra-short-term (gap predictor) ----
  if ((proPut > T.opt || proPutChg > T.opt / 2) && proCall < 0) {
    bear += 2
    signals.push({
      level: 'warn',
      title: 'Possible Gap-Down / Short-Term Dip',
      hi: 'Pro डेस्क ने आज आक्रामक रूप से पुट खरीदे हैं और कॉल बेचे हैं। Pro का व्यू 1-2 दिन का होता है — कल शुरुआती कमजोरी या गैप-डाउन की आशंका।',
      en: 'Pro desks aggressively bought puts and sold calls today. Their view is 1–2 days — watch for early weakness / gap-down next session.',
    })
  }
  if ((proCall > T.opt || proCallChg > T.opt / 2) && proPut < 0) {
    bull += 2
    signals.push({
      level: 'good',
      title: 'Possible Gap-Up / Short-Term Strength',
      hi: 'Pro डेस्क ने आक्रामक रूप से कॉल खरीदे और पुट बेचे हैं। अल्ट्रा शॉर्ट-टर्म में मजबूती/गैप-अप की संभावना।',
      en: 'Pro desks aggressively bought calls and sold puts. Ultra-short-term strength / gap-up possible.',
    })
  }

  // ---- Rule 3: FII medium-term trend (3-day) ----
  const fiiTrend = fiiFutTrend(history)
  if (fiiFut < -T.fut || (fiiTrend === 'down' && fiiFut < 0)) {
    bear += 2
    signals.push({
      level: 'warn',
      title: 'FII Positional Trend: Bearish',
      hi: `FII इंडेक्स फ्यूचर में शुद्ध शॉर्ट (${fiiFut.toLocaleString('en-IN')}) हैं${fiiTrend === 'down' ? ' और 3 दिनों से शॉर्ट बढ़ा रहे हैं' : ''}। पोजीशनल रुझान मंदी का — तेजी पर बिकवाली (sell-on-rise)।`,
      en: `FII hold net short index futures (${fiiFut.toLocaleString('en-IN')})${fiiTrend === 'down' ? ' and have been building shorts over 3 days' : ''}. Positional trend bearish — sell-on-rise.`,
    })
  }
  if (fiiFut > T.fut || (fiiTrend === 'up' && fiiFut > 0)) {
    bull += 2
    signals.push({
      level: 'good',
      title: 'FII Positional Trend: Bullish',
      hi: `FII इंडेक्स फ्यूचर में शुद्ध लॉन्ग (${fiiFut.toLocaleString('en-IN')}) हैं${fiiTrend === 'up' ? ' और लॉन्ग बढ़ा रहे हैं' : ''}। पोजीशनल रुझान तेजी का — गिरावट पर खरीदारी (buy-on-dip)।`,
      en: `FII hold net long index futures (${fiiFut.toLocaleString('en-IN')})${fiiTrend === 'up' ? ' and are adding longs' : ''}. Positional trend bullish — buy-on-dip.`,
    })
  }

  // ---- Rule 4: Nike-curve / SL hunt (FII bearish positional + Pro short-term long) ----
  if (fiiFut < 0 && proCall > 0 && proPut < proCall) {
    signals.push({
      level: 'info',
      title: 'Nike-Curve Setup (Gap-Down & Reclaim)',
      hi: 'FII पोजीशनल रूप से सतर्क/मंदी में हैं लेकिन Pro ने शॉर्ट-टर्म में तेजी की पोजीशन ली है। संभव है मार्केट गैप-डाउन खुलकर रिटेल के स्टॉप-लॉस हंट करे, फिर तेज V-शेप (Nike) रिकवरी दिखाए। (केवल परिदृश्य — गारंटी नहीं)',
      en: 'FII cautious positionally but Pro is short-term long. Market may gap down to hunt retail stop-losses, then sharply reclaim (Nike-curve). Scenario only — not a guarantee.',
    })
  }

  // ---- Overall bias ----
  const scoreNet = bull - bear
  let bias
  if (scoreNet >= 3) bias = { key: 'bull', label: 'Bullish', hi: 'तेजी' }
  else if (scoreNet <= -3) bias = { key: 'bear', label: 'Bearish', hi: 'मंदी' }
  else if (bull > 0 && bear > 0) bias = { key: 'vol', label: 'Volatile / Mixed', hi: 'अस्थिर / मिश्रित' }
  else if (scoreNet > 0) bias = { key: 'bull', label: 'Mild Bullish', hi: 'हल्की तेजी' }
  else if (scoreNet < 0) bias = { key: 'bear', label: 'Mild Bearish', hi: 'हल्की मंदी' }
  else bias = { key: 'neutral', label: 'Neutral / Range', hi: 'सीमित दायरा' }

  if (signals.length === 0) {
    signals.push({
      level: 'info',
      title: 'No strong signal',
      hi: 'किसी भी प्लेयर की पोजीशन में तीव्र झुकाव नहीं दिखा। बाज़ार सीमित दायरे (range-bound) में रह सकता है।',
      en: 'No strong directional lean from any participant. Market may stay range-bound.',
    })
  }

  return { bias, score: scoreNet, bull, bear, signals }
}

function fiiFutTrend(history) {
  const vals = history.slice(0, 3).map((h) => h.net?.FII?.idxFut?.net).filter((v) => v != null)
  if (vals.length < 2) return 'flat'
  // vals[0]=today, vals[1]=yesterday...
  if (vals[0] < vals[vals.length - 1]) return 'down'
  if (vals[0] > vals[vals.length - 1]) return 'up'
  return 'flat'
}
