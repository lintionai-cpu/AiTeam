# Master Coding Prompt: Deriv Options Auto-Trading Web App (HTML + Real-Time Engine)

Use this prompt with a coding model to generate a production-grade **mobile-first web app** that can monitor Deriv markets in real time and automate options trade execution from validated strategy signals.

---

## 1) Role and Mission

You are a senior full-stack engineer and quantitative trading systems developer.

Build a **modern responsive HTML web app** that connects to a Deriv Options account through a **stable, persistent, low-latency streaming architecture**, continuously ingests market data (derived indices + gold), computes indicators/signals on **1m / 3m / 5m** candles, and executes automated trades under strict risk controls.

The app must prioritize:
- Real-time responsiveness (no visible lag in UI or signal engine)
- Fault tolerance and reconnection reliability
- Accurate multi-timeframe strategy processing
- Safe order execution controls
- Auditability (history, logs, signal trace)

---

## 2) Critical Constraints

1. **Use Deriv’s official APIs only** (WebSocket/API docs) and implement robust reconnect/session recovery.
2. The app must continue collecting and organizing data for **all tracked markets** even when one “focus market” is selected for trading.
3. Support live parameter updates without app restart.
4. Implement a **Reset** action that resets bot state/config/session metrics **without clearing cached market price/candle datasets**.
5. Separate “signal generation” from “trade execution” with clear interfaces.
6. Include **paper-trading/simulation mode** and require explicit toggle for live trading.
7. Never hardcode API tokens; use secure client/server configuration handling.

---

## 3) Tech Stack Requirements

Implement with:
- **Frontend:** HTML5, CSS3, TypeScript, React (or Vanilla TS if explicitly requested), responsive mobile-first UI
- **Charts:** Lightweight Charts or TradingView widget integration
- **State:** Zustand/Redux (or equivalent predictable state container)
- **Backend gateway (recommended):** Node.js + TypeScript (WebSocket relay, auth-safe execution orchestration)
- **Data transport:** WebSocket streaming + heartbeat/health checks
- **Storage:** IndexedDB (local cache for candles/signals), optional SQLite/Postgres for server logs
- **Testing:** Vitest/Jest for unit tests, Playwright/Cypress for E2E, latency + reconnection integration tests

If a pure static HTML app is requested, still structure code in modular layers and clearly mark unavoidable browser-only limitations.

---

## 4) System Architecture (Must Implement)

Design as modular services:

1. **Connection Manager**
   - Persistent WebSocket lifecycle
   - Exponential backoff reconnect
   - Jitter, heartbeat ping/pong, stale-connection detection
   - Auto resubscribe to market streams after reconnect

2. **Market Data Engine**
   - Subscribe to all selected derived indices + gold symbols
   - Maintain tick stream and OHLCV candle builders for 1m/3m/5m
   - Keep rolling windows for indicators and pattern detection

3. **Indicator Engine**
   - EMA (2, 9, 20, 29, 50)
   - MACD (standard + custom 5,13,1)
   - RSI(3), Stochastic fast
   - VWAP
   - Swing highs/lows and support/resistance helpers
   - Relative/session average volume calculations

4. **Strategy Engine**
   - Multi-market, multi-timeframe concurrent evaluation
   - Independent strategy toggles
   - Unified signal schema: `{market, timeframe, strategy, direction, confidence, reason, timestamp}`
   - Debounce duplicate signals and handle signal cooldown windows

5. **Execution Engine**
   - Live/paper mode switch
   - Validates signal + risk before order placement
   - Handles stake, duration, run limits, and order lifecycle
   - Tracks active positions, PnL, and closure events

6. **Risk Manager**
   - Global on/off switch
   - Parameters: max loss, min win, max win, consecutive losses, session stop, per-market limits
   - Smart martingale module with independent on/off + params
   - Kill switch and daily/session circuit breakers

