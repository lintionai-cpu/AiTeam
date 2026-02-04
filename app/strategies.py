from __future__ import annotations

from datetime import datetime
from typing import List

from .indicators import ema, macd, sma
from .models import Candle, IndicatorSnapshot, Signal


def _direction_from_value(value: float) -> str:
    return "buy" if value > 0 else "sell"


def ema_crossover_signal(symbol: str, timeframe_minutes: int, candles: List[Candle]) -> List[Signal]:
    closes = [c.close for c in candles]
    if len(closes) < 27:
        return []
    ema_fast_prev = ema(closes[:-1], 9)
    ema_slow_prev = ema(closes[:-1], 26)
    ema_fast = ema(closes, 9)
    ema_slow = ema(closes, 26)
    if ema_fast_prev is None or ema_slow_prev is None or ema_fast is None or ema_slow is None:
        return []
    prev_diff = ema_fast_prev - ema_slow_prev
    curr_diff = ema_fast - ema_slow
    crossed = prev_diff <= 0 < curr_diff or prev_diff >= 0 > curr_diff
    if not crossed:
        return []
    last_close = closes[-1]
    above_cross = last_close > max(ema_fast, ema_slow)
    below_cross = last_close < min(ema_fast, ema_slow)
    if not (above_cross or below_cross):
        return []
    direction = "buy" if above_cross else "sell"
    return [
        Signal(
            symbol=symbol,
            timeframe_minutes=timeframe_minutes,
            strategy="ema_crossover",
            direction=direction,
            confidence=0.62,
            created_at=datetime.utcnow(),
            metadata={"ema_fast": ema_fast, "ema_slow": ema_slow},
        )
    ]


def macd_ema_cross_signal(symbol: str, timeframe_minutes: int, candles: List[Candle]) -> List[Signal]:
    closes = [c.close for c in candles]
    if len(closes) < 30:
        return []
    macd_line, signal_line, _ = macd(closes)
    ema_2 = ema(closes, 2)
    if macd_line is None or signal_line is None or ema_2 is None:
        return []
    prev_macd_line, prev_signal_line, _ = macd(closes[:-1])
    prev_ema_2 = ema(closes[:-1], 2)
    if prev_macd_line is None or prev_signal_line is None or prev_ema_2 is None:
        return []
    prev_diff = prev_signal_line - prev_ema_2
    curr_diff = signal_line - ema_2
    crossed = prev_diff <= 0 < curr_diff or prev_diff >= 0 > curr_diff
    if not crossed:
        return []
    direction = "buy" if curr_diff > 0 else "sell"
    return [
        Signal(
            symbol=symbol,
            timeframe_minutes=timeframe_minutes,
            strategy="macd_signal_ema2_cross",
            direction=direction,
            confidence=0.58,
            created_at=datetime.utcnow(),
            metadata={"macd_signal": signal_line, "ema_2": ema_2},
        )
    ]


def body_break_momentum_signal(symbol: str, timeframe_minutes: int, candles: List[Candle]) -> List[Signal]:
    if len(candles) < 2:
        return []
    current = candles[-1]
    body_high = max(current.open, current.close)
    body_low = min(current.open, current.close)
    body_range = body_high - body_low
    candle_range = current.high - current.low
    if candle_range == 0:
        return []
    wick_ratio = (candle_range - body_range) / candle_range
    if wick_ratio > 0.3:
        return []
    volume_avg = sma([c.volume for c in candles[:-1]], 5)
    if volume_avg is None or current.volume < volume_avg:
        return []
    if current.close > body_high:
        return [
            Signal(
                symbol=symbol,
                timeframe_minutes=timeframe_minutes,
                strategy="body_break_momentum",
                direction="buy",
                confidence=0.6,
                created_at=datetime.utcnow(),
                metadata={"body_high": body_high},
            )
        ]
    if current.close < body_low:
        return [
            Signal(
                symbol=symbol,
                timeframe_minutes=timeframe_minutes,
                strategy="body_break_momentum",
                direction="sell",
                confidence=0.6,
                created_at=datetime.utcnow(),
                metadata={"body_low": body_low},
            )
        ]
    return []


