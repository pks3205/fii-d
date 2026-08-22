/**
 * Builds NSE direct-download URLs for a given date.
 * Patterns verified from NSE archives (archives.nseindia.com) and the
 * /api/daily-reports?key=FO metadata.
 *
 * NOTE: NSE's firewall may return 403 if opened cold. Tip shown in UI:
 * open nseindia.com once in the same browser first, then these links work.
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
      note: 'सीधे CSV — app में upload करें',
    },
    {
      type: 'participant_vol',
      label: 'Participant wise Trading Volumes',
      icon: '🔊',
      url: `https://archives.nseindia.com/content/nsccl/fao_participant_vol_${dd}${mm}${yyyy}.csv`,
      note: 'सीधे CSV',
    },
    {
      type: 'fii_stats',
      label: 'FII Derivatives Statistics',
      icon: '💰',
      url: `https://archives.nseindia.com/content/fo/fii_stats_${dd}-${mon}-${yyyy}.xls`,
      note: 'Excel (.xls)',
    },
    {
      type: 'fii_dii_cash',
      label: 'FII/DII Cash Activity',
      icon: '🏦',
      url: `https://www.nseindia.com/reports/fii-dii`,
      note: 'Page खोलें → "csv Download" दबाएँ (direct file रोज़ बदलता है)',
      isPage: true,
    },
    {
      type: 'option_chain',
      label: 'Option Chain (NIFTY)',
      icon: '🎯',
      url: `https://www.nseindia.com/option-chain`,
      note: 'Page पर "Download (.csv)" बटन से लें',
      isPage: true,
    },
    {
      type: 'fo_bhavcopy',
      label: 'F&O Bhavcopy (all strikes OI)',
      icon: '🗃️',
      url: `https://archives.nseindia.com/content/historical/DERIVATIVES/${yyyy}/${MON}/fo${dd}${MON}${yyyy}bhav.csv.zip`,
      note: 'ZIP — unzip करके Option Chain slot में डालें',
    },
    {
      type: 'vix',
      label: 'India VIX',
      icon: '🌡️',
      url: `https://www.nseindia.com/market-data/india-vix`,
      note: 'Page से आज का VIX मान देखें/डालें',
      isPage: true,
    },
  ]
}

export const NSE_ALL_REPORTS = 'https://www.nseindia.com/all-reports-derivatives'