7. **UI Dashboard**
   - Account overview, balance, session KPIs
   - Live market grid (all symbols, all 3 timeframes)
   - Focus market selector (without halting background analysis)
   - Active trades panel
   - Detailed trade history with filters/export
   - Strategy/indicator toggles and parameter forms

8. **Persistence & Logs**
   - Persist settings profiles
   - Immutable trade journal entries
   - Signal-to-trade traceability log
   - Reconnection and error telemetry

---

## 5) Functional Requirements

### A) Real-Time Data + Focus Market Behavior
- Continuously process all configured markets (derived indices + gold) on 1m/3m/5m.
- Allow “focus market” switch for primary execution target.
- Keep collecting signals from non-focus markets in parallel.
- Display market status, last candle update, stream health, and latency estimates.

### B) Adjustable Execution Parameters
Implement UI + runtime config for:
- Stake
- Trade run count
- Max win / min win / max loss
- Market and focus timeframe
- Duration type and value (ticks/seconds/minutes)
- Strategy and indicator toggles
- Session behavior (auto-stop, auto-resume policy)

### C) Reset Behavior
Reset must clear:
- Session counters
- Strategy internal runtime states
- Trade queue and pending execution intents
- Risk/martingale runtime accumulators

Reset must preserve:
- Market price stream cache
- Candle data cache (1m/3m/5m)

### D) History + Active Trades
- Active trades table with status transitions in real time
- Detailed historical trades with search/filter/date range/export (CSV)
- Include strategy name, signal rationale, entry/exit, duration, result, and risk snapshot

---

## 6) Strategy Definitions (Exact Rules to Implement)

Implement each strategy as a pluggable module with strict rule checks and explainable signal output.

### Baseline Strategy A: EMA Crossover + Candle Close
- EMA 9 crossing EMA 29
- **Buy:** crossover up + candle close above cross context
- **Sell:** crossover down + candle close below cross context

### Baseline Strategy B: MACD SMA Line Cross vs EMA 2 Context
- MACD SMA line crossing condition aligned with EMA 2 and candle close confirmation
- **Buy:** candle close above cross context
- **Sell:** candle close below cross context

### Strategy 1: Pin Bar Rejection Scalp (3m primary, 1m timing)
- Pin bar wick ≥ 2x body
- At support/resistance, EMA confluence, or swing point
- Bullish: long on break of pin-bar high; SL 1 tick below low; TP 2–3R/next resistance
- Bearish: short on break of pin-bar low; SL 1 tick above high; TP 2–3R/next support
- Prefer higher volume rejection and higher timeframe trend alignment

### Strategy 2: Engulfing Momentum Fade (1m with 5m context)
- Full engulfing body over prior 3–5 candles context
- Bearish engulfing at resistance -> short next open; SL above high; TP 50–61.8% retrace
- Bullish engulfing at support -> long next open; SL below low; TP 50–61.8% retrace
- Filters: ~3x average time-of-day volume + S/R or EMA(20/50) cluster

### Strategy 3: Inside Bar Breakout Scalp (5m primary, 1m execution)
- Inside bar fully within mother bar range
- Bullish break above mother high; SL below inside low; TP 50–100% mother range projection
- Bearish break below mother low; SL above inside high; TP same projection
- Filters: low inside-bar volume + high breakout volume + optional 1m pullback entry

### Strategy 4: Reversal Doji + MACD Divergence (3m)
- Doji/spinning top at extreme levels
- Bullish divergence: price LL + MACD HL, long above doji high, SL below doji low, TP prior swing high/2R
- Bearish divergence: price HH + MACD LH, short below doji low, SL above doji high, TP prior swing low/2R
- Confirmation: histogram turning toward trade direction + 1m momentum alignment

### Strategy 5: Volume Spike Exhaustion Candle (1m/3m)
- Volume spike 5–10x session average
- Large range candle with weak close/long wick at key level (VWAP/pivot/day high-low)
- Exhaustion top: weak follow-through below midpoint -> short, SL above spike high, TP VWAP/gap
- Exhaustion bottom: strong follow-through above midpoint -> long, SL below spike low, TP VWAP/gap

