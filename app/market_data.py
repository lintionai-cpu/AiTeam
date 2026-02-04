from __future__ import annotations

import asyncio
import contextlib
import os
from collections import defaultdict
from typing import Dict, List, Optional

from .config import CONFIG
from .indicators import ema, macd
from .models import Candle, IndicatorSnapshot, MarketState
from .mt5_client import AccountInfo, MockMT5Client, MT5Client, mt5_available
from .risk_manager import risk_profile_for_balance
from .strategies import generate_signals


class DataStore:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self.market: Dict[str, Dict[int, MarketState]] = defaultdict(dict)
        self.account: Optional[AccountInfo] = None
        self.risk_profile = risk_profile_for_balance(0.0)

    async def update_market(self, symbol: str, timeframe: int, state: MarketState) -> None:
        async with self._lock:
            self.market[symbol][timeframe] = state

    async def update_account(self, account: AccountInfo) -> None:
        async with self._lock:
            self.account = account
            self.risk_profile = risk_profile_for_balance(account.balance)

    async def snapshot(self) -> Dict[str, Dict[int, MarketState]]:
        async with self._lock:
            return {symbol: dict(frames) for symbol, frames in self.market.items()}


class MarketDataService:
    def __init__(self, store: DataStore) -> None:
        self._store = store
        self._task: Optional[asyncio.Task[None]] = None
        self._running = False
        self._client = self._init_client()

    def _init_client(self) -> MT5Client | MockMT5Client:
        if CONFIG.use_mock_mt5 or not mt5_available():
            return MockMT5Client()
        login = int(os.getenv("MT5_LOGIN", "0"))
        password = os.getenv("MT5_PASSWORD", "")
        server = os.getenv("MT5_SERVER", "")
        return MT5Client(login=login, password=password, server=server)

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._client.connect()
        self._task = asyncio.create_task(self._poll_loop())

    async def stop(self) -> None:
        if not self._running:
            return
        self._running = False
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        self._client.shutdown()

    async def _poll_loop(self) -> None:
        while self._running:
            account_info = self._client.account_info()
            if account_info is not None:
                await self._store.update_account(account_info)
            for symbol in CONFIG.symbols:
                tick = self._client.latest_tick(symbol)
                for timeframe in CONFIG.timeframes_minutes:
                    candles = self._client.rates(symbol, timeframe, 120)
                    if not candles:
                        continue
                    closes = [c.close for c in candles]
                    ema_fast = ema(closes, 9)
                    ema_slow = ema(closes, 26)
                    macd_line, signal_line, hist = macd(closes)
                    indicators = IndicatorSnapshot(
                        ema_fast=ema_fast,
                        ema_slow=ema_slow,
                        macd=macd_line,
                        macd_signal=signal_line,
                        macd_hist=hist,
                    )
                    signals = generate_signals(symbol, timeframe, candles, indicators)
                    state = MarketState(
                        last_price=tick,
                        candles=candles[-30:],
                        indicators=indicators,
                        signals=signals,
                    )
                    await self._store.update_market(symbol, timeframe, state)
            await asyncio.sleep(CONFIG.polling_interval_seconds)
