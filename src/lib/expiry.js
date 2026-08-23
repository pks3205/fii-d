/**
 * Expiry helper for Indian index F&O.
 * NIFTY weekly expiry = Thursday (moved to Tuesday for some periods, but Thursday
 * is the long-standing default; if a Thursday is a holiday, expiry is the prior
 * trading day — we can't know holidays offline, so we use Thursday as the rule).
 *
 * Returns info relative to a given date (the data's date).
 */

export function expiryInfo(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun ... 4=Thu

  // days until next Thursday (0 if today is Thursday)
  let daysToThu = (4 - day + 7) % 7

  const nextExpiry = new Date(d)
  nextExpiry.setDate(d.getDate() + daysToThu)

  // Is this Thursday also the LAST Thursday of the month? → monthly expiry
  const isMonthly = isLastThursday(nextExpiry)

  let label, urgency
  if (daysToThu === 0) { label = 'आज Expiry है! (Thursday)'; urgency = 'high' }
  else if (daysToThu === 1) { label = 'कल Expiry (Thursday)'; urgency = 'high' }
  else { label = `Expiry में ${daysToThu} दिन (${weekday(nextExpiry)})`; urgency = daysToThu <= 2 ? 'mid' : 'low' }

  return {
    daysToExpiry: daysToThu,
    expiryDate: nextExpiry.toISOString().slice(0, 10),
    isMonthly,
    isExpiryDay: daysToThu === 0,
    label: isMonthly ? `${label} · Monthly` : label,
    urgency,
    note: daysToThu === 0
      ? 'Expiry day: OI data भरोसेमंद कम — बहुत positions square-off होती हैं। नए महीने/हफ़्ते का buildup कल से देखें।'
      : daysToThu <= 2
        ? 'Expiry पास है — theta तेज़, options तेज़ी से घटते हैं। Positional signals सावधानी से लें।'
        : 'Expiry दूर है — positional OI trend ज़्यादा भरोसेमंद।',
  }
}

function isLastThursday(date) {
  const d = new Date(date)
  d.setDate(d.getDate() + 7)
  return d.getMonth() !== date.getMonth()
}

function weekday(date) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
}
