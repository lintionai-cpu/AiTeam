from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Candle:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass(frozen=True)
class IndicatorSnapshot:
    ema_fast: Optional[float]
    ema_slow: Optional[float]
    macd: Optional[float]
    macd_signal: Optional[float]
    macd_hist: Optional[float]


@dataclass(frozen=True)
class Signal:
    symbol: str
    timeframe_minutes: int
    strategy: str
    direction: str
    confidence: float
    created_at: datetime
    metadata: Dict[str, float]


@dataclass
class MarketState:
    last_price: Optional[float]
    candles: List[Candle]
    indicators: IndicatorSnapshot
    signals: List[Signal]
