# Deriv Options Auto Trader (Mobile-first)

## Architecture Summary
- `src/api/derivClient.js`: resilient Deriv websocket wrapper (reconnect/backoff, heartbeat, resubscribe, mock feed).
- `src/data/candles/candleEngine.js`: rolling candle aggregation for 1m/3m/5m from ticks.
- `src/indicators/index.js`: EMA, SMA, MACD, RSI, stochastic, VWAP primitives.
- `src/strategies/index.js`: seven switchable strategies + duplicate-per-candle guard.
- `src/risk/riskManager.js`: risk gating (drawdown, loss streaks, max open trades, volatility).
- `src/execution/tradeExecutor.js`: paper/live execution orchestration + martingale integration.
- `src/store/store.js`: event-driven single source of truth.
- `src/ui/*`: batched dashboard rendering.

## Setup
1. Copy `.env.example` to `.env` and set token if needed.
2. Start static app:
   ```bash
   npm run start
   ```
3. Open `http://localhost:4173`.

## Testing
```bash
npm test
```

## Mock vs Live
- Default mode is mock (`DEFAULT_MODE=mock`) for safety.
- Live mode requires explicit confirmation from UI and should only be used with proper credentials.

## Operations playbook
See `docs/operations-playbook.md`.

## Config schema
See `docs/config-schema.md`.
