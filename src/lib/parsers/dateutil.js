/**
 * Robust date extraction for ALL NSE file naming schemes.
 * Returns 'YYYY-MM-DD' or null. Order of attempts matters.
 *
 * Known NSE filename patterns:
 *   fao_participant_oi_DDMMYYYY.csv         → 20082026  (DD MM YYYY)
 *   fao_participant_vol_DDMMYYYY.csv        → 20082026
 *   fii_stats_DD-Mon-YYYY.xls               → 20-Aug-2026
 *   BhavCopy_NSE_FO_0_0_0_YYYYMMDD_F_0000   → 20260822  (YYYY MM DD)
 *   option chain csv, fii_dii files        → varies; fall back to content
 */

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const valid = (y, m, d) => y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31

export function extractDateSmart(rows, fileName = '', hintType = null) {
  const name = String(fileName)

  // 1) DD-Mon-YYYY  (fii_stats_20-Aug-2026)
  let m = name.match(/(\d{1,2})[-_ ]([A-Za-z]{3,})[-_ ](\d{4})/)
  if (m) {
    const mm = MON[m[2].slice(0, 3).toLowerCase()]
    if (mm && valid(+m[3], mm, +m[1])) return iso(+m[3], mm, +m[1])
  }

  // 2) YYYYMMDD  (bhavcopy: BhavCopy_..._20260822_...) — 8 digits starting 20xx
  m = name.match(/(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)/)
  if (m && valid(+m[1], +m[2], +m[3])) return iso(+m[1], +m[2], +m[3])

  // 3) DDMMYYYY  (fao_participant_oi_20082026) — 8 digits ending 20xx
  m = name.match(/(?<!\d)(\d{2})(\d{2})(20\d{2})(?!\d)/)
  if (m && valid(+m[3], +m[2], +m[1])) return iso(+m[3], +m[2], +m[1])

  // 4) YYYY-MM-DD or DD-MM-YYYY with separators in filename
  m = name.match(/(\d{4})[-_/](\d{1,2})[-_/](\d{1,2})/)
  if (m && valid(+m[1], +m[2], +m[3])) return iso(+m[1], +m[2], +m[3])
  m = name.match(/(\d{1,2})[-_/](\d{1,2})[-_/](\d{4})/)
  if (m && valid(+m[3], +m[2], +m[1])) return iso(+m[3], +m[2], +m[1])

  // 5) Content-based: scan first ~6 rows for "as on <date>" or any date cell
  const dateFromContent = scanContent(rows)
  if (dateFromContent) return dateFromContent

  return null
}

function scanContent(rows) {
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    for (const cell of rows[i]) {
      const s = String(cell)
      // "as on Aug 20, 2026" / "20-Aug-2026" / "20/08/2026" / "Aug 20, 2026"
      let m = s.match(/([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/) // Aug 20, 2026
      if (m) { const mm = MON[m[1].slice(0, 3).toLowerCase()]; if (mm && valid(+m[3], mm, +m[2])) return iso(+m[3], mm, +m[2]) }
      m = s.match(/(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})/) // 20-Aug-2026
      if (m) { const mm = MON[m[2].slice(0, 3).toLowerCase()]; if (mm && valid(+m[3], mm, +m[1])) return iso(+m[3], mm, +m[1]) }
      m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
      if (m && valid(+m[1], +m[2], +m[3])) return iso(+m[1], +m[2], +m[3])
      m = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
      if (m && valid(+m[3], +m[2], +m[1])) return iso(+m[3], +m[2], +m[1])
    }
  }
  return null
}
