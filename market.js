export const TIMEFRAMES = Object.freeze([
  { id: '1m', label: '1 minute', interval: '1m', seconds: 60 },
  { id: '5m', label: '5 minutes', interval: '5m', seconds: 5 * 60 },
  { id: '15m', label: '15 minutes', interval: '15m', seconds: 15 * 60 },
  { id: '1h', label: '1 hour', interval: '1h', seconds: 60 * 60 },
]);

const API_BASE = 'https://biquote.io/api';
const BAR_COUNT = 40;

export class MarketDataProvider {
  async getSnapshot() {
    throw new Error('MarketDataProvider.getSnapshot must be implemented.');
  }
}

export class GoldPriceProvider extends MarketDataProvider {
  async getSnapshot() {
    throw new Error('GoldPriceProvider.getSnapshot must be implemented.');
  }
}

export function normalizeBars(input) {
  if (!Array.isArray(input)) return [];
  const normalized = input.flatMap((bar) => {
    if (!bar || typeof bar !== 'object') return [];
    const rawTime = bar.openTime ?? bar.time ?? bar.timestamp ?? bar.date;
    const openTime = typeof rawTime === 'number' ? rawTime : Date.parse(rawTime);
    const open = Number(bar.open);
    const high = Number(bar.high);
    const low = Number(bar.low);
    const close = Number(bar.close);
    if (!Number.isFinite(openTime) || ![open, high, low, close].every(Number.isFinite)) return [];
    if (high < low || high < Math.max(open, close) || low > Math.min(open, close)) return [];
    const volume = Number(bar.volume);
    return [{
      openTime,
      open,
      high,
      low,
      close,
      volume: Number.isFinite(volume) && volume > 0 ? volume : 0,
      tickVolume: Number.isFinite(Number(bar.tickVolume)) ? Number(bar.tickVolume) : 0,
      isOpen: bar.isOpen === true || bar.isOpen === 'true',
    }];
  });
  const unique = new Map();
  for (const bar of normalized) unique.set(bar.openTime, bar);
  return [...unique.values()].sort((a, b) => a.openTime - b.openTime);
}

export function calculateEma(values, period) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  const multiplier = 2 / (period + 1);
  let result = valid[0];
  for (let index = 1; index < valid.length; index += 1) result = valid[index] * multiplier + result * (1 - multiplier);
  return result;
}

