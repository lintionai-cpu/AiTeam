# Coding Prompt: Build a Real-Time Deriv Options Auto-Trading Web App

Use this prompt with an AI coding assistant to generate a production-grade web app specification and implementation plan.

## Role and Objective
You are a senior full-stack engineer and quantitative systems architect.
Design and implement a **modern responsive HTML web app** that connects to a Deriv options account and runs **low-latency automated trading** for derived indices and gold markets.

The system must support:
- Real-time account and market streaming.
- Multi-timeframe analytics (1m, 3m, 5m).
- Strategy-driven signal generation across all tracked markets.
- Automated execution with strict risk controls.
- Mobile-first dashboard UX.

---

## Critical Compliance and Safety Requirements (Must Enforce)
1. **Do not hardcode credentials.** Use environment variables and secure secret storage.
2. **Respect Deriv API terms and rate limits.** Build throttling and retry with backoff.
3. **Implement a paper/simulation mode first**, and make live mode opt-in with explicit confirmation.
4. **Add a trading kill switch** (global on/off) that immediately stops new orders.
5. **Risk defaults must be conservative** and bounded by validation rules.
6. **Every order action must be auditable** via immutable logs (timestamp, market, strategy, reason, request, response).
7. **No promises of profit** in UI text or docs.

---

## Product Requirements

### 1) Data and Connectivity Layer
Build a stable and persistent real-time connection architecture for:
- Deriv account updates.
- Trade history and active contracts.
- Tick/price streaming.
- Candlestick feeds for all configured derived indices and gold markets.
- Timeframes: **1 minute, 3 minutes, 5 minutes**.

Technical expectations:
- WebSocket connection manager with heartbeat, reconnect, resume/subscription restore.
- Connection status machine: `CONNECTED`, `DEGRADED`, `RECONNECTING`, `DISCONNECTED`.
- Per-stream latency tracking and stale-data detection.
- In-memory ring buffers + optional local persistence for candles and signal state.

### 2) Strategy Engine and Signal Pipeline
Implement a modular strategy framework where each strategy can be toggled on/off independently.

Required built-in strategies:
1. **EMA Crossover + Candle Close**
   - EMA 9 crossing EMA 29.
   - Buy: crossover bullish + candle close above cross context.
   - Sell: crossover bearish + candle close below cross context.

2. **MACD SMA Line Crossing EMA 2 + Candle Close Filter**
   - Detect MACD-SMA crossing EMA2 logic as provided.
   - Buy/Sell with candle-close directional confirmation.

3. **Pin Bar Rejection Scalp (3m primary, 1m execution assist)**
   - Pin bar wick >= 2x body.
   - Support/resistance or EMA/swing confluence.
   - Entry/SL/TP logic exactly as provided.
   - Optional volume confirmation.

4. **Engulfing Momentum Fade (1m primary, 5m context)**
   - Engulfing body over prior 3–5 candles.
   - RSI(3) / stochastic extreme context.
   - Entry/SL/TP retracement logic.
   - Volume and S/R or EMA-cluster filter.

5. **Inside Bar Breakout Scalp (5m primary, 1m execution)**
   - Inside bar + mother bar logic.
   - Momentum-context filter.
   - Breakout confirmation with volume profile.

6. **Reversal Doji + MACD Divergence (3m)**
   - Doji/spinning top at extreme.
   - Bullish/bearish divergence conditions.
   - Histogram turn confirmation.

7. **Volume Spike Exhaustion Candle (1m/3m + VWAP)**
   - Volume spike threshold (5–10x session average).
   - Exhaustion wick behavior at key levels.
   - Confirmation candle requirement.

Signal pipeline requirements:
- Analyze **all monitored markets simultaneously** on 1m/3m/5m.
- Compute strategy scores and confidence.
- Deduplicate conflicting signals.
- Route execution priority to a user-selected **focus market** while still monitoring all others.
- Preserve non-focus signals in queue/log for analytics.

