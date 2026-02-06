# Strategy / Risk Configuration Schema

## Execution
- `stake:number` base order size.
- `runCount:number` max trade attempts per run.
- `duration:{ type:'ticks'|'seconds'|'minutes', value:number }`.
- `contractType:'CALL'|'PUT'` default contract side.
- `focusSymbol:string` and `focusTimeframe:60|180|300`.

## Risk Manager
- `risk.enabled:boolean`
- `risk.drawdownCap:number` absolute session drawdown stop.
- `risk.maxConsecutiveLosses:number`
- `risk.maxOpenTrades:number`
- `risk.volatilityLimit:number` fraction threshold (e.g. `0.03` = 3%).
- `risk.paused:boolean`

## Martingale
- `martingale.enabled:boolean`
- `martingale.baseStake:number`
- `martingale.multiplier:number`
- `martingale.maxSteps:number`
- `martingale.hardCap:number`
- `martingale.currentStep:number`

## Strategies
Each strategy has `enabled:boolean` plus strategy-specific params:
- `emaCross: { fast, slow }`
- `pinBar: { wickToBody }`
- Others rely on defaults in strategy module and can be extended.
