import { computeNet } from './calc.js'

const KEY = 'oi_tracker_bundles_v2'

/**
 * A "bundle" = all NSE sources uploaded for one date:
 *   { date, sources: { participant_oi, participant_vol, fii_stats, fii_dii_cash, option_chain, vix } }
 * Each source is the parsed object. participant_oi additionally gets a cached .net.
 */

export function loadBundles() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}

function persist(list) {
  list.sort((a, b) => (a.date < b.date ? 1 : -1))
  const capped = list.slice(0, 60)
  localStorage.setItem(KEY, JSON.stringify(capped))
  return capped
}

/** Add/merge a parsed source into its date's bundle. */
export function addSource(parsed) {
  const list = loadBundles()
  const date = parsed.date
  let bundle = list.find((b) => b.date === date)
  if (!bundle) { bundle = { date, sources: {} }; list.push(bundle) }
  const src = { ...parsed }
  if (parsed.type === 'participant_oi') src.net = computeNet(parsed)
  bundle.sources[parsed.type] = src
  return persist(list)
}

export function clearAll() { localStorage.removeItem(KEY) }
export function deleteBundle(date) { return persist(loadBundles().filter((b) => b.date !== date)) }
