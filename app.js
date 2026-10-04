import { GoldMarketRepository, TIMEFRAMES, normalizeBars } from './market.js';

const STORAGE = {
  settings: 'gold-os.settings.v1',
  tasks: 'gold-os.tasks.v1',
  schedule: 'gold-os.schedule.v1',
  liveSnapshot: 'gold-os.live-snapshot.v1',
};
const REFRESH_MS = { saver: 60000, balanced: 15000, fast: 5000 };
const DEFAULT_SETTINGS = {
  appearance: 'system',
  clockFormat: '24',
  clockFont: 'serif',
  clockSize: 84,
  clockPosition: 'center',
  clockOpacity: 100,
  timeZone: 'Asia/Kolkata',
  wallpaperBrightness: 76,
  wallpaperIntensity: 80,
  goldIntensity: 55,
  chartOpacity: 88,
  dataMode: 'demo',
  battery: 'balanced',
  timeframe: '5m',
  showGold: true,
  showPrice: true,
  showChange: true,
  showHighLow: true,
  showChart: true,
  showTrend: true,
  showRsi: true,
  showVwap: true,
  showVolatility: true,
  showSessions: true,
  showCalendar: true,
  showSchedule: true,
  showYear: true,
  showTasks: true,
  dailyReminder: false,
  reminderTime: '08:45',
};
const DEFAULT_TASKS = [
  { id: 'task-1', name: 'Set the day’s intention', done: false },
  { id: 'task-2', name: 'Review gold journal', done: false },
  { id: 'task-3', name: 'Backtest one setup', done: false },
  { id: 'task-4', name: 'Take a mindful break', done: false },
];
const DEFAULT_SCHEDULE = [
  { id: 'event-1', time: '08:45', name: 'Morning focus', kind: 'focus' },
  { id: 'event-2', time: '10:00', name: 'Deep work', kind: 'focus' },
  { id: 'event-3', time: '11:45', name: 'Inbox reset', kind: 'personal' },
  { id: 'event-4', time: '13:30', name: 'Personal hour', kind: 'personal' },
  { id: 'event-5', time: '15:00', name: 'Gold review', kind: 'gold' },
  { id: 'event-6', time: '16:00', name: 'Research', kind: 'focus' },
  { id: 'event-7', time: '18:00', name: 'Walk / gym', kind: 'personal' },
];
const TIMEFRAME_META = Object.fromEntries(TIMEFRAMES.map((item) => [item.id, item]));
const repository = new GoldMarketRepository();
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Local storage is optional. */ }
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function formatPrice(value) {
  const number = finite(value);
  return number === null ? 'N/A' : number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatChartPrice(value) {
  const number = finite(value);
  return number === null ? 'N/A' : number.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function makeId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}
function zonedParts(date = new Date(), timeZone = settings.timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const output = {};
  for (const part of parts) if (part.type !== 'literal') output[part.type] = part.value;
  return {
    year: Number(output.year), month: Number(output.month), day: Number(output.day),
    weekday: output.weekday, hour: Number(output.hour), minute: Number(output.minute), second: Number(output.second),
  };
}
function two(value) { return String(value).padStart(2, '0'); }
function formatAge(seconds) {
  if (!Number.isFinite(seconds) || seconds < 8) return 'just now';
  if (seconds < 60) return `${Math.floor(seconds)} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} days ago`;
}
function timeInZone(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: settings.timeZone,
    hour: '2-digit', minute: '2-digit', hour12: settings.clockFormat === '12',
  }).format(date);
}
function timezoneName(zone) {
  const parts = zone.split('/');
  return parts.length > 1 ? `${parts[0].replaceAll('_', ' ')} / ${parts.at(-1).replaceAll('_', ' ')}` : zone;
}

const storedSettings = loadJSON(STORAGE.settings, {});
let settings = { ...DEFAULT_SETTINGS, ...(storedSettings && typeof storedSettings === 'object' ? storedSettings : {}) };
let tasks = Array.isArray(loadJSON(STORAGE.tasks, null)) ? loadJSON(STORAGE.tasks, DEFAULT_TASKS) : DEFAULT_TASKS.map((task) => ({ ...task }));
let schedule = Array.isArray(loadJSON(STORAGE.schedule, null)) ? loadJSON(STORAGE.schedule, DEFAULT_SCHEDULE) : DEFAULT_SCHEDULE.map((event) => ({ ...event }));
let snapshot = null;
let selectedTimeframe = TIMEFRAME_META[settings.timeframe] ? settings.timeframe : '5m';
let calendarCursor = null;
let currentDateKey = '';
let marketTimer = null;
let toastTimer = null;
let reminderTimer = null;
let quickMode = 'task';
let editingPlan = false;
let marketRequestId = 0;