### 3) Trade Execution Layer
Create an execution engine with adjustable parameters:
- Stake.
- Trade run count.
- Max win / min win / max loss.
- Market.
- Focus timeframe.
- Trade duration (ticks, seconds, minutes).
- Slippage/latency guardrails.

Behavior:
- Execute only when market, timeframe, strategy, and risk checks all pass.
- Enforce cooldown windows after losses/wins if configured.
- Prevent duplicate order submissions for same signal id.

### 4) Smart Risk Manager + Martingale Module
Provide independent on/off switches and parameter controls.

Risk manager capabilities:
- Session loss cap.
- Per-trade risk cap.
- Max consecutive losses.
- Max simultaneous trades.
- Dynamic stake adjustment based on volatility and drawdown state.

Martingale capabilities:
- Controlled multiplier.
- Max step depth.
- Auto-reset rules after win or threshold hit.
- Hard stop protections to avoid runaway exposure.

### 5) Reset and Control Behavior
Implement reset semantics:
- Reset should clear strategy state, counters, execution queues, PnL session stats, and UI controls.
- Reset must **NOT erase current market price data or candle history buffers**.

### 6) UI/UX Requirements (Mobile-First)
Build a modern responsive interface with:
- Real-time account dashboard (balance, PnL, connection health).
- Active trades panel.
- Detailed trade history table with filter/search/export.
- Market grid with live prices and per-timeframe signal state.
- Strategy toggles + parameter forms.
- Risk manager and martingale control cards.
- Focus market switcher with seamless handoff.
- Live event log/alerts stream.

### 7) Architecture and Code Quality
Use a clean modular architecture:
- `core/ws` (connectivity)
- `core/market-data`
- `core/indicators`
- `core/strategies`
- `core/signals`
- `core/risk`
- `core/execution`
- `state/store`
- `ui/components`
- `ui/views`

Expectations:
- Strong typing (TypeScript preferred).
- Unit tests for indicators/strategy conditions/risk math.
- Integration tests for stream->signal->execution flow.
- Performance profiling for multi-market real-time loop.
- Structured logging and error telemetry.

---

## Non-Functional Requirements
- End-to-end action latency target: under 250ms on stable connection.
- Graceful degradation under packet loss.
- Reconnect and state recovery within 3 seconds when possible.
- CPU and memory efficiency for simultaneous multi-market analysis.

---

## Deliverables Required from the Coding Assistant
1. Detailed system design (modules, data flow, state machines).
2. API integration plan for Deriv WebSocket endpoints.
3. Database/storage schema for logs, trade history, and settings.
4. Indicator and strategy pseudocode + production code skeleton.
5. Risk/martingale algorithms with guardrails.
6. UI wireframe-level component map.
7. Step-by-step build plan with milestones.
8. Test plan (unit, integration, soak, failover, paper trading validation).
9. Deployment plan (staging + production), monitoring and rollback.
10. A final checklist for “paper-trade ready” and “live-trade ready”.

---

## Output Format You Must Follow
Return your answer using these exact sections:
1. **Assumptions & Constraints**
2. **High-Level Architecture**
3. **Data Model**
4. **Real-Time Stream Design**
5. **Strategy Engine Design**
6. **Risk & Martingale Design**
7. **Execution Orchestration**
8. **UI/UX Structure (Mobile-first)**
9. **Implementation Roadmap (Phased)**
10. **Testing & Validation Plan**
11. **Security, Compliance & Operational Risk Notes**
12. **Sample Config Files + Example JSON Payloads**
13. **Definition of Done**

Also include:
- At least one sequence diagram in Mermaid.
- At least one state machine diagram in Mermaid.
- Example TypeScript interfaces for core domain models.
- A table mapping each strategy to exact trigger/confirmation/exit rules.

---

## Extra Enhancements (Cover This and More)
If feasible, include:
- A/B strategy performance comparator.
- Walk-forward optimization workflow.
- Replay mode for historical candles.
- Explainable signal trace (“why this trade fired”).
- Anomaly detection for feed gaps/spikes.
- Optional notification hooks (Telegram/email/webhook).
- Multi-profile presets (conservative/balanced/aggressive).

