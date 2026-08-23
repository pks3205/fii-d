import * as XLSX from 'xlsx'

/**
 * Reads any NSE file (xlsx/csv), auto-detects which report it is, and routes to
 * the right parser. Returns { type, ...parsedData }.
 *
 * Supported types:
 *  - 'participant_oi'   : Participant wise Open Interest
 *  - 'participant_vol'  : Participant wise Trading Volumes
 *  - 'fii_stats'        : FII Derivatives Statistics
 *  - 'fii_dii_cash'     : FII/DII cash market activity
 *  - 'option_chain'     : Option chain / bhavcopy (strike-wise OI)
 *  - 'vix'              : India VIX
 */

export function readRows(buf) {
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** Look at the first ~15 rows joined and guess the report type. */
export function detectType(rows) {
  const blob = rows.slice(0, 15).map((r) => r.map(norm).join(' ')).join(' | ')

  const has = (...ks) => ks.every((k) => blob.includes(norm(k)))
  const any = (...ks) => ks.some((k) => blob.includes(norm(k)))

  // Participant OI: has "participant" + "open interest" + long/short instrument cols
  if (has('participant') && any('openinterest', 'oi') && has('futureindexlong')) return 'participant_oi'
  if (has('participant') && any('tradingvolume', 'volume') && any('futureindex', 'future')) return 'participant_vol'

  // FII derivatives statistics: "fii" + "buy"/"sell" amounts across instruments
  if (any('fiiderivatives', 'foreigninstitutional') && any('buy', 'sell', 'amount')) return 'fii_stats'
  if (has('fii') && has('dii') && any('buyvalue', 'sellvalue', 'netvalue', 'grosspurchase')) return 'fii_dii_cash'

  // Option chain: strike price column + call/put OI
  if (any('strikeprice', 'strike') && any('oi', 'openinterest', 'chnginoi', 'changeinoi')) return 'option_chain'

  // Bhavcopy with option instruments (OPTIDX/OPTSTK) — treat as option chain source
  if (any('optidx', 'optstk') && any('strikepr', 'strike')) return 'option_chain'

  // UDiFF F&O bhavcopy: StrkPric + OptnTp / OpnIntrst columns
  if (any('strkpric') && any('optntp', 'opnintrst', 'fininstrmtp')) return 'option_chain'

  // India VIX
  if (any('indiavix', 'vix')) return 'vix'

  return 'unknown'
}

export function detectFromName(name = '') {
  const n = name.toLowerCase()
  if (n.includes('participant_oi') || (n.includes('participant') && n.includes('oi'))) return 'participant_oi'
  if (n.includes('participant_vol') || (n.includes('participant') && n.includes('vol'))) return 'participant_vol'
  if (n.includes('fii_stats') || n.includes('fii_deriv')) return 'fii_stats'
  if (n.includes('fii_dii') || n.includes('fao_fiidii') || n.includes('fii_stats')) return 'fii_dii_cash'
  if (n.includes('option') || n.includes('oc_') || n.includes('bhav')) return 'option_chain'
  if (n.includes('vix')) return 'vix'
  return null
}