function getSessionState(now = new Date()) {
  const local = zonedParts(now, settings.timeZone);
  const localMinute = local.hour * 60 + local.minute;
  const utcMinute = now.getUTCHours() * 60 + now.getUTCMinutes();
  const offset = ((localMinute - utcMinute) + 1440) % 1440;
  const utcDay = now.getUTCDay();
  if (utcDay === 0 || utcDay === 6) return [];
  const sessions = [
    { name: 'ASIA', start: 0, end: 9 * 60 },
    { name: 'LONDON', start: 7 * 60, end: 16 * 60 },
    { name: 'NEW YORK', start: 12 * 60, end: 21 * 60 },
  ];
  return sessions.filter(({ start, end }) => {
    const localStart = (start + offset) % 1440;
    const localEnd = (end + offset) % 1440;
    return localStart < localEnd
      ? localMinute >= localStart && localMinute < localEnd
      : localMinute >= localStart || localMinute < localEnd;
  });
}

function renderClock(now = new Date()) {
  const parts = zonedParts(now);
  const time = timeInZone(now);
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: settings.timeZone, weekday: 'short' }).format(now).toUpperCase();
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: settings.timeZone, month: 'long' }).format(now).toUpperCase();
  const dateText = `${weekday} <i>•</i> ${two(parts.day)} ${month}`;
  $('#hero-clock').textContent = time;
  $('#hero-clock').dateTime = `${two(parts.hour)}:${two(parts.minute)}`;
  $('#hero-date').innerHTML = dateText;
  $('#status-time').textContent = time;
  $('#clock-timezone').textContent = timezoneName(settings.timeZone).toUpperCase();
  $('#clock-greeting').textContent = parts.hour < 12 ? 'GOOD MORNING' : parts.hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';

  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  if (dateKey !== currentDateKey) {
    currentDateKey = dateKey;
    if (!calendarCursor) calendarCursor = { year: parts.year, month: parts.month - 1 };
    renderCalendar();
    renderSchedule();
    renderYearProgress(now, parts);
  }
  renderSessions(now);
}

function renderSessions(now = new Date()) {
  const active = getSessionState(now);
  const pill = $('#session-pill');
  pill.classList.toggle('is-active', active.length > 0);
  const label = active.length ? active.map((item) => item.name === 'NEW YORK' ? 'NY' : item.name).join(' + ') : 'MARKET QUIET';
  pill.querySelector('span').textContent = settings.showSessions ? `${label} ${active.length ? 'SESSION' : ''}`.trim() : 'TRADER HOME';
  pill.title = active.length ? `${active.map((item) => item.name).join(', ')} session · ${settings.timeZone}` : `No main session · ${settings.timeZone}`;
  $('#footer-session').textContent = `SESSION · ${active.length ? active.map((item) => item.name).join(' + ') : 'MARKET QUIET'} · ${settings.timeZone.toUpperCase()}`;
  applyVisibility();
}

function renderCalendar() {
  if (!calendarCursor) return;
  const { year, month } = calendarCursor;
  const current = zonedParts();
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const mondayOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const previousMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month, 1))).toUpperCase();
  $('#calendar-month').innerHTML = `${monthName} <span>${year}</span>`;
  const days = [];
  for (let index = 0; index < 42; index += 1) {
    let day;
    let outside = false;
    let displayYear = year;
    let displayMonth = month;
    if (index < mondayOffset) {
      day = previousMonthDays - mondayOffset + index + 1;
      outside = true;
      displayMonth -= 1;
      if (displayMonth < 0) { displayMonth = 11; displayYear -= 1; }
    } else if (index >= mondayOffset + daysInMonth) {
      day = index - mondayOffset - daysInMonth + 1;
      outside = true;
      displayMonth += 1;
      if (displayMonth > 11) { displayMonth = 0; displayYear += 1; }
    } else {
      day = index - mondayOffset + 1;
    }
    const today = !outside && year === current.year && month + 1 === current.month && day === current.day;
    const hasEvent = today && schedule.length > 0;
    const classes = ['calendar-day', outside ? 'is-outside' : '', today ? 'is-today' : '', hasEvent ? 'has-event' : ''].filter(Boolean).join(' ');
    days.push(`<button class="${classes}" type="button" role="gridcell" aria-label="${day} ${monthName} ${year}${today ? ', today' : ''}" ${today ? 'aria-current="date"' : ''}>${day}</button>`);
  }
  $('#calendar-days').innerHTML = days.join('');
}

