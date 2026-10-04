# GOLD OS — Premium Android Trader Theme

GOLD OS is a portrait-first dashboard prototype that blends a warm dark wallpaper, a large clock, a monthly calendar, an editable local day plan, year progress, a small task list, and a miniature XAUUSD candlestick terminal.

## Run the visual prototype

Requires Node.js 18 or newer; no npm packages need installing.

```bash
npm start
```

Open `http://localhost:4173`. The responsive preview is intentionally phone-shaped on desktop. On Android Chrome, the hosted preview can be installed as a home-screen PWA using **Install app** / **Add to Home screen**.

## Demo and live market data

- The default mode is **DEMO DATA**. It creates 40 simulated OHLC candles and simulated indicators. The badge stays visible so demo values are never presented as real prices.
- Choose **LIVE FEED** in Theme settings to request XAUUSD quotes and candles from BiQuote's public no-key API. Timeframes are 1m, 5m, 15m and 1h; the default is 5m.
- A live quote becomes **CACHED DATA** when the provider reports the market closed, **DATA DELAYED** when the quote is stale, and **N/A** when there is no valid value. Live quote refresh follows the Battery saver / Balanced / Fast Market setting and pauses while the page is backgrounded.
- VWAP is calculated only if the provider supplies non-zero traded volume. No made-up live VWAP, RSI or session values are shown.

The public feed is subject to provider availability, symbol coverage and latency. Verify all prices with your broker; GOLD OS is informational and not a trading signal or financial advice.

## Optional reminder

The web prototype includes an opt-in daily intention notification. It asks for browser permission and uses the selected time zone; browser notification timers are best-effort and only run while the dashboard remains available. It does not claim to provide reliable background alarms or market alerts.

## Android architecture source

An Android Studio project lives under `android/` and separates Compose UI, market-data providers, repository/cache, WorkManager refresh, a Glance widget and a static-art wallpaper service. The artwork is deliberately static: Android wallpapers cannot be relied on to stream financial data. The app/widget market state is separate.

The Arena environment used for the browser preview does not include Java or the Android SDK, so an APK cannot be compiled or verified here. The web preview is working; the Kotlin project is source only until built on an Android SDK machine.

## Tests

```bash
npm test
```
