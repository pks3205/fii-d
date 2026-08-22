import { extractDate } from './participantOI.js'

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '')
export function toNum(v) {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/[",\s₹]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
const findHeaderRow = (rows, ...keys) => {
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const j = rows[i].map(norm).join('|')
    if (keys.every((k) => j.includes(norm(k)))) return i
  }
  return -1
}
const colIdx = (header, ...groups) =>
  header.findIndex((h) => { const x = norm(h); return groups.every((alts) => alts.some((a) => x.includes(norm(a)))) })

/* ---------------- Participant wise Trading Volumes ---------------- */
export function parseParticipantVol(rows, fileName = '') {
  const hr = findHeaderRow(rows, 'future', 'index')
  if (hr === -1) throw new Error('Participant Volumes: header नहीं मिला।')
  const header = rows[hr]
  const col = {
    futIdxLong: colIdx(header, ['future'], ['index'], ['long']),
    futIdxShort: colIdx(header, ['future'], ['index'], ['short']),
    optIdxCallLong: colIdx(header, ['option'], ['index'], ['call'], ['long']),
    optIdxPutLong: colIdx(header, ['option'], ['index'], ['put'], ['long']),
    totLong: colIdx(header, ['total'], ['long']),
    totShort: colIdx(header, ['total'], ['short']),
  }
  let typeCol = header.findIndex((h) => norm(h).includes('type') || norm(h).includes('participant'))
  if (typeCol === -1) typeCol = 0
  const parts = {}
  for (let i = hr + 1; i < rows.length; i++) {
    const c = norm(rows[i][typeCol])
    let p = c.includes('client') ? 'Client' : c.includes('dii') ? 'DII' : c.includes('fii') ? 'FII' : c.includes('pro') ? 'Pro' : null
    if (!p) continue
    parts[p] = {}
    for (const [k, ci] of Object.entries(col)) parts[p][k] = ci >= 0 ? toNum(rows[i][ci]) : 0
  }
  return { type: 'participant_vol', date: extractDate(rows, fileName), fileName, volumes: parts }
}

/* ---------------- FII Derivatives Statistics (₹ amounts) ---------------- */
export function parseFiiStats(rows, fileName = '') {
  // NSE FII stats: rows for Index Futures / Index Options / Stock Futures / Stock Options
  // with Buy (contracts, amount) / Sell (contracts, amount) / OI (contracts, amount)
  const out = { indexFut: null, indexOpt: null, stockFut: null, stockOpt: null }
  for (const r of rows) {
    const label = norm(r[0])
    let key = null
    if (label.includes('index') && label.includes('fut')) key = 'indexFut'
    else if (label.includes('index') && label.includes('opt')) key = 'indexOpt'
    else if (label.includes('stock') && label.includes('fut')) key = 'stockFut'
    else if (label.includes('stock') && label.includes('opt')) key = 'stockOpt'
    if (!key) continue
    const nums = r.slice(1).map(toNum).filter((n) => n !== 0 || true)
    // Heuristic: [buyContracts, buyAmt, sellContracts, sellAmt, oiContracts, oiAmt]
    out[key] = {
      buyAmt: nums[1] ?? 0, sellAmt: nums[3] ?? 0,
      netAmt: (nums[1] ?? 0) - (nums[3] ?? 0),
      oiAmt: nums[5] ?? 0,
    }
  }
  return { type: 'fii_stats', date: extractDate(rows, fileName), fileName, stats: out }
}

/* ---------------- FII/DII Cash activity ---------------- */
export function parseFiiDiiCash(rows, fileName = '') {
  const hr = findHeaderRow(rows, 'buy') !== -1 ? findHeaderRow(rows, 'buy') : 0
  const header = rows[hr] || []
  const buyC = colIdx(header, ['buy']) 
  const sellC = colIdx(header, ['sell'])
  const netC = colIdx(header, ['net'])
  const out = { FII: { buy: 0, sell: 0, net: 0 }, DII: { buy: 0, sell: 0, net: 0 } }
  for (let i = hr + 1; i < rows.length; i++) {
    const c = norm(rows[i][0])
    const who = c.includes('fii') || c.includes('fpi') ? 'FII' : c.includes('dii') ? 'DII' : null
    if (!who) continue
    const buy = buyC >= 0 ? toNum(rows[i][buyC]) : 0
    const sell = sellC >= 0 ? toNum(rows[i][sellC]) : 0
    const net = netC >= 0 ? toNum(rows[i][netC]) : buy - sell
    out[who] = { buy, sell, net }
  }
  return { type: 'fii_dii_cash', date: extractDate(rows, fileName), fileName, cash: out }
}

/* ---------------- Option Chain (strike-wise OI) ---------------- */
export function parseOptionChain(rows, fileName = '', underlying = 'NIFTY') {
  // Find header row: works for old bhavcopy ("STRIKE_PR") and UDiFF ("StrkPric")
  let hr = findHeaderRow(rows, 'strike')
  if (hr === -1) hr = findHeaderRow(rows, 'strkpric')
  if (hr === -1) throw new Error('Option chain: strike column नहीं मिला।')
  const header = rows[hr]

  // Column matchers cover BOTH formats:
  //  old bhavcopy: STRIKE_PR, OPTION_TYP, OPEN_INT, SYMBOL
  //  UDiFF:        StrkPric,  OptnTp,     OpnIntrst, TckrSymb, FinInstrmTp
  const strikeC = colIdx(header, ['strike', 'strkpric'])
  const typeC = colIdx(header, ['optiontyp', 'optntp', 'optiontype', 'option_typ']) >= 0
    ? colIdx(header, ['optiontyp', 'optntp', 'optiontype', 'option_typ'])
    : colIdx(header, ['option'], ['typ'])
  let oiC = colIdx(header, ['opnintrst'])
  if (oiC === -1) oiC = colIdx(header, ['open'], ['int'])
  if (oiC === -1) oiC = colIdx(header, ['oi'])
  const symC = colIdx(header, ['tckrsymb', 'symbol'])
  const instC = colIdx(header, ['fininstrmtp', 'instrument']) // STO/IDO = stock/index option

  const calls = {}, puts = {}
  for (let i = hr + 1; i < rows.length; i++) {
    const row = rows[i]
    if (symC >= 0 && underlying && !norm(row[symC]).includes(norm(underlying))) continue
    // If instrument-type col exists, keep only options (contains 'op' e.g. STO/IDO/OPTIDX/OPTSTK)
    if (instC >= 0) { const it = norm(row[instC]); if (!(it.includes('op') || it.includes('do') || it.includes('to'))) continue }
    const strike = toNum(row[strikeC])
    if (!strike) continue
    const oi = oiC >= 0 ? toNum(row[oiC]) : 0
    const t = norm(row[typeC])
    if (t.includes('ce') || t === 'c') calls[strike] = (calls[strike] || 0) + oi
    else if (t.includes('pe') || t === 'p') puts[strike] = (puts[strike] || 0) + oi
  }
  if (Object.keys(calls).length === 0 && Object.keys(puts).length === 0)
    throw new Error(`Option chain: ${underlying} के लिए कोई strike नहीं मिली। सही bhavcopy है?`)
  // Top-3 strikes by OI on each side → accurate multi-level support/resistance.
  const top = (obj, n = 3) => Object.entries(obj)
    .map(([k, v]) => ({ strike: Number(k), oi: v }))
    .sort((a, b) => b.oi - a.oi)
    .slice(0, n)
  const callLevels = top(calls) // resistances (highest Call OI)
  const putLevels = top(puts)   // supports (highest Put OI)

  const totalCallOI = Object.values(calls).reduce((a, b) => a + b, 0)
  const totalPutOI = Object.values(puts).reduce((a, b) => a + b, 0)

  // Max-pain style spot proxy: strike where total OI (call+put) is lowest pain.
  // Simpler & robust: use the midpoint between strongest support & resistance.
  const spotProxy = (callLevels[0] && putLevels[0])
    ? Math.round((callLevels[0].strike + putLevels[0].strike) / 2)
    : null

  return {
    type: 'option_chain', date: extractDate(rows, fileName), fileName, underlying,
    resistance: callLevels[0]?.strike ?? null,   // strongest resistance
    support: putLevels[0]?.strike ?? null,        // strongest support
    resistances: callLevels,                      // [{strike, oi} x3]
    supports: putLevels,
    spotProxy,
    pcr: totalCallOI ? +(totalPutOI / totalCallOI).toFixed(2) : null,
    totalCallOI, totalPutOI,
  }
}

/* ---------------- India VIX ---------------- */
export function parseVix(rows, fileName = '') {
  let vix = null, prevVix = null
  for (const r of rows) {
    for (let j = 0; j < r.length; j++) {
      if (norm(r[j]).includes('vix') || norm(r[j]).includes('close')) {
        const n = toNum(r[j + 1])
        if (n > 0 && n < 200) { vix = vix ?? n; }
      }
    }
  }
  // fallback: first plausible number in file
  if (vix === null) {
    for (const r of rows) for (const c of r) { const n = toNum(c); if (n > 5 && n < 100) { vix = n; break } }
  }
  return { type: 'vix', date: extractDate(rows, fileName), fileName, vix, prevVix }
}
