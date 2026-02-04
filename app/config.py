from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass(frozen=True)
class AppConfig:
    symbols: List[str] = field(
        default_factory=lambda: [
            "Volatility 10 Index",
            "Volatility 25 Index",
            "Volatility 50 Index",
            "Volatility 75 Index",
            "Volatility 100 Index",
            "Boom 500 Index",
            "Boom 1000 Index",
            "Crash 500 Index",
            "Crash 1000 Index",
            "XAUUSD",
        ]
    )
    timeframes_minutes: Tuple[int, ...] = (1, 3, 5, 15)
    polling_interval_seconds: float = 1.0
    use_mock_mt5: bool = os.getenv("USE_MOCK_MT5", "true").lower() == "true"


CONFIG = AppConfig()
