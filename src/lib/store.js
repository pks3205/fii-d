import { computeNet } from './calc.js'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const KEY = 'oi_tracker_bundles_v4'

/**
 * On native (APK), the WebView's localStorage can be cleared by the OS. To make
 * data TRULY permanent we mirror every write into Capacitor Preferences (native
 * key-value storage that survives app restarts). At startup we hydrate
 * localStorage from Preferences. localStorage stays the fast synchronous copy.
 */
export async function hydrateFromNative() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { value } = await Preferences.get({ key: KEY })
    if (value) localStorage.setItem(KEY, value)
    else {
      // migrate any existing localStorage into Preferences
      const ls = localStorage.getItem(KEY)
      if (ls) await Preferences.set({ key: KEY, value: ls })
    }
  } catch { /* ignore */ }
}

function mirrorNative(value) {
  if (!Capacitor.isNativePlatform()) return
  Preferences.set({ key: KEY, value }).catch(() => {})
}

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
  const json = JSON.stringify(capped)
  localStorage.setItem(KEY, json)
  mirrorNative(json)
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

/** Manually set VIX (a single number) for a given date's bundle. */
export function setManualVix(date, vix) {
  const list = loadBundles()
  let bundle = list.find((b) => b.date === date)
  if (!bundle) { bundle = { date, sources: {} }; list.push(bundle) }
  const v = Number(vix)
  if (Number.isFinite(v) && v > 0) bundle.sources.vix = { type: 'vix', date, fileName: 'manual', vix: v }
  else delete bundle.sources.vix
  return persist(list)
}

export function clearAll() { localStorage.removeItem(KEY); if (Capacitor.isNativePlatform()) Preferences.remove({ key: KEY }).catch(() => {}) }
export function deleteBundle(date) { return persist(loadBundles().filter((b) => b.date !== date)) }
