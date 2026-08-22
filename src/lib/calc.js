/**
 * Calculation engine — turns raw parsed longs/shorts into:
 *  - Net positions per participant per instrument (Long - Short)
 *  - "Positions Bought/Sold Today" (Net change vs previous day) = apple-to-apple
 *
 * Instruments (6, matching Amit Dhamija's table):
 *   Index Future, Index Call, Index Put, Stock Future, Stock Call, Stock Put
 */

export const PARTICIPANTS = ['Client', 'DII', 'FII', 'Pro']
export const PARTICIPANT_LABEL = {
  Client: 'Clients (Retail)',
  DII: 'DIIs',
  FII: 'FIIs',
  Pro: 'Pro',
}

export const INSTRUMENTS = [
  { key: 'idxFut',  label: 'Index Future', long: 'futIdxLong',    short: 'futIdxShort' },
  { key: 'idxCall', label: 'Index Call',   long: 'optIdxCallLong', short: 'optIdxCallShort' },
  { key: 'idxPut',  label: 'Index Put',    long: 'optIdxPutLong',  short: 'optIdxPutShort' },
  { key: 'stkFut',  label: 'Stock Future', long: 'futStkLong',    short: 'futStkShort' },
  { key: 'stkCall', label: 'Stock Call',   long: 'optStkCallLong', short: 'optStkCallShort' },
  { key: 'stkPut',  label: 'Stock Put',    long: 'optStkPutLong',  short: 'optStkPutShort' },
]

/** Compute net (long - short) matrix for a single day's parsed data. */
export function computeNet(day) {
  const out = {}
  for (const p of PARTICIPANTS) {
    out[p] = {}
    const rec = day.participants[p] || {}
    for (const inst of INSTRUMENTS) {
      const long = rec[inst.long] || 0
      const short = rec[inst.short] || 0
      out[p][inst.key] = { long, short, net: long - short }
    }
  }
  return out
}

/** Today's change = today's net - yesterday's net (per participant, per instrument). */
export function computeChange(todayNet, prevNet) {
  const out = {}
  for (const p of PARTICIPANTS) {
    out[p] = {}
    for (const inst of INSTRUMENTS) {
      const t = todayNet?.[p]?.[inst.key]?.net ?? 0
      const y = prevNet?.[p]?.[inst.key]?.net ?? 0
      out[p][inst.key] = prevNet ? t - y : null // null = no baseline yet
    }
  }
  return out
}

/** Build 3-day rolling trend for an instrument+participant across a history array
 *  (history is array of {date, net} newest-first). */
export function rolling3(history, participant, instKey) {
  const vals = history.slice(0, 3).map((h) => ({
    date: h.date,
    net: h.net?.[participant]?.[instKey]?.net ?? null,
  }))
  return vals // [T, T-1, T-2]
}

export function fmt(n) {
  if (n === null || n === undefined) return '—'
  const sign = n > 0 ? '+' : ''
  return sign + n.toLocaleString('en-IN')
}