def wick_rejection_signal(symbol: str, timeframe_minutes: int, candles: List[Candle]) -> List[Signal]:
    if len(candles) < 2:
        return []
    current = candles[-1]
    candle_range = current.high - current.low
    if candle_range == 0:
        return []
    upper_wick = current.high - max(current.open, current.close)
    lower_wick = min(current.open, current.close) - current.low
    upper_ratio = upper_wick / candle_range
    lower_ratio = lower_wick / candle_range
    body_mid = (current.open + current.close) / 2
    if upper_ratio >= 0.7 and current.close < body_mid:
        return [
            Signal(
                symbol=symbol,
                timeframe_minutes=timeframe_minutes,
                strategy="wick_rejection_fade",
                direction="sell",
                confidence=0.55,
                created_at=datetime.utcnow(),
                metadata={"upper_wick_ratio": upper_ratio},
            )
        ]
    if lower_ratio >= 0.7 and current.close > body_mid:
        return [
            Signal(
                symbol=symbol,
                timeframe_minutes=timeframe_minutes,
                strategy="wick_rejection_fade",
                direction="buy",
                confidence=0.55,
                created_at=datetime.utcnow(),
                metadata={"lower_wick_ratio": lower_ratio},
            )
        ]
    return []


def range_expansion_signal(symbol: str, timeframe_minutes: int, candles: List[Candle]) -> List[Signal]:
    if len(candles) < 6:
        return []
    current = candles[-1]
    ranges = [c.high - c.low for c in candles[-6:-1]]
    avg_range = sum(ranges) / len(ranges)
    current_range = current.high - current.low
    if avg_range == 0 or current_range < 1.5 * avg_range:
        return []
    direction = _direction_from_value(current.close - current.open)
    return [
        Signal(
            symbol=symbol,
            timeframe_minutes=timeframe_minutes,
            strategy="range_expansion_breakout",
            direction=direction,
            confidence=0.57,
            created_at=datetime.utcnow(),
            metadata={"range_multiple": current_range / avg_range},
        )
    ]


def power_close_signal(symbol: str, timeframe_minutes: int, candles: List[Candle]) -> List[Signal]:
    if len(candles) < 2:
        return []
    current = candles[-1]
    candle_range = current.high - current.low
    if candle_range == 0:
        return []
    body_size = abs(current.close - current.open)
    if body_size < 0.6 * candle_range:
        return []
    if current.close >= current.high - 0.1 * candle_range:
        direction = "buy"
    elif current.close <= current.low + 0.1 * candle_range:
        direction = "sell"
    else:
        return []
    return [
        Signal(
            symbol=symbol,
            timeframe_minutes=timeframe_minutes,
            strategy="power_close",
            direction=direction,
            confidence=0.59,
            created_at=datetime.utcnow(),
            metadata={"body_ratio": body_size / candle_range},
        )
    ]


def mid_body_mean_reversion_signal(symbol: str, timeframe_minutes: int, candles: List[Candle]) -> List[Signal]:
    if len(candles) < 2:
        return []
    current = candles[-1]
    candle_range = current.high - current.low
    if candle_range == 0:
        return []
    mid_level = current.low + 0.5 * candle_range
    if current.close > current.open and current.close > mid_level:
        direction = "sell"
    elif current.close < current.open and current.close < mid_level:
        direction = "buy"
    else:
        return []
    return [
        Signal(
            symbol=symbol,
            timeframe_minutes=timeframe_minutes,
            strategy="mid_body_mean_reversion",
            direction=direction,
            confidence=0.52,
            created_at=datetime.utcnow(),
            metadata={"mid_level": mid_level},
        )
    ]


def generate_signals(symbol: str, timeframe_minutes: int, candles: List[Candle], indicators: IndicatorSnapshot) -> List[Signal]:
    signals: List[Signal] = []
    signals.extend(ema_crossover_signal(symbol, timeframe_minutes, candles))
    signals.extend(macd_ema_cross_signal(symbol, timeframe_minutes, candles))
    signals.extend(body_break_momentum_signal(symbol, timeframe_minutes, candles))
    signals.extend(wick_rejection_signal(symbol, timeframe_minutes, candles))
    signals.extend(range_expansion_signal(symbol, timeframe_minutes, candles))
    signals.extend(power_close_signal(symbol, timeframe_minutes, candles))
    signals.extend(mid_body_mean_reversion_signal(symbol, timeframe_minutes, candles))
    if indicators.macd_hist is not None:
        signals.extend(
            [
                Signal(
                    symbol=symbol,
                    timeframe_minutes=timeframe_minutes,
                    strategy="macd_hist_bias",
                    direction="buy" if indicators.macd_hist > 0 else "sell",
                    confidence=0.5,
                    created_at=datetime.utcnow(),
                    metadata={"macd_hist": indicators.macd_hist},
                )
            ]
        )
    return signals
