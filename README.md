# Deriv MT5 Signal Engine

A Python-based signal engine that maintains a persistent MT5 connection (or a mock stream), monitors volatility/boom/crash indices plus gold, calculates multi-timeframe indicators, and emits strategy signals with adaptive risk guidance.

## Features
- Persistent MT5 connection with a mock fallback for local development.
- Real-time polling of volatility indices, boom/crash indices, and XAUUSD.
- 1m/3m/5m/15m indicator calculations (EMA, MACD) with strategy-driven signal generation.
- Adaptive risk profile generation based on account balance size.
- REST endpoints for account status, symbols, per-timeframe state, and aggregated signals.

## Quickstart
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

The API will be available at `http://localhost:8000`.

## Configuration
Environment variables:
- `USE_MOCK_MT5=true|false` to control the mock fallback (default: true).
- `MT5_LOGIN`, `MT5_PASSWORD`, `MT5_SERVER` for live MT5 connections.

## Example Requests
```bash
curl http://localhost:8000/health
curl http://localhost:8000/symbols
curl http://localhost:8000/account
curl http://localhost:8000/state/"Volatility 75 Index"/5
curl http://localhost:8000/signals
```
