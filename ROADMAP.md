# Operator OI Tracker — Roadmap & Decisions (NO BUILD until user says GO)

_Last updated: 2026-08-23. This file is the shared memory of what to build next._

---

## A. FIXES REQUESTED (do these first when we build)

1. **Remove all "delete data" options** — user uploads daily, wants permanent
   historical data inside the app. Remove: 🗑️ "सब मिटाएँ" toolbar button, and
   per-day 🗑️ delete in Days list. Keep data forever (raise cap from 60 → e.g. 400 days).
   - File(s): `src/App.jsx` (clear-all button), `src/App.jsx` DaysList delete btn,
     `src/lib/store.js` (`clearAll`, `deleteBundle` — keep functions but unwire from UI,
     or remove). Keep a hidden/settings-only reset maybe.

2. **Share / CSV / PDF all broken:**
   - PDF button opens a BLANK browser tab. Cause: `window.open('', '_blank')` +
     `document.write` is blocked inside the Capacitor Android WebView (and some
     mobile browsers). FIX: use `@capacitor/share` + `@capacitor/filesystem` to
     write a real file and open the native share sheet. For PDF, generate a real
     PDF client-side with **jsPDF** (add dep) and share/save it — do NOT rely on
     `window.print()` in the WebView.
   - CSV "not generating": the `<a download>` blob trick often fails in Android
     WebView too. Same fix: write file via Filesystem plugin, then Share.
   - Plan: add `@capacitor/share`, `@capacitor/filesystem`, `jspdf`,
     `jspdf-autotable`. Web fallback = blob download (works in desktop browser).

---

## B. MAKE THE PATH PREDICTOR MORE REALISTIC

Current Path is a hard-coded illustrative curve. Upgrade it to be **data-driven**:

- Anchor the path to **real levels**: spot proxy, max-pain, top OI support/resistance
  (we already parse these from Option Chain / bhavcopy).
- Compute an **Expected Range** for next session = spot ± (ATM straddle price) OR
  spot ± (India-VIX-implied 1-day move). NSE option chain pages publish an
  "Expected Range" using ATM IV — replicate: `1-day move ≈ Spot × IV × sqrt(1/365)`.
- Draw the path as a **cone/band** (probable range) not a single line:
  - center line = drift toward max-pain (gravity) blended with confluence bias
  - upper/lower band = expected range
  - mark max-pain as a dotted "magnet" line
- Overlay actual S/R walls so the path visibly reacts (stalls at resistance,
  bounces at support).
- Keep the honest "illustration, not forecast" label.

---

## C. WHAT MORE DATA / METRICS RAISE ACCURACY & "कल क्या होगा"
(Backed by research — sources noted)

### C1. FII Long-Short Ratio (index futures)  ⭐ HIGH VALUE
- Ratio = FII idx-fut long OI ÷ short OI. We already have both numbers in
  Participant OI, so **compute it for free**.
- Reading (from stockezee / moneycontrol / business-standard):
  - >1.5 strongly long (uptrends), 0.8–1.5 neutral, <0.5 heavily short.
  - **Day-over-day CHANGE matters more than absolute level.**
  - **Extremes are contrarian**: ratio <15% (≈0.15) has historically preceded
    "limited downside / short-covering bounce" (SBI Securities, Moneycontrol).
- Add: LSR gauge + multi-day LSR trend line + extreme-reversal alert.

### C2. FII Cash vs Futures confirmation matrix  ⭐ HIGH VALUE
- The single most reliable read: **do cash flow and futures positioning agree?**
  - Cash SELL + Futures SHORT = genuine directional bearish (high conviction).
  - Cash BUY + Futures SHORT = **hedging, NOT bearish** (avoid false bear signal).
  - (niftytrader "Cash × Index Futures Matrix"; sahi.com; quintalmind.)
