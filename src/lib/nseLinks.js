/**
 * Builds NSE direct-download URLs for a given date.
 * Only the 4 files the app uses. All are direct archive files (most reliable).
 * Patterns verified from NSE archives (archives.nseindia.com).
 */

const MMM = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function nseLinks(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mon = MMM[d.getMonth()]
  const MON = mon.toUpperCase()

  return [
    {
      type: 'participant_oi',
      label: 'Participant wise Open Interest',
      icon: '📊',
      url: `https://archives.nseindia.com/content/nsccl/fao_participant_oi_${dd}${mm}${yyyy}.csv`,
      note: 'सीधे CSV — Upload → Participant OI slot',
    },
    {
      type: 'participant_vol',
      label: 'Participant wise Trading Volumes',
      icon: '🔊',
      url: `https://archives.nseindia.com/content/nsccl/fao_participant_vol_${dd}${mm}${yyyy}.csv`,
      note: 'सीधे CSV — Upload → Participant Volumes slot',
    },
    {
      type: 'fii_stats',
      label: 'FII Derivatives Statistics',
      icon: '💰',
      url: `https://archives.nseindia.com/content/fo/fii_stats_${dd}-${mon}-${yyyy}.xls`,
      note: 'Excel (.xls) — Upload → FII Stats slot',
    },
    {
      type: 'option_chain',
      label: 'F&O Bhavcopy (Option Chain OI)',
      icon: '🎯',
      url: `https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_0_0_0_${yyyy}${mm}${dd}_F_0000.csv.zip`,
      note: 'ZIP (UDiFF format) — unzip करके CSV को Option Chain slot में डालें',
    },
  ]
}

export const NSE_ALL_REPORTS = 'https://www.nseindia.com/all-reports-derivatives'
