import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BiQuoteGoldPriceProvider,
  DemoGoldPriceProvider,
  GoldMarketRepository,
  TIMEFRAMES,
  analyzeBars,
  calculateEma,
  calculateRsi,
  calculateVwap,
  normalizeBars,
} from './market.js';

function makeBars(count = 50, { volume = 0 } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const center = 2000 + index * 0.65 + Math.sin(index * Math.PI / 4) * 4;
    const open = center - 0.25;
    const close = center + 0.25;
    return {
      openTime: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
      open,
      high: center + 1.2,
      low: center - 1.2,
      close,
      volume,
      isOpen: false,
    };
  });
}

test('timeframes include 1m, 5m, 15m and 1h with a five-minute default', () => {
  assert.deepEqual(TIMEFRAMES.map((item) => item.id), ['1m', '5m', '15m', '1h']);
  assert.equal(TIMEFRAMES[1].interval, '5m');
});

test('normalizeBars sorts, de-duplicates and drops malformed OHLC records', () => {
  const bars = normalizeBars([
    { openTime: '2026-01-01T02:00:00Z', open: 3, high: 4, low: 2, close: 3.5 },
    { openTime: '2026-01-01T01:00:00Z', open: 2, high: 3, low: 1, close: 2.5 },
    { openTime: '2026-01-01T02:00:00Z', open: 3, high: 5, low: 2, close: 4 },
    { openTime: 'invalid', open: 2, high: 3, low: 1, close: 2 },
    { openTime: '2026-01-01T03:00:00Z', open: 3, high: 2, low: 4, close: 3 },
  ]);
  assert.equal(bars.length, 2);
  assert.ok(bars[0].openTime < bars[1].openTime);
  assert.equal(bars[1].high, 5);
});

test('EMA and RSI return expected values for simple series', () => {
  assert.equal(calculateEma([7, 7, 7, 7], 3), 7);
  assert.equal(calculateRsi(Array.from({ length: 20 }, (_, index) => index + 1)), 100);
});

test('VWAP stays unavailable without volume and uses weighted OHLC when present', () => {
  const noVolume = normalizeBars(makeBars(3));
  assert.equal(calculateVwap(noVolume), null);
  const bars = normalizeBars([
    { openTime: '2026-01-01T00:00:00Z', open: 10, high: 12, low: 8, close: 10, volume: 1 },
    { openTime: '2026-01-01T01:00:00Z', open: 20, high: 22, low: 18, close: 20, volume: 3 },
  ]);
  assert.equal(calculateVwap(bars), 17.5);
});

test('demo provider creates forty realistic, explicitly labelled demo candles', async () => {
  const now = Date.UTC(2026, 9, 3, 12, 30);
  const provider = new DemoGoldPriceProvider({ now: () => now });
  const snapshot = await provider.getSnapshot('5m');
  assert.equal(snapshot.dataStatus, 'DEMO DATA');
  assert.equal(snapshot.isDemo, true);
  assert.equal(snapshot.candles.length, 40);
  assert.equal(snapshot.candles.at(-1).isOpen, true);
  assert.ok(snapshot.price > 3000);
  assert.ok(snapshot.high > snapshot.low);
  assert.ok(snapshot.rsi >= 0 && snapshot.rsi <= 100);
  assert.ok(snapshot.vwap > 0);
});

test('live provider labels fresh, closed and delayed data correctly and does not invent VWAP', async () => {
  const now = Date.UTC(2026, 9, 3, 12, 30);
  const bars = makeBars(45).map((bar) => ({ ...bar, volume: 0 }));
  const makeProvider = (quote) => new BiQuoteGoldPriceProvider({
    now: () => now,
    fetcher: async (url) => url.includes('/ohlc')
      ? { symbol: 'XAUUSD', interval: '5m', bars }
      : quote,
  });
  const freshQuote = {
    symbol: 'XAUUSD', mid: 4182.6, dayDiffPercent: 0.38, high: 4205, low: 4151,
    timestamp: new Date(now - 15000).toISOString(), quoteAgeSeconds: 15, marketState: 'open', stale: false,
  };
  const fresh = await makeProvider(freshQuote).getSnapshot('5m');
  assert.equal(fresh.dataStatus, 'LIVE');
  assert.equal(fresh.price, 4182.6);
  assert.equal(fresh.vwap, null);

  const closed = await makeProvider({ ...freshQuote, marketState: 'closed', stale: true, quoteAgeSeconds: 3600 }).getSnapshot('5m');
  assert.equal(closed.dataStatus, 'CACHED DATA');

  const delayed = await makeProvider({ ...freshQuote, quoteAgeSeconds: 400 }).getSnapshot('5m');
  assert.equal(delayed.dataStatus, 'DATA DELAYED');
});

test('market repository defaults to clearly labelled demo mode', async () => {
  const repository = new GoldMarketRepository();
  const snapshot = await repository.getSnapshot('demo', '5m');
  assert.equal(snapshot.dataStatus, 'DEMO DATA');
});

test('technical snapshot exposes a real EMA-based direction and keeps VWAP N/A without volume', () => {
  const result = analyzeBars(makeBars(60));
  assert.equal(result.trend, 'bullish');
  assert.equal(result.vwap, null);
  assert.ok(result.ema20 > result.ema50);
});
