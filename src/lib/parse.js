import * as XLSX from 'xlsx'

/**
 * NSE "Participant wise Open Interest" (fao_participant_oi_DDMMYYYY.csv/.xlsx) parser.
 *
 * The official NSE report has this structure (the first ~1 line is a title/date row,
 * then a header row, then 4 data rows: Client, DII, FII, Pro, then a TOTAL row):
 *
 *  Client Type | Future Index Long | Future Index Short | Future Stock Long |
 *  Future Stock Short | Option Index Call Long | Option Index Put Long |
 *  Option Index Call Short | Option Index Put Short | Option Stock Call Long |
 *  Option Stock Put Long | Option Stock Call Short | Option Stock Put Short |
 *  Total Long Contracts | Total Short Contracts
 *
 * Column order/labels have varied slightly over the years, so instead of relying on
 * fixed indexes we fuzzy-match header names. This keeps the parser robust.
 */

const PARTICIPANTS = ['Client', 'DII', 'FII', 'Pro']

// Canonical field -> list of header keywords (all must appear, order-independent)
const FIELD_MATCHERS = {
  futIdxLong:   [['future', 'fut'], ['index', 'idx'], ['long']],
  futIdxShort:  [['future', 'fut'], ['index', 'idx'], ['short']],
  futStkLong:   [['future', 'fut'], ['stock', 'stk'], ['long']],
  futStkShort:  [['future', 'fut'], ['stock', 'stk'], ['short']],
  optIdxCallLong:  [['option', 'opt'], ['index', 'idx'], ['call'], ['long']],
  optIdxCallShort: [['option', 'opt'], ['index', 'idx'], ['call'], ['short']],
  optIdxPutLong:   [['option', 'opt'], ['index', 'idx'], ['put'],  ['long']],
  optIdxPutShort:  [['option', 'opt'], ['index', 'idx'], ['put'],  ['short']],
  optStkCallLong:  [['option', 'opt'], ['stock', 'stk'], ['call'], ['long']],
  optStkCallShort: [['option', 'opt'], ['stock', 'stk'], ['call'], ['short']],
  optStkPutLong:   [['option', 'opt'], ['stock', 'stk'], ['put'],  ['long']],
  optStkPutShort:  [['option', 'opt'], ['stock', 'stk'], ['put'],  ['short']],
}

function norm(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z]/g, '')
}

function headerMatches(header, groups) {
  const h = norm(header)
  return groups.every((alts) => alts.some((a) => h.includes(norm(a))))
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return v
  const n = Number(String(v).replace(/[",\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function detectParticipant(cell) {
  const c = norm(cell)
  if (!c) return null
  if (c.includes('client')) return 'Client'
  if (c === 'dii' || c.includes('dii') || c.includes('domestic')) return 'DII'
  if (c === 'fii' || c.includes('fii') || c.includes('foreign')) return 'FII'
  if (c.includes('pro')) return 'Pro'
  if (c.includes('total')) return 'TOTAL'
  return null
}

/**
 * Parse a workbook (already read) into a normalized structure.
 * Returns { date, participants: { Client:{...}, DII, FII, Pro } }
 * Each participant has all 12 raw long/short fields.
 */
export function parseWorkbook(wb, fileName = '') {
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })

  // Find header row: the row that contains "long" and "short" keywords in many cells
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const joined = rows[i].map(norm).join('|')
    if (joined.includes('long') && joined.includes('short') && joined.includes('future')) {
      headerRowIdx = i
      break
    }
  }
  if (headerRowIdx === -1) {
    // fallback: assume row 1 is header
    headerRowIdx = rows.findIndex((r) => r.some((c) => norm(c).includes('long')))
  }
  if (headerRowIdx === -1) {
    throw new Error('Header row (Long/Short columns) not found. क्या यह सही NSE Participant OI फ़ाइल है?')
  }

  const header = rows[headerRowIdx]

  // Map each canonical field -> column index
  const colOf = {}
  for (const [field, groups] of Object.entries(FIELD_MATCHERS)) {
    const idx = header.findIndex((h) => headerMatches(h, groups))
    colOf[field] = idx
  }

  // Client-type column: usually column 0, or the col whose header includes "client type"/"participant"
  let typeCol = header.findIndex((h) => {
    const n = norm(h)
    return n.includes('clienttype') || n.includes('participant') || n.includes('type')
  })
  if (typeCol === -1) typeCol = 0

  const participants = {}
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const p = detectParticipant(row[typeCol])
    if (!p || p === 'TOTAL') continue
    const rec = {}
    for (const field of Object.keys(FIELD_MATCHERS)) {
      const ci = colOf[field]
      rec[field] = ci >= 0 ? toNum(row[ci]) : 0
    }
    participants[p] = rec
  }

  const missing = PARTICIPANTS.filter((p) => !participants[p])
  if (missing.length === PARTICIPANTS.length) {
    throw new Error('Client/FII/Pro rows नहीं मिलीं। फ़ाइल का format अलग है।')
  }

  const date = extractDate(rows, fileName)

  return { date, fileName, participants }
}

function extractDate(rows, fileName) {
  // Try filename pattern fao_participant_oi_DDMMYYYY
  const m = fileName.match(/(\d{2})(\d{2})(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  // Try any date-looking cell in first rows
  for (let i = 0; i < Math.min(rows.length, 4); i++) {
    for (const c of rows[i]) {
      const s = String(c)
      const dm = s.match(/(\d{1,2})[-/ ]([A-Za-z]{3,}|\d{1,2})[-/ ](\d{2,4})/)
      if (dm) return s.trim()
    }
  }
  return new Date().toISOString().slice(0, 10)
}

export async function parseFile(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseWorkbook(wb, file.name)
}