export function calculateRsi(values, period = 14) {
  const valid = values.filter(Number.isFinite);
  if (valid.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const delta = valid[index] - valid[index - 1];
    gains += Math.max(delta, 0);
    losses += Math.max(-delta, 0);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;
  for (let index = period + 1; index < valid.length; index += 1) {
    const delta = valid[index] - valid[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(delta, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-delta, 0)) / period;
  }
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  const relativeStrength = averageGain / averageLoss;
  return 100 - (100 / (1 + relativeStrength));
}

export function calculateVwap(bars) {
  const valid = bars.filter((bar) => bar.volume > 0);
  const volumeTotal = valid.reduce((sum, bar) => sum + bar.volume, 0);
  if (!volumeTotal) return null;
  return valid.reduce((sum, bar) => sum + ((bar.high + bar.low + bar.close) / 3) * bar.volume, 0) / volumeTotal;
}

export function analyzeBars(input) {
  const bars = normalizeBars(input);
  if (bars.length < 5) {
    return { trend: 'neutral', rsi: null, vwap: null, volatility: 'N/A', ema20: null, ema50: null, bars };
  }
  const closes = bars.map((bar) => bar.close);
  const ema20 = calculateEma(closes, 20);
  const ema50 = calculateEma(closes, 50);
  const last = closes.at(-1);
  let trend = 'neutral';
  if (last > ema20 && ema20 > ema50) trend = 'bullish';
  else if (last < ema20 && ema20 < ema50) trend = 'bearish';

  const windows = bars.slice(-20);
  const ranges = windows.map((bar) => bar.close > 0 ? (bar.high - bar.low) / bar.close : 0).filter(Number.isFinite);
  const averageRange = ranges.length ? ranges.reduce((sum, item) => sum + item, 0) / ranges.length : 0;
  const lastRange = ranges.at(-1) ?? 0;
  const volatilityRatio = averageRange > 0 ? lastRange / averageRange : 1;
  const volatility = volatilityRatio > 1.5 ? 'HIGH' : volatilityRatio < 0.65 ? 'LOW' : 'NORMAL';

  return {
    trend,
    rsi: calculateRsi(closes),
    vwap: calculateVwap(bars),
    volatility,
    ema20,
    ema50,
    bars,
  };
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function timeframeSeed(timeframe) {
  return [...timeframe].reduce((sum, character) => sum + character.charCodeAt(0), 7129);
}

export class DemoGoldPriceProvider extends GoldPriceProvider {
  constructor({ now = () => Date.now() } = {}) {
    super();
    this.now = now;
  }

  async getSnapshot(timeframe = '5m') {
    const definition = TIMEFRAMES.find((item) => item.id === timeframe) ?? TIMEFRAMES[1];
    const now = this.now();
    const intervalMs = definition.seconds * 1000;
    const currentOpenTime = Math.floor(now / intervalMs) * intervalMs;
    const random = seededRandom(timeframeSeed(definition.id));
    const historical = [];
    let previousClose = 4180.35 + (random() - 0.5) * 5;
    const historyCount = BAR_COUNT - 1;

    for (let index = 0; index < historyCount; index += 1) {
      const wave = Math.sin(index * 0.49) * 1.65 + Math.sin(index * 0.17 + 1.2) * 1.2;
      const drift = index * 0.028;
      const open = previousClose;
      const close = 4178.8 + drift + wave + (random() - 0.5) * 0.7;
      const wickUp = 0.42 + random() * 1.15;
      const wickDown = 0.38 + random() * 1.08;
      historical.push({
        openTime: currentOpenTime - (historyCount - index) * intervalMs,
        open,
        high: Math.max(open, close) + wickUp,
        low: Math.min(open, close) - wickDown,
        close,
        volume: 95 + random() * 255,
        tickVolume: 180 + random() * 500,
        isOpen: false,
      });
      previousClose = close;
    }

    const secondsIntoBar = (now - currentOpenTime) / 1000;
    const tinyPulse = Math.sin(now / 51000) * 0.23 + Math.cos(now / 37000) * 0.12;
    const lastOpen = historical.at(-1)?.close ?? previousClose;
    const currentClose = lastOpen + tinyPulse;
    const lastBar = {
      openTime: currentOpenTime,
      open: lastOpen,
      high: Math.max(lastOpen, currentClose) + Math.abs(tinyPulse) * 0.55 + 0.18,
      low: Math.min(lastOpen, currentClose) - Math.abs(tinyPulse) * 0.45 - 0.17,
      close: currentClose,
      volume: 40 + Math.min(secondsIntoBar, definition.seconds) * 0.42,
      tickVolume: 64 + Math.min(secondsIntoBar, definition.seconds) * 0.7,
      isOpen: true,
    };
    const bars = [...historical, lastBar];
    const analysis = analyzeBars(bars);
    const high = Math.max(...bars.map((bar) => bar.high)) + 8.7;
    const low = Math.min(...bars.map((bar) => bar.low)) - 9.2;
    const dayChange = 0.38 + Math.sin(now / 270000) * 0.07;

    return {
      symbol: 'XAUUSD',
      timeframe: definition.id,
      price: currentClose,
      changePercent: dayChange,
      high,
      low,
      candles: bars,
      timestamp: new Date(now).toISOString(),
      quoteAgeSeconds: 0,
      marketStatus: 'open',
      dataStatus: 'DEMO DATA',
      dataMode: 'demo',
      isDemo: true,
      ...analysis,
    };
  }
}

async function requestJSON(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) {
      let message = `Market feed returned ${response.status}`;
      try {
        const error = await response.json();
        message = error.message ?? error.error ?? message;
      } catch {
        // Keep the HTTP status fallback.
      }
      throw new Error(message);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export class BiQuoteGoldPriceProvider extends GoldPriceProvider {
  constructor({ fetcher = requestJSON, now = () => Date.now() } = {}) {
    super();
    this.fetcher = fetcher;
    this.now = now;
  }

  async getSnapshot(timeframe = '5m') {
    const definition = TIMEFRAMES.find((item) => item.id === timeframe) ?? TIMEFRAMES[1];
    const candleUrl = new URL(`${API_BASE}/XAUUSD/ohlc`);
    candleUrl.searchParams.set('interval', definition.interval);
    candleUrl.searchParams.set('limit', String(BAR_COUNT));
    const [quote, candles] = await Promise.all([
      this.fetcher(`${API_BASE}/XAUUSD?allowStale=true`),
      this.fetcher(candleUrl.toString()),
    ]);
    const bars = normalizeBars(candles.bars);
    const price = Number(quote.mid ?? quote.price);
    if (!Number.isFinite(price) || price <= 0 || bars.length < 5) throw new Error('Gold quote or candles are unavailable.');

    const quoteTime = Date.parse(quote.timestamp ?? quote.lastQuoteAt ?? quote.lastQuoteAt);
    const providerAge = Number(quote.quoteAgeSeconds ?? 0);
    const localAge = Number.isFinite(quoteTime) ? Math.max(0, (this.now() - quoteTime) / 1000) : 0;
    const quoteAgeSeconds = Math.max(providerAge, localAge);
    const closed = String(quote.marketState ?? '').toLowerCase() === 'closed';
    const delayed = quote.stale === true || quoteAgeSeconds > 90;
    const dataStatus = closed ? 'CACHED DATA' : delayed ? 'DATA DELAYED' : 'LIVE';
    const analysis = analyzeBars(bars);

    return {
      symbol: 'XAUUSD',
      timeframe: definition.id,
      price,
      changePercent: Number.isFinite(Number(quote.dayDiffPercent)) ? Number(quote.dayDiffPercent) : null,
      high: Number.isFinite(Number(quote.high)) ? Number(quote.high) : null,
      low: Number.isFinite(Number(quote.low)) ? Number(quote.low) : null,
      candles: bars,
      timestamp: Number.isFinite(quoteTime) ? new Date(quoteTime).toISOString() : new Date(this.now()).toISOString(),
      quoteAgeSeconds,
      marketStatus: closed ? 'closed' : 'open',
      dataStatus,
      dataMode: 'live',
      isDemo: false,
      ...analysis,
    };
  }
}

export class GoldMarketRepository {
  constructor({ demoProvider = new DemoGoldPriceProvider(), liveProvider = new BiQuoteGoldPriceProvider() } = {}) {
    this.providers = { demo: demoProvider, live: liveProvider };
  }

  getSnapshot(mode, timeframe) {
    const provider = this.providers[mode] ?? this.providers.demo;
    return provider.getSnapshot(timeframe);
  }
}
