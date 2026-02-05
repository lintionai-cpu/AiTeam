# Deriv Options Automated Trading Web App

Production-oriented browser app (HTML/CSS/JS) with:

- Persistent Deriv WebSocket connectivity with heartbeat + reconnect + resubscribe.
- Parallel market ingestion for derived indices + Gold.
- Multi-timeframe candle aggregation (1m/3m/5m) using in-memory ring buffers.
- Modular strategy engine with on/off toggles for 7 required strategies.
- Focus market execution model (analyze all, execute only selected focus market).
- Trade execution with debounce and retry-safe handling.
- Risk manager + smart martingale with reset semantics preserving market streams.

## Structure

- `index.html` — dashboard shell and control panels
- `src/main.js` — app bootstrap, event flow, UI bindings
- `src/config.js` — markets, timeframes, constants
- `src/core/` — event bus, ring buffer, Deriv client
- `src/data/` — tick ingestion + candle aggregation
- `src/indicators/` — indicator math utilities
- `src/strategies/` — switchable strategy engine + required strategies
- `src/execution/` — order execution pipeline
- `src/risk/` — risk manager + martingale logic
- `src/state/` — in-memory UI/trading state
- `src/ui/` — rendering helpers

## Run

Serve the folder from any static server (module imports require HTTP origin), for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

> Use your own Deriv `app_id` and API token in the Connection panel.
