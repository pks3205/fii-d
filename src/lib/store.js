import { computeNet } from './calc.js'

const KEY = 'oi_tracker_history_v1'

/** history = array newest-first of { date, fileName, participants, net } */
export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveDay(day) {
  const hist = loadHistory()
  const entry = { ...day, net: computeNet(day) }
  // replace if same date exists
  const idx = hist.findIndex((h) => h.date === day.date)
  if (idx >= 0) hist[idx] = entry
  else hist.unshift(entry)
  // keep newest first, cap at 60 days
  hist.sort((a, b) => (a.date < b.date ? 1 : -1))
  const capped = hist.slice(0, 60)
  localStorage.setItem(KEY, JSON.stringify(capped))
  return capped
}

export function clearHistory() {
  localStorage.removeItem(KEY)
}

export function deleteDay(date) {
  const hist = loadHistory().filter((h) => h.date !== date)
  localStorage.setItem(KEY, JSON.stringify(hist))
  return hist
}
