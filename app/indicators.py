from __future__ import annotations

from typing import List, Optional, Tuple


def ema(values: List[float], period: int) -> Optional[float]:
    if len(values) < period:
        return None
    multiplier = 2 / (period + 1)
    ema_value = sum(values[:period]) / period
    for value in values[period:]:
        ema_value = (value - ema_value) * multiplier + ema_value
    return ema_value


def sma(values: List[float], period: int) -> Optional[float]:
    if len(values) < period:
        return None
    return sum(values[-period:]) / period


def macd(values: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    if len(values) < slow:
        return None, None, None
    fast_ema = ema(values, fast)
    slow_ema = ema(values, slow)
    if fast_ema is None or slow_ema is None:
        return None, None, None
    macd_line = fast_ema - slow_ema
    signal_values = []
    for idx in range(len(values)):
        sub_values = values[: idx + 1]
        fast_sub = ema(sub_values, fast)
        slow_sub = ema(sub_values, slow)
        if fast_sub is None or slow_sub is None:
            continue
        signal_values.append(fast_sub - slow_sub)
    signal_line = ema(signal_values, signal) if len(signal_values) >= signal else None
    hist = macd_line - signal_line if signal_line is not None else None
    return macd_line, signal_line, hist