function currentLocalMinute(now = new Date()) {
  const parts = zonedParts(now);
  return parts.hour * 60 + parts.minute;
}
function zonedWallTimeToEpoch(year, month, day, hour, minute, timeZone) {
  const targetWallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = targetWallAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = zonedParts(new Date(candidate), timeZone);
    const observedWallAsUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute);
    const adjustment = targetWallAsUtc - observedWallAsUtc;
    candidate += adjustment;
    if (adjustment === 0) break;
  }
  const result = zonedParts(new Date(candidate), timeZone);
  return result.year === year && result.month === month && result.day === day && result.hour === hour && result.minute === minute
    ? candidate
    : null;
}
function nextReminderEpoch(nowMs = Date.now()) {
  const local = zonedParts(new Date(nowMs), settings.timeZone);
  const [hour, minute] = (settings.reminderTime || '08:45').split(':').map(Number);
  for (let offset = 0; offset <= 2; offset += 1) {
    const date = new Date(Date.UTC(local.year, local.month - 1, local.day + offset));
    const candidate = zonedWallTimeToEpoch(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, minute, settings.timeZone);
    if (candidate !== null && candidate > nowMs + 5000) return candidate;
  }
  return null;
}
function planDailyReminder() {
  clearTimeout(reminderTimer);
  const toggle = $('#setting-daily-reminder');
  const support = $('#notification-support-copy');
  const supported = 'Notification' in window && 'serviceWorker' in navigator;
  if (toggle) toggle.disabled = !supported;
  if (support) support.textContent = supported
    ? 'Optional system notification · while the dashboard is available'
    : 'System notifications are not supported in this browser';
  if (!supported || !settings.dailyReminder) return;
  if (Notification.permission !== 'granted') {
    settings.dailyReminder = false;
    if (toggle) toggle.checked = false;
    saveJSON(STORAGE.settings, settings);
    return;
  }
  const target = nextReminderEpoch();
  if (target === null) return;
  reminderTimer = setTimeout(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('GOLD OS · daily intention', {
        body: 'Take a moment to set your focus for today.',
        icon: './assets/icon-192.png',
        badge: './assets/icon-192.png',
        tag: 'gold-os-daily-intention',
        data: { url: './' },
      });
    } catch (error) {
      console.warn('Daily reminder could not be shown:', error);
    }
    planDailyReminder();
  }, Math.max(0, Math.min(target - Date.now(), 2_147_000_000)));
}
async function setDailyReminder(enabled) {
  if (!enabled) {
    settings.dailyReminder = false;
    saveJSON(STORAGE.settings, settings);
    planDailyReminder();
    showToast('Daily reminder turned off.');
    return;
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    settings.dailyReminder = false;
    $('#setting-daily-reminder').checked = false;
    planDailyReminder();
    showToast('Notifications are not supported in this browser.');
    return;
  }
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') {
    settings.dailyReminder = false;
    $('#setting-daily-reminder').checked = false;
    saveJSON(STORAGE.settings, settings);
    showToast('Notification permission was not granted.');
    return;
  }
  settings.dailyReminder = true;
  saveJSON(STORAGE.settings, settings);
  planDailyReminder();
  showToast(`Daily reminder set for ${settings.reminderTime} ${settings.timeZone}.`);
}
function renderSchedule(now = new Date()) {
  const root = $('#schedule-list');
  const currentMinute = currentLocalMinute(now);
  const ordered = [...schedule].sort((a, b) => a.time.localeCompare(b.time));
  const nextIndex = ordered.findIndex((item) => {
    const [hours, minutes] = item.time.split(':').map(Number);
    return hours * 60 + minutes >= currentMinute;
  });
  root.innerHTML = ordered.slice(0, 7).map((event, index) => {
    const [hours, minutes] = event.time.split(':').map(Number);
    const past = hours * 60 + minutes < currentMinute;
    const next = index === nextIndex;
    return `<div class="schedule-item ${past ? 'is-past' : ''} ${next ? 'is-next' : ''}" data-kind="${escapeHTML(event.kind ?? 'focus')}">
      <span class="schedule-time">${escapeHTML(event.time)}</span><i class="schedule-marker" aria-hidden="true"></i><span class="schedule-name">${escapeHTML(event.name)}</span>
      ${editingPlan ? `<button class="schedule-delete" data-delete-event="${escapeHTML(event.id)}" type="button" aria-label="Remove ${escapeHTML(event.name)}">×</button>` : ''}
    </div>`;
  }).join('') || '<div class="schedule-empty">Add a small moment to your plan.</div>';
  const nextEvent = nextIndex >= 0 ? ordered[nextIndex] : null;
  $('#next-event-label').textContent = nextEvent ? `NEXT · ${nextEvent.time}` : 'ALL SET';
  $('#edit-plan').textContent = editingPlan ? 'DONE' : 'EDIT PLAN';
}

