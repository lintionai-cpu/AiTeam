from __future__ import annotations

import asyncio
from dataclasses import asdict
from typing import Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CONFIG
from .market_data import DataStore, MarketDataService


app = FastAPI(title="Deriv MT5 Signal Engine", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

store = DataStore()
service = MarketDataService(store)


@app.on_event("startup")
async def startup() -> None:
    await service.start()


@app.on_event("shutdown")
async def shutdown() -> None:
    await service.stop()


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/symbols")
async def symbols() -> Dict[str, List[str]]:
    return {"symbols": CONFIG.symbols}


@app.get("/account")
async def account() -> Dict[str, object]:
    if store.account is None:
        return {"status": "disconnected"}
    return {
        "status": "connected",
        "account": asdict(store.account),
        "risk_profile": asdict(store.risk_profile),
    }


@app.get("/state/{symbol}/{timeframe}")
async def state(symbol: str, timeframe: int) -> Dict[str, object]:
    snapshot = await store.snapshot()
    symbol_state = snapshot.get(symbol, {})
    frame_state = symbol_state.get(timeframe)
    if frame_state is None:
        return {"status": "unavailable"}
    return {
        "status": "ok",
        "symbol": symbol,
        "timeframe": timeframe,
        "last_price": frame_state.last_price,
        "indicators": asdict(frame_state.indicators),
        "signals": [asdict(signal) for signal in frame_state.signals],
        "candles": [
            {
                "timestamp": candle.timestamp.isoformat(),
                "open": candle.open,
                "high": candle.high,
                "low": candle.low,
                "close": candle.close,
                "volume": candle.volume,
            }
            for candle in frame_state.candles
        ],
    }


@app.get("/signals")
async def signals() -> Dict[str, object]:
    snapshot = await store.snapshot()
    response: Dict[str, object] = {"signals": []}
    for symbol, frames in snapshot.items():
        for timeframe, frame_state in frames.items():
            response["signals"].extend(
                [
                    {
                        **asdict(signal),
                        "timeframe": timeframe,
                        "symbol": symbol,
                    }
                    for signal in frame_state.signals
                ]
            )
    return response


@app.get("/stream")
async def stream() -> Dict[str, object]:
    snapshot = await store.snapshot()
    payload = {}
    for symbol, frames in snapshot.items():
        payload[symbol] = {
            timeframe: {
                "last_price": state.last_price,
                "signals": [asdict(signal) for signal in state.signals],
            }
            for timeframe, state in frames.items()
        }
    return payload


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