- Requires re-adding **FII/DII cash** as a source (user removed it earlier — ask
  before re-adding; it's page-based download, less convenient, but high value).

### C3. Max Pain  ⭐ HIGH VALUE (needs Option Chain / bhavcopy — we have it)
- Compute from strike-wise OI: for each strike X,
  writer_loss(X)=Σ_calls(max(0,X−K)·CallOI_K)+Σ_puts(max(0,K−X)·PutOI_K);
  max-pain = strike with MIN total writer loss. (stoxra/stockmojo formula.)
- Reading:
  - Price tends to gravitate to max-pain into expiry (magnet), esp. last 2–3
    sessions, VIX<18, within ~1–2% distance.
  - Spot vs max-pain table: >2% above = bullish momentum; ±0.5% = pinned/range;
    >2% below = bearish. (stockmojo distance table.)
  - **Max-pain MIGRATION over the week** = conviction: rising = bullish writers,
    falling = bearish. (stockmojo, stoxra.)
- Add: max-pain value, distance-from-spot reading, and max-pain migration line
  (extend the Level Migration chart).

### C4. Change-in-OI buildup classification  ⭐ HIGH VALUE (needs 2 days OI or bhavcopy ChgOI)
- Classic 4 states from ΔPrice × ΔOI:
  - Price↑ OI↑ = Long buildup (bullish)
  - Price↓ OI↑ = Short buildup (bearish)
  - Price↑ OI↓ = Short covering (weak bullish)
  - Price↓ OI↓ = Long unwinding (weak bearish)
- We can do this per instrument once we store daily price (add a tiny "spot close"
  input, or read it from bhavcopy futures row). (plindia, PL Capital.)

### C5. PCR (already have) + PCR change + strike-wise PCR
- Total PCR + **change-in-OI PCR** (more sensitive). Extremes contrarian:
  >1.3 bullish-ish but watch unwinding; <0.7 bearish-ish but breakout=short cover.
- Strike PCR to grade each S/R wall's strength. (niftytrader PCR guide.)

### C6. Expected Range / IV band (needs India VIX or ATM IV)
- 1-day expected move ≈ Spot × VIX/100 × sqrt(1/365). Draw as the Path band (see B).
- User earlier removed VIX; it's small but powerful for the range cone — ask before re-adding.

### C7. OI Value in ₹ (not just contracts)
- Multiply net contracts × lot size × price → ₹ notional, so "how big" is clear.
  Lot sizes change; keep a small editable lot-size table (NIFTY, BANKNIFTY, FINNIFTY).

### C8. Rollover data (expiry week)  — MEDIUM
- % of positions rolled to next series near expiry. High rollover + longs =
  bullish continuation; high rollover + shorts = bearish continuation. Needs
  two-series OI (bhavcopy has all expiries). Advanced; later.

### C9. Stock-level long/short buildup scanner — MEDIUM
- From bhavcopy: stocks with biggest OI% increase + price up = long buildup;
  price down = short buildup (business-standard daily F&O cues format).
- Gives a daily "hot stocks" list beyond index.

---

## D. HONESTY GUARDRAILS (keep in every predictive feature)
- FII/DII data is **1-day lagged & provisional**; it's a **context/bias layer,
  not a timing trigger** (every source stresses this).
- Institutional shorts are often **hedges**, not bearish bets — always cross-check
  cash vs futures before calling bearish.
- Max pain = **gravitational hint, not a guarantee**; fails on event days
  (RBI/Budget/results), VIX>18, or >2–3% distance.
- Retail is **not always wrong**; contrarian reads are probabilistic.
- Always show: "Educational only, not investment advice. 90%+ F&O traders lose (SEBI)."

---

## E. NICE-TO-HAVE / POLISH
- Daily auto-snapshot reminder (local notification at ~7:45 PM) via
  `@capacitor/local-notifications`.
- Onboarding / help screen explaining each metric in Hindi.
- Settings: lot sizes, thresholds, days-to-keep.
- Backtest/accuracy log: store each day's predicted bias, compare to next day's
  actual spot move, show a running hit-rate (honest self-scoring).

---

## F. PRIORITISED BUILD ORDER (proposed — user to confirm)
1. Fixes: remove delete options; fix Share/CSV/PDF (native share + jsPDF).
2. FII Long-Short Ratio (free from existing data) + extreme-reversal alert.
3. Max Pain + distance reading + max-pain migration line.
4. Realistic Path: expected-range cone + max-pain magnet + S/R walls.
5. Change-in-OI buildup classification (needs daily spot/price input).
6. Cash×Futures matrix + IV range cone (only if user re-adds cash & VIX).
7. Backtest accuracy log.
8. Polish: notifications, help, settings, stock buildup scanner.
