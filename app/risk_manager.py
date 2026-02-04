from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RiskProfile:
    max_trades: int
    min_lot: float
    max_lot: float
    target_profit_usd: float
    stop_loss_usd: float
    partial_take_profit_usd: float


def risk_profile_for_balance(balance: float) -> RiskProfile:
    if balance < 100:
        return RiskProfile(
            max_trades=1,
            min_lot=0.01,
            max_lot=0.02,
            target_profit_usd=1.5,
            stop_loss_usd=1.0,
            partial_take_profit_usd=0.75,
        )
    if balance < 500:
        return RiskProfile(
            max_trades=2,
            min_lot=0.02,
            max_lot=0.05,
            target_profit_usd=4.0,
            stop_loss_usd=2.5,
            partial_take_profit_usd=2.0,
        )
    if balance < 2000:
        return RiskProfile(
            max_trades=3,
            min_lot=0.05,
            max_lot=0.1,
            target_profit_usd=10.0,
            stop_loss_usd=6.0,
            partial_take_profit_usd=5.0,
        )
    return RiskProfile(
        max_trades=5,
        min_lot=0.1,
        max_lot=0.3,
        target_profit_usd=25.0,
        stop_loss_usd=15.0,
        partial_take_profit_usd=10.0,
    )