function renderYearProgress(now = new Date(), parts = zonedParts(now)) {
  const year = parts.year;
  const totalDays = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
  const dayOfYear = Math.floor((Date.UTC(year, parts.month - 1, parts.day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const percent = Math.max(0, Math.min(100, Math.round((dayOfYear / totalDays) * 100)));
  const daysLeft = Math.max(0, totalDays - dayOfYear);
  $('#year-label').textContent = String(year);
  $('#year-percent').textContent = `${percent}%`;
  $('#year-bar').style.width = `${percent}%`;
  $('#year-marker').style.left = `${percent}%`;
  $('#days-left').textContent = `${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'} LEFT`;
  $('#year-start-label').textContent = `01 JAN ${year}`;
  $('#year-end-label').textContent = `31 DEC ${year}`;
}

function renderTasks() {
  const root = $('#task-list');
  const done = tasks.filter((task) => task.done).length;
  $('#task-completion').textContent = `${done} / ${tasks.length}`;
  $('#task-footer-copy').textContent = tasks.length ? 'A thoughtful plan leaves room to breathe.' : 'Add one small thing to begin.';
  root.innerHTML = tasks.map((task) => `<div class="task-row ${task.done ? 'is-done' : ''}" data-task-row="${escapeHTML(task.id)}">
    <button class="task-check" type="button" data-task-toggle="${escapeHTML(task.id)}" aria-label="${task.done ? 'Mark incomplete' : 'Complete'} ${escapeHTML(task.name)}" aria-pressed="${Boolean(task.done)}">${task.done ? '✓' : ''}</button>
    <span class="task-name">${escapeHTML(task.name)}</span>
    <button class="task-delete" type="button" data-task-delete="${escapeHTML(task.id)}" aria-label="Remove ${escapeHTML(task.name)}">×</button>
  </div>`).join('') || '<div class="tasks-empty">No tasks yet — add a small win.</div>';
}

function updatePriceRange(current) {
  const high = finite(snapshot?.high);
  const low = finite(snapshot?.low);
  const marker = $('#range-marker');
  marker.style.left = high !== null && low !== null && high > low && current !== null
    ? `${Math.max(3, Math.min(97, ((current - low) / (high - low)) * 100))}%`
    : '50%';
}

function formatChartTime(value) {
  const time = new Date(value);
  if (!Number.isFinite(time.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: settings.timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(time);
}

function renderChart(data) {
  const svg = $('#candle-chart');
  const bars = normalizeBars(data?.candles).slice(-40);
  const highLabel = $('#chart-high-label');
  const midLabel = $('#chart-mid-label');
  const lowLabel = $('#chart-low-label');
  $('#candle-count').textContent = bars.length ? `${bars.length} BARS` : 'OHLC N/A';
  if (bars.length < 2) {
    svg.innerHTML = `<text x="180" y="60" text-anchor="middle" fill="rgba(225,211,187,.54)" font-size="8" font-family="DM Mono,monospace">OHLC DATA N/A</text>`;
    highLabel.textContent = midLabel.textContent = lowLabel.textContent = 'N/A';
    $('#chart-start-time').textContent = '—';
    $('#chart-end-time').textContent = '—';
    return;
  }

  const rawHigh = Math.max(...bars.map((bar) => bar.high));
  const rawLow = Math.min(...bars.map((bar) => bar.low));
  const padding = Math.max((rawHigh - rawLow) * .12, rawHigh * .00012);
  const high = rawHigh + padding;
  const low = rawLow - padding;
  const range = Math.max(high - low, .001);
  const top = 5;
  const bottom = 105;
  const y = (price) => bottom - ((price - low) / range) * (bottom - top);
  const step = 360 / bars.length;
  const bodyWidth = Math.max(2, Math.min(5.3, step * .46));
  const lines = [16, 49, 82].map((yPos) => `<line x1="0" y1="${yPos}" x2="360" y2="${yPos}" stroke="rgba(235,220,196,.105)" stroke-width=".6" stroke-dasharray="2 4"/>`).join('');
  const candles = bars.map((bar, index) => {
    const x = step * index + step / 2;
    const openY = y(bar.open);
    const closeY = y(bar.close);
    const highY = y(bar.high);
    const lowY = y(bar.low);
    const bullish = bar.close >= bar.open;
    const isLatest = index === bars.length - 1;
    const color = isLatest ? '#dfc18a' : bullish ? '#9db09c' : '#b47d70';
    const wick = isLatest ? '#ead4ac' : color;
    const rectY = Math.min(openY, closeY);
    const rectHeight = Math.max(1.5, Math.abs(closeY - openY));
    return `<g opacity="${isLatest ? '.98' : '.83'}"><line x1="${x.toFixed(2)}" y1="${highY.toFixed(2)}" x2="${x.toFixed(2)}" y2="${lowY.toFixed(2)}" stroke="${wick}" stroke-width="${isLatest ? '1.1' : '.8'}"/><rect x="${(x - bodyWidth / 2).toFixed(2)}" y="${rectY.toFixed(2)}" width="${bodyWidth.toFixed(2)}" height="${rectHeight.toFixed(2)}" rx=".45" fill="${bullish ? color : 'rgba(180,125,112,.19)'}" stroke="${color}" stroke-width="${isLatest ? '1.05' : '.65'}"/>${isLatest ? `<circle cx="${x.toFixed(2)}" cy="${closeY.toFixed(2)}" r="2.1" fill="#f1e0c1"/>` : ''}</g>`;
  }).join('');
  const latestPriceY = y(bars.at(-1).close);
  const latestLine = `<line x1="0" y1="${latestPriceY.toFixed(2)}" x2="360" y2="${latestPriceY.toFixed(2)}" stroke="rgba(223,193,138,.3)" stroke-width=".6" stroke-dasharray="2 4"/>`;
  svg.innerHTML = `<title>${data.timeframe.toUpperCase()} XAUUSD candles · ${bars.length} bars</title>${lines}${latestLine}${candles}`;
  highLabel.textContent = formatChartPrice(rawHigh);
  midLabel.textContent = formatChartPrice((rawHigh + rawLow) / 2);
  lowLabel.textContent = formatChartPrice(rawLow);
  $('#chart-start-time').textContent = formatChartTime(bars[0].openTime);
  $('#chart-end-time').textContent = data.dataStatus === 'DEMO DATA' ? 'DEMO NOW' : formatChartTime(bars.at(-1).openTime);
}

function renderMarket(data) {
  const badge = $('#data-badge');
  const status = data?.dataStatus ?? 'DATA DELAYED';
  badge.className = `data-badge ${status === 'LIVE' ? 'live' : status === 'CACHED DATA' ? 'cached' : status === 'DATA DELAYED' ? 'delayed' : status === 'UNAVAILABLE' ? 'unavailable' : 'demo'}`;
  badge.querySelector('span').textContent = status;

  const price = finite(data?.price);
  const change = finite(data?.changePercent);
  $('#gold-price').textContent = price === null ? 'N/A' : `$${formatPrice(price)}`;
  const changeNode = $('#gold-change');
  changeNode.className = `gold-change ${change === null ? 'neutral' : change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}`;
  changeNode.innerHTML = `<span>${change === null ? 'N/A' : `${change > 0 ? '+' : ''}${change.toFixed(2)}%`}</span><small>DAY</small>`;

  if (!data) {
    $('#quote-status-copy').textContent = 'Gold data unavailable';
    $('#quote-updated').textContent = 'No cached quote';
    $('#source-label').textContent = 'NO MARKET DATA · RETRYING';
  } else if (data.dataStatus === 'DEMO DATA') {
    $('#quote-status-copy').textContent = 'Simulated market · do not trade';
    const age = Math.max(0, (Date.now() - Date.parse(data.timestamp)) / 1000);
    $('#quote-updated').textContent = `Updated ${formatAge(age)}`;
    $('#source-label').textContent = 'DEMO DATA · SIMULATED XAUUSD';
  } else {
    const age = finite(data.quoteAgeSeconds) ?? (Date.now() - Date.parse(data.timestamp)) / 1000;
    $('#quote-status-copy').textContent = data.marketStatus === 'closed' ? 'Market closed · last available quote' : data.dataStatus === 'LIVE' ? 'XAUUSD · provider quote' : 'Provider quote may be delayed';
    $('#quote-updated').textContent = `Updated ${formatAge(age)}`;
    $('#source-label').textContent = data.dataStatus === 'LIVE' ? 'LIVE FEED · BIQUOTE XAUUSD' : `${status} · BIQUOTE XAUUSD`;
  }

  $('#gold-high').textContent = data?.high == null ? 'N/A' : `$${formatPrice(data.high)}`;
  $('#gold-low').textContent = data?.low == null ? 'N/A' : `$${formatPrice(data.low)}`;
  updatePriceRange(price);
  renderChart(data);

  const trend = $('#indicator-trend');
  trend.textContent = data?.trend ? data.trend.toUpperCase() : 'N/A';
  trend.dataset.state = data?.trend ?? 'na';
  const vwap = finite(data?.vwap);
  $('#indicator-vwap').textContent = price === null || vwap === null ? 'N/A' : price > vwap ? 'ABOVE' : 'BELOW';
  $('#indicator-rsi').textContent = finite(data?.rsi) === null ? 'N/A' : String(Math.round(data.rsi));
  $('#indicator-volatility').textContent = data?.volatility ?? 'N/A';
  applyVisibility();
}

async function refreshMarket({ manual = false } = {}) {
  const requestId = ++marketRequestId;
  const button = $('#refresh-market');
  button.classList.add('is-loading');
  try {
    const next = await repository.getSnapshot(settings.dataMode, selectedTimeframe);
    if (requestId !== marketRequestId) return;
    snapshot = next;
    if (!next.isDemo) {
      const { bars, ...lightweight } = next;
      saveJSON(STORAGE.liveSnapshot, lightweight);
    }
    renderMarket(snapshot);
    if (manual) showToast(`${snapshot.dataStatus} · ${snapshot.symbol} ${snapshot.timeframe.toUpperCase()}`);
  } catch (error) {
    if (requestId !== marketRequestId) return;
    console.warn('Gold update failed:', error);
    if (settings.dataMode === 'live') {
      const cached = loadJSON(STORAGE.liveSnapshot, null);
      if (cached?.symbol === 'XAUUSD' && cached.timeframe === selectedTimeframe) {
        snapshot = { ...cached, dataStatus: 'DATA DELAYED', marketStatus: 'unknown', quoteAgeSeconds: Math.max(Number(cached.quoteAgeSeconds ?? 0), (Date.now() - Date.parse(cached.timestamp)) / 1000) };
      } else {
        snapshot = { symbol: 'XAUUSD', timeframe: selectedTimeframe, price: null, changePercent: null, high: null, low: null, candles: [], trend: null, rsi: null, vwap: null, volatility: 'N/A', dataStatus: 'UNAVAILABLE', dataMode: 'live', timestamp: new Date().toISOString() };
      }
      renderMarket(snapshot);
      if (manual) showToast('Free gold feed is unavailable. Showing cached data only when available.');
    }
  } finally {
    if (requestId === marketRequestId) button.classList.remove('is-loading');
  }
}

function planNextMarketRefresh() {
  clearTimeout(marketTimer);
  const delay = settings.showGold ? (REFRESH_MS[settings.battery] ?? REFRESH_MS.balanced) : 60000;
  marketTimer = setTimeout(async () => {
    if (!document.hidden && settings.showGold) await refreshMarket();
    planNextMarketRefresh();
  }, delay);
}

function applyVisibility() {
  $('#calendar-panel').hidden = !settings.showCalendar;
  $('#schedule-panel').hidden = !settings.showSchedule;
  $('#planner-grid').hidden = !settings.showCalendar && !settings.showSchedule;
  $('#planner-grid').dataset.single = String(settings.showCalendar !== settings.showSchedule);
  $('#gold-module').hidden = !settings.showGold;
  $('#price-reading').hidden = !settings.showPrice;
  $('#gold-change').hidden = !settings.showChange;
  $('#day-range-row').hidden = !settings.showHighLow;
  $('#chart-wrap').hidden = !settings.showChart;
  $('#market-controls').hidden = !settings.showChart;
  $('#snapshot-strip').hidden = !settings.showTrend && !settings.showRsi && !settings.showVwap && !settings.showVolatility;
  $('.snapshot-item[data-indicator="trend"]').hidden = !settings.showTrend;
  $('.snapshot-item[data-indicator="rsi"]').hidden = !settings.showRsi;
  $('.snapshot-item[data-indicator="vwap"]').hidden = !settings.showVwap;
  $('.snapshot-item[data-indicator="volatility"]').hidden = !settings.showVolatility;
  $('#year-progress').hidden = !settings.showYear;
  $('#task-panel').hidden = !settings.showTasks;
  $('#session-pill').hidden = !settings.showSessions;
  $('#footer-session').hidden = !settings.showSessions;
}

function resolveAppearance() {
  if (settings.appearance !== 'system') return settings.appearance;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function applySettings({ save = true } = {}) {
  const shell = $('#device-shell');
  shell.dataset.theme = resolveAppearance();
  shell.style.setProperty('--clock-size', `${settings.clockSize}px`);
  shell.style.setProperty('--clock-opacity', (Number(settings.clockOpacity ?? 100) / 100).toFixed(2));
  shell.style.setProperty('--wallpaper-brightness', (Number(settings.wallpaperBrightness) / 100).toFixed(2));
  shell.style.setProperty('--wallpaper-intensity', (Number(settings.wallpaperIntensity) / 100).toFixed(2));
  shell.style.setProperty('--gold-intensity', (Number(settings.goldIntensity) / 100).toFixed(2));
  shell.style.setProperty('--chart-opacity', (Number(settings.chartOpacity) / 100).toFixed(2));
  $('#hero-clock').dataset.font = settings.clockFont;
  $('#clock-zone').dataset.position = settings.clockPosition;
  const controls = {
    'setting-appearance': settings.appearance,
    'setting-clock-format': settings.clockFormat,
    'setting-clock-font': settings.clockFont,
    'setting-clock-size': settings.clockSize,
    'setting-clock-opacity': settings.clockOpacity,
    'setting-clock-position': settings.clockPosition,
    'setting-timezone': settings.timeZone,
    'setting-wallpaper-brightness': settings.wallpaperBrightness,
    'setting-wallpaper-intensity': settings.wallpaperIntensity,
    'setting-gold-intensity': settings.goldIntensity,
    'setting-chart-opacity': settings.chartOpacity,
    'setting-data-mode': settings.dataMode,
    'setting-battery': settings.battery,
    'setting-default-timeframe': settings.timeframe,
    'setting-reminder-time': settings.reminderTime,
  };
  for (const [id, value] of Object.entries(controls)) {
    const control = $(`#${id}`);
    if (control) control.value = String(value);
  }
  $$('[data-setting-toggle]').forEach((input) => { input.checked = Boolean(settings[input.dataset.settingToggle]); });
  $('#setting-daily-reminder').checked = Boolean(settings.dailyReminder);
  $('#clock-size-value').textContent = `${settings.clockSize} px`;
  $('#clock-opacity-value').textContent = `${settings.clockOpacity}%`;
  $('#wallpaper-brightness-value').textContent = `${settings.wallpaperBrightness}%`;
  $('#wallpaper-intensity-value').textContent = `${settings.wallpaperIntensity}%`;
  $('#gold-intensity-value').textContent = `${settings.goldIntensity}%`;
  $('#chart-opacity-value').textContent = `${settings.chartOpacity}%`;
  if (save) saveJSON(STORAGE.settings, settings);
  renderClock();
  applyVisibility();
}

function openSettings() {
  const dialog = $('#settings-dialog');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}
function openQuickDialog(mode) {
  quickMode = mode;
  const isTask = mode === 'task';
  $('#quick-overline').textContent = isTask ? 'TODAY · PERSONAL LIST' : 'TODAY · PERSONAL PLAN';
  $('#quick-title').textContent = isTask ? 'Add a task' : 'Add a moment';
  $('#quick-name-label').textContent = isTask ? 'Task' : 'Event';
  $('#quick-name').placeholder = isTask ? 'e.g. Review my trading journal' : 'e.g. London open review';
  $('#quick-time-field').hidden = isTask;
  $('#quick-name').value = '';
  if (typeof $('#quick-dialog').showModal === 'function') $('#quick-dialog').showModal();
  else $('#quick-dialog').setAttribute('open', '');
  setTimeout(() => $('#quick-name').focus(), 50);
}
function closeDialog(dialog) {
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
}
function submitQuickForm(event) {
  event.preventDefault();
  const name = $('#quick-name').value.trim();
  if (!name) return;
  if (quickMode === 'task') {
    tasks.push({ id: makeId('task'), name, done: false });
    saveJSON(STORAGE.tasks, tasks);
    renderTasks();
    showToast('Task saved on this device.');
  } else {
    const time = $('#quick-time').value || '15:00';
    const kind = /gold|trade|market|xau|london|new york/i.test(name) ? 'gold' : 'focus';
    schedule.push({ id: makeId('event'), time, name, kind });
    saveJSON(STORAGE.schedule, schedule);
    renderSchedule();
    renderCalendar();
    showToast('Moment added to today’s plan.');
  }
  closeDialog($('#quick-dialog'));
}

function setDataMode(mode) {
  if (!['demo', 'live'].includes(mode)) return;
  settings.dataMode = mode;
  saveJSON(STORAGE.settings, settings);
  snapshot = null;
  refreshMarket();
  showToast(mode === 'demo' ? 'DEMO DATA · simulated candles are on.' : 'Connecting to the free XAUUSD feed…');
}

function handleSettingChange(event) {
  const target = event.target;
  if (target.matches('[data-setting-toggle]')) {
    settings[target.dataset.settingToggle] = target.checked;
    applySettings();
    if (target.dataset.settingToggle === 'showGold') {
      if (target.checked) refreshMarket();
      planNextMarketRefresh();
    }
    return;
  }
  if (target.id === 'setting-daily-reminder') {
    void setDailyReminder(target.checked);
    return;
  }
  if (target.id === 'setting-reminder-time') {
    settings.reminderTime = target.value || '08:45';
    saveJSON(STORAGE.settings, settings);
    planDailyReminder();
    return;
  }
  const mapping = {
    'setting-appearance': 'appearance', 'setting-clock-format': 'clockFormat', 'setting-clock-font': 'clockFont',
    'setting-clock-size': 'clockSize', 'setting-clock-opacity': 'clockOpacity', 'setting-clock-position': 'clockPosition', 'setting-timezone': 'timeZone',
    'setting-wallpaper-brightness': 'wallpaperBrightness', 'setting-wallpaper-intensity': 'wallpaperIntensity',
    'setting-gold-intensity': 'goldIntensity', 'setting-chart-opacity': 'chartOpacity', 'setting-data-mode': 'dataMode',
    'setting-battery': 'battery', 'setting-default-timeframe': 'timeframe',
  };
  const key = mapping[target.id];
  if (!key) return;
  settings[key] = ['clockSize', 'clockOpacity', 'wallpaperBrightness', 'wallpaperIntensity', 'goldIntensity', 'chartOpacity'].includes(key) ? Number(target.value) : target.value;
  applySettings();
  if (key === 'timeZone') {
    const parts = zonedParts();
    calendarCursor = { year: parts.year, month: parts.month - 1 };
    renderCalendar();
    renderSchedule();
    renderYearProgress(new Date(), parts);
    planDailyReminder();
  }
  if (key === 'dataMode') setDataMode(settings.dataMode);
  if (key === 'timeframe') setSelectedTimeframe(settings.timeframe);
  if (key === 'battery') planNextMarketRefresh();
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function bindEvents() {
  $('#open-settings').addEventListener('click', openSettings);
  $('#floating-settings').addEventListener('click', openSettings);
  $('#close-settings').addEventListener('click', () => closeDialog($('#settings-dialog')));
  $('#settings-dialog').addEventListener('click', (event) => { if (event.target === $('#settings-dialog')) closeDialog($('#settings-dialog')); });
  $('#settings-dialog').addEventListener('change', handleSettingChange);
  $('#settings-dialog').addEventListener('input', (event) => {
    if (event.target.matches('input[type="range"]')) handleSettingChange(event);
  });
  $('#reset-settings').addEventListener('click', () => {
    settings = { ...DEFAULT_SETTINGS };
    saveJSON(STORAGE.settings, settings);
    selectedTimeframe = '5m';
    setSelectedTimeframe('5m');
    applySettings();
    renderMarket(snapshot);
    planNextMarketRefresh();
    planDailyReminder();
    showToast('Dashboard settings reset.');
  });

  $('#previous-month').addEventListener('click', () => {
    calendarCursor.month -= 1;
    if (calendarCursor.month < 0) { calendarCursor.month = 11; calendarCursor.year -= 1; }
    renderCalendar();
  });
  $('#next-month').addEventListener('click', () => {
    calendarCursor.month += 1;
    if (calendarCursor.month > 11) { calendarCursor.month = 0; calendarCursor.year += 1; }
    renderCalendar();
  });
  $('#add-task').addEventListener('click', () => openQuickDialog('task'));
  $('#add-event').addEventListener('click', () => openQuickDialog('event'));
  $('#edit-plan').addEventListener('click', () => {
    editingPlan = !editingPlan;
    renderSchedule();
    if (!editingPlan) showToast('Routine changes are saved locally.');
  });
  $('#close-quick').addEventListener('click', () => closeDialog($('#quick-dialog')));
  $('#quick-dialog').addEventListener('click', (event) => { if (event.target === $('#quick-dialog')) closeDialog($('#quick-dialog')); });
  $('#quick-form').addEventListener('submit', submitQuickForm);
  $('#task-list').addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-task-toggle]');
    const remove = event.target.closest('[data-task-delete]');
    if (toggle) {
      const task = tasks.find((item) => item.id === toggle.dataset.taskToggle);
      if (task) task.done = !task.done;
      saveJSON(STORAGE.tasks, tasks);
      renderTasks();
    } else if (remove) {
      tasks = tasks.filter((item) => item.id !== remove.dataset.taskDelete);
      saveJSON(STORAGE.tasks, tasks);
      renderTasks();
    }
  });
  $('#schedule-list').addEventListener('click', (event) => {
    const remove = event.target.closest('[data-delete-event]');
    if (!remove) return;
    schedule = schedule.filter((item) => item.id !== remove.dataset.deleteEvent);
    saveJSON(STORAGE.schedule, schedule);
    renderSchedule();
    renderCalendar();
  });
  $('#timeframe-picker').addEventListener('click', (event) => {
    const button = event.target.closest('[data-timeframe]');
    if (!button || !TIMEFRAME_META[button.dataset.timeframe]) return;
    setSelectedTimeframe(button.dataset.timeframe);
  });
  $('#refresh-market').addEventListener('click', () => refreshMarket({ manual: true }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      renderClock();
      refreshMarket();
      planNextMarketRefresh();
    } else {
      clearTimeout(marketTimer);
    }
  });
  window.addEventListener('online', () => { if (settings.dataMode === 'live') refreshMarket(); });
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => {
    if (settings.appearance === 'system') applySettings({ save: false });
  });
}

function setSelectedTimeframe(timeframe) {
  if (!TIMEFRAME_META[timeframe]) return;
  selectedTimeframe = timeframe;
  settings.timeframe = timeframe;
  saveJSON(STORAGE.settings, settings);
  $$('#timeframe-picker button').forEach((button) => {
    const selected = button.dataset.timeframe === timeframe;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  refreshMarket();
}

function init() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Offline shell unavailable:', error));
  }
  const parts = zonedParts();
  calendarCursor = { year: parts.year, month: parts.month - 1 };
  bindEvents();
  renderCalendar();
  renderSchedule();
  renderTasks();
  applySettings();
  renderClock();
  setSelectedTimeframe(settings.timeframe);
  window.setInterval(() => {
    const now = new Date();
    renderClock(now);
    if (zonedParts(now).second === 0) renderSchedule(now);
  }, 1000);
  planNextMarketRefresh();
  planDailyReminder();
}

init();
