from __future__ import annotations

import importlib
import importlib.util
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from .models import Candle


@dataclass
class AccountInfo:
    balance: float
    equity: float
    margin_free: float
    leverage: int


class MT5Client:
    def __init__(self, login: int, password: str, server: str) -> None:
        self._login = login
        self._password = password
        self._server = server
        self._mt5 = importlib.import_module("MetaTrader5")

    def connect(self) -> bool:
        return self._mt5.initialize(login=self._login, password=self._password, server=self._server)

    def shutdown(self) -> None:
        self._mt5.shutdown()

    def account_info(self) -> Optional[AccountInfo]:
        info = self._mt5.account_info()
        if info is None:
            return None
        return AccountInfo(
            balance=info.balance,
            equity=info.equity,
            margin_free=info.margin_free,
            leverage=info.leverage,
        )

    def latest_tick(self, symbol: str) -> Optional[float]:
        tick = self._mt5.symbol_info_tick(symbol)
        if tick is None:
            return None
        return tick.last

    def rates(self, symbol: str, timeframe_minutes: int, count: int) -> List[Candle]:
        timeframe_map = {
            1: self._mt5.TIMEFRAME_M1,
            3: self._mt5.TIMEFRAME_M3,
            5: self._mt5.TIMEFRAME_M5,
            15: self._mt5.TIMEFRAME_M15,
        }
        timeframe = timeframe_map[timeframe_minutes]
        utc_to = datetime.utcnow()
        rates = self._mt5.copy_rates_from(symbol, timeframe, utc_to, count)
        candles = []
        if rates is None:
            return candles
        for rate in rates:
            candles.append(
                Candle(
                    timestamp=datetime.fromtimestamp(rate["time"]),
                    open=rate["open"],
                    high=rate["high"],
                    low=rate["low"],
                    close=rate["close"],
                    volume=rate["tick_volume"],
                )
            )
        return candles


class MockMT5Client:
    def __init__(self) -> None:
        self._prices: Dict[str, float] = {}

    def connect(self) -> bool:
        return True

    def shutdown(self) -> None:
        return None

    def account_info(self) -> AccountInfo:
        balance = 1000.0
        return AccountInfo(
            balance=balance,
            equity=balance * 1.01,
            margin_free=balance * 0.8,
            leverage=1000,
        )

    def latest_tick(self, symbol: str) -> float:
        base = self._prices.get(symbol, random.uniform(100, 300))
        new_price = base + random.uniform(-0.5, 0.5)
        self._prices[symbol] = new_price
        return new_price

    def rates(self, symbol: str, timeframe_minutes: int, count: int) -> List[Candle]:
        now = datetime.utcnow()
        candles: List[Candle] = []
        price = self._prices.get(symbol, random.uniform(100, 300))
        for idx in range(count):
            timestamp = now - timedelta(minutes=timeframe_minutes * (count - idx))
            drift = random.uniform(-1.0, 1.0)
            open_price = price
            close_price = price + drift
            high_price = max(open_price, close_price) + random.uniform(0.0, 0.8)
            low_price = min(open_price, close_price) - random.uniform(0.0, 0.8)
            volume = random.uniform(100, 2000)
            candles.append(
                Candle(
                    timestamp=timestamp,
                    open=open_price,
                    high=high_price,
                    low=low_price,
                    close=close_price,
                    volume=volume,
                )
            )
            price = close_price
        self._prices[symbol] = price
        return candles


def mt5_available() -> bool:
    return importlib.util.find_spec("MetaTrader5") is not None