---

## 7) Signal Arbitration & Trade Decision Logic

Implement a deterministic policy:
1. Compute all enabled strategies per market/timeframe.
2. Score signals (example factors: trend alignment, volume confirmation, volatility regime, recent win rate).
3. If multiple signals conflict on same market, apply precedence rules:
   - Higher timeframe confirmation > lower timeframe only
   - Stronger volume-validated setup wins
   - Risk manager may veto all
4. Execute only if:
   - Market is tradable
   - Session/risk limits allow
   - No duplicate in cooldown window

---

## 8) Non-Functional Requirements

- Target update loop latency under 250ms for dashboard refresh and under 100ms internal signal cycle where feasible.
- Handle packet drops and reconnect without data corruption.
- Use typed interfaces and strict TypeScript.
- Add structured logs with event types (`CONNECTION`, `SIGNAL`, `ORDER`, `RISK`, `ERROR`).
- Provide graceful degradation when volume data is unavailable.

---

## 9) Security, Compliance, and Safety

- Add explicit disclaimer screen: educational tooling, user responsible for compliance.
- Enforce secrets handling: tokens from environment/secure vault only.
- Optional 2-step confirmation for enabling live auto-trading.
- Emergency “Stop Trading Now” button must immediately block new entries.
- Record all auto-trade decisions for audit.

---

## 10) UI/UX Requirements

- Mobile-first responsive layout with bottom navigation tabs:
  - Dashboard
  - Markets
  - Strategies
  - Risk
  - Trades
  - Settings
- Real-time badges: connection state, mode (paper/live), risk state
- One-tap toggles for strategy/risk/martingale
- Focus market quick switcher with persistent background scanning indicator
- Dark theme and high-contrast accessibility support

---

## 11) Deliverables Expected from the Coding Model

Return:
1. Full project folder structure
2. Core TypeScript interfaces/types
3. Connection manager implementation with reconnection
4. Candle aggregation engine (1m/3m/5m)
5. Indicator + all strategy modules
6. Execution + risk + martingale modules
7. Responsive frontend pages/components
8. Local run instructions
9. Test suite (unit/integration/E2E)
10. Example `.env.example` and safe config docs

Also provide a “Phase Plan”:
- Phase 1: Data connectivity and dashboard
- Phase 2: Indicators and strategies
- Phase 3: Execution + risk controls
- Phase 4: Hardening, telemetry, and QA

---

## 12) Acceptance Criteria Checklist

- [ ] Stable real-time streaming with auto-reconnect + resubscribe
- [ ] Accurate 1m/3m/5m candle building for all configured markets
- [ ] All listed strategies implemented with toggles and parameter controls
- [ ] Focus market execution while background analysis continues for others
- [ ] Working risk manager + martingale + emergency stop
- [ ] Detailed active trades and historical logs with signal rationale
- [ ] Reset behavior preserves price/candle data but resets runtime/session state
- [ ] Mobile-responsive UI with clear performance and connection status
- [ ] Paper/live mode safety switch and audit logging

---

## 13) Optional Enhancements ("covering this and more")

- Strategy backtesting module on historical candles
- Walk-forward validation and Monte Carlo risk simulation
- Signal quality analytics dashboard (precision/recall by market/timeframe)
- Portfolio-level exposure manager across correlated indices
- Push notifications (trade open/close/risk halt)
- Multi-profile presets (scalp/aggressive/conservative)
- Offline-first local replay mode for debugging strategy behavior

---

## 14) Final Instruction to Coding Model

Now generate the full implementation plan and starter code for this system, beginning with architecture and typed interfaces, then build each module in the order that minimizes integration risk. Include tests for each module and example mock streams so the app can run in simulation mode before connecting to live Deriv endpoints.
