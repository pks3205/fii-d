import { computeNet } from './calc.js'

const KEY = 'oi_tracker_bundles_v4'

/**
 * A "bundle" = all NSE sources uploaded for one date:
 *   { date, sources: { participant_oi, participant_vol, fii_stats, option_chain } }
 *
 * Only these 4 sources are kept (VIX & FII/DII cash removed).
 */

// The sources we keep. Anything else is ignored on load.
const KEEP = ['participant_oi', 'participant_vol', 'fii_stats', 'option_chain', 'fii_dii_cash', 'vix']

export function loadBundles() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY)) || []
    // prune any stray sources
    for (const b of list) {
      for (const k of Object.keys(b.sources || {})) if (!KEEP.includes(k)) delete b.sources[k]
    }
    return list
  } catch { return [] }
}

function persist(list) {
  list.sort((a, b) => (a.date < b.date ? 1 : -1))
  const capped = list.slice(0, 400) // keep long history
  localStorage.setItem(KEY, JSON.stringify(capped))
  return capped
}

/**
 * Add/merge a parsed source.
 * @param parsed       the parsed file object (has its own .date)
 * @param targetDate   OPTIONAL — if given, merge into THIS bundle instead of the
 *                     file's own date. This is what stops files with slightly
 *                     different auto-detected dates from scattering into separate
 *                     bundles (the disappearing-file bug).
 */
export function addSource(parsed, targetDate = null) {
  if (!KEEP.includes(parsed.type)) return loadBundles()
  const list = loadBundles()

  // Decide which bundle to merge into:
  // 1) explicit targetDate (the date currently being viewed), else
  // 2) if a bundle already exists for the file's own date, use it, else
  // 3) create a new bundle at the file's date.
  let date = targetDate
  if (!date) {
    const existing = list.find((b) => b.date === parsed.date)
    date = existing ? existing.date : parsed.date
  }

  let bundle = list.find((b) => b.date === date)
  if (!bundle) { bundle = { date, sources: {} }; list.push(bundle) }
  const src = { ...parsed, date } // normalise the source's date to the bundle date
  if (parsed.type === 'participant_oi') src.net = computeNet(parsed)
  bundle.sources[parsed.type] = src
  return persist(list)
}

export function clearAll() { localStorage.removeItem(KEY) }
export function deleteBundle(date) { return persist(loadBundles().filter((b) => b.date !== date)) }
