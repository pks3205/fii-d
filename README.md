# Operator OI Tracker 📊

An Android app + web app that decodes the daily **NSE "Participant wise Open Interest"**
report into simple Hindi/English market commentary — based on the smart‑money reading
method popularised by Amit Dhamija.

Upload the daily NSE file → the app parses Client / DII / FII / Pro positions,
computes net positions, today's buying/selling, a 3‑day trend, and a rule‑based
market bias.

> ⚠️ **Disclaimer:** Educational / data‑organisation tool only. Signals are **not**
> investment advice. 90%+ of F&O traders lose money (SEBI). Trade at your own risk.

---

## ✨ Features
- 📤 Upload NSE `Participant wise Open Interest` file (`.xlsx` / `.csv`)
- 🧭 **Market Bias** gauge (Bullish / Bearish / Volatile / Range)
- 🔎 **Decoded signals** in easy Hindi + English (Retail trap, Pro gap‑predictor, FII positional trend, Nike‑curve)
- 📊 **Two tables**: Net positions + "Positions Bought/Sold Today" (green/red)
- 📈 **3‑day rolling trend** per participant
- 🎯 Scenario **Path** illustration (clearly labelled — not a forecast)
- 🗂️ Local **history** of every uploaded day (works offline)

---

## 📱 Get the APK (no local setup needed)

The APK is built automatically in the cloud by GitHub Actions.

1. Go to the repo's **Actions** tab → run **"Build Android APK"** (auto‑runs on push).
2. When it finishes, download `OperatorOI-Tracker-APK` from the run's **Artifacts**,
   or grab it from the **Releases** page (tag `apk-latest`).
3. On your phone: allow "Install unknown apps", open the APK, tap **Install**.

---

## 🖥️ Run the web app locally
```bash
npm install
npm run dev      # http://localhost:5173
```

## 🔨 Build the APK yourself (needs JDK 21 + Android SDK)
```bash
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🧠 How the decoding works
| Rule | Trigger | Meaning |
|---|---|---|
| Client Contrarian | Retail heavily long calls/futures, short puts | Upside capped / retail trap |
| Pro Gap Predictor | Pro aggressively buys puts today | Possible gap‑down next session |
| FII Positional | FII net short futures (3‑day) | Sell‑on‑rise positional trend |
| Nike‑Curve | FII cautious + Pro short‑term long | Gap‑down → SL hunt → sharp reclaim |

DII data is ignored for bias (mostly arbitrage/hedging).

## 🏗️ Tech
Vite + React (web) · Capacitor (native Android wrapper) · SheetJS (xlsx/csv parsing) · localStorage (history).
