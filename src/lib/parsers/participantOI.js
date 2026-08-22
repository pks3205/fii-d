/** Participant wise Open Interest parser (moved from parse.js, unchanged logic). */

const PARTICIPANTS = ['Client', 'DII', 'FII', 'Pro']

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

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const headerMatches = (h, groups) => { const x = norm(h); return groups.every((alts) => alts.some((a) => x.includes(norm(a)))) }
function toNum(v) {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return v
  const n = Number(String(v).replace(/[",\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}
function detectParticipant(cell) {
  const c = norm(cell); if (!c) return null
  if (c.includes('client')) return 'Client'
  if (c.includes('dii') || c.includes('domestic')) return 'DII'
  if (c.includes('fii') || c.includes('foreign')) return 'FII'
  if (c.includes('pro')) return 'Pro'
  if (c.includes('total')) return 'TOTAL'
  return null
}

export function parseParticipantOI(rows, fileName = '') {
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const joined = rows[i].map(norm).join('|')
    if (joined.includes('long') && joined.includes('short') && joined.includes('future')) { headerRowIdx = i; break }
  }
  if (headerRowIdx === -1) headerRowIdx = rows.findIndex((r) => r.some((c) => norm(c).includes('long')))
  if (headerRowIdx === -1) throw new Error('Participant OI: Long/Short header नहीं मिला।')

  const header = rows[headerRowIdx]
  const colOf = {}
  for (const [field, groups] of Object.entries(FIELD_MATCHERS)) colOf[field] = header.findIndex((h) => headerMatches(h, groups))
  let typeCol = header.findIndex((h) => { const n = norm(h); return n.includes('clienttype') || n.includes('participant') || n.includes('type') })
  if (typeCol === -1) typeCol = 0

  const participants = {}
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const p = detectParticipant(rows[i][typeCol])
    if (!p || p === 'TOTAL') continue
    const rec = {}
    for (const field of Object.keys(FIELD_MATCHERS)) { const ci = colOf[field]; rec[field] = ci >= 0 ? toNum(rows[i][ci]) : 0 }
    participants[p] = rec
  }
  if (PARTICIPANTS.every((p) => !participants[p])) throw new Error('Participant OI: Client/FII/Pro rows नहीं मिलीं।')

  return { type: 'participant_oi', date: extractDate(rows, fileName), fileName, participants }
}

export function extractDate(rows, fileName) {
  const m = fileName.match(/(\d{2})(\d{2})(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  for (let i = 0; i < Math.min(rows.length, 4); i++) {
    for (const c of rows[i]) {
      const s = String(c)
      if (/(\d{1,2})[-/ ]([A-Za-z]{3,}|\d{1,2})[-/ ](\d{2,4})/.test(s)) {
        const d = new Date(s.replace(/^.*as on/i, '').trim())
        if (!isNaN(d)) return d.toISOString().slice(0, 10)
      }
    }
  }
  return new Date().toISOString().slice(0, 10)
}
