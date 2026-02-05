import { ema, macd, rsi, stochastic, sma, crossedDown, crossedUp, vwap } from '../indicators/indicators.js';

const body = (c) => Math.abs(c.close - c.open);
const range = (c) => c.high - c.low;
const upperWick = (c) => c.high - Math.max(c.open, c.close);
const lowerWick = Math.min(c.open, c.close) - c.low;

function mkSignal(strategyId, side, market, timeframe, confidence, detail) {
  return { strategyId, side, market, timeframe, confidence, detail, ts: Date.now() };
}

export const strategyDefs = [
  {
    id: 'ema_crossover_close',
    name: 'EMA 9/29 + Candle Close',
    enabled: true,
    analyze(ctx) {
      const candles = ctx.candles['3m'];
      if (!candles || candles.length < 35) return null;
      const closes = candles.map((c) => c.close);
      const e9 = ema(closes, 9);
      const e29 = ema(closes, 29);
      const i = closes.length - 1;
      const c = candles[i];
      if (crossedUp(e9[i - 1], e9[i], e29[i - 1], e29[i]) && c.close > e9[i] && c.close > e29[i]) {
        return mkSignal(this.id, 'BUY', ctx.market, '3m', 0.77, 'EMA9 crossed above EMA29 and close above both');
      }
      if (crossedDown(e9[i - 1], e9[i], e29[i - 1], e29[i]) && c.close < e9[i] && c.close < e29[i]) {
        return mkSignal(this.id, 'SELL', ctx.market, '3m', 0.77, 'EMA9 crossed below EMA29 and close below both');
      }
      return null;
    },
  },
  {
    id: 'macd_sma_vs_ema2',
    name: 'MACD SMA line vs EMA2',
    enabled: true,
    analyze(ctx) {
      const candles = ctx.candles['1m'];
      if (!candles || candles.length < 40) return null;
      const closes = candles.map((c) => c.close);
      const m = macd(closes);
      const macdSma = sma(m.line.map((v) => v ?? 0), 3);
      const ema2 = ema(closes, 2);
      const i = closes.length - 1;
      if (crossedUp(macdSma[i - 1], macdSma[i], ema2[i - 1], ema2[i]) && candles[i].close > closes[i - 1]) {
        return mkSignal(this.id, 'BUY', ctx.market, '1m', 0.63, 'MACD SMA crossed above EMA2 proxy');
      }
      if (crossedDown(macdSma[i - 1], macdSma[i], ema2[i - 1], ema2[i]) && candles[i].close < closes[i - 1]) {
        return mkSignal(this.id, 'SELL', ctx.market, '1m', 0.63, 'MACD SMA crossed below EMA2 proxy');
      }
      return null;
    },
  },
  {
    id: 'pin_bar_rejection_scalp',
    name: 'Pin Bar Rejection Scalp',
    enabled: true,
    analyze(ctx) {
      const c3 = ctx.candles['3m'];
      const c1 = ctx.candles['1m'];
      if (!c3 || !c1 || c3.length < 25 || c1.length < 5) return null;
      const pin = c3[c3.length - 1];
      const b = body(pin);
      if (b <= 0) return null;
      const up = upperWick(pin);
      const low = lowerWick(pin);
      const closes3 = c3.map((x) => x.close);
      const trend = ema(closes3, 20);
      const volAvg = c3.slice(-20).reduce((a, x) => a + x.volume, 0) / 20;
      const last1 = c1[c1.length - 1];
      if (low >= 2 * b && pin.close >= pin.low + range(pin) * (2 / 3) && pin.volume >= volAvg && pin.close >= (trend.at(-1) ?? pin.close) && last1.close > pin.high) {
        return mkSignal(this.id, 'BUY', ctx.market, '1m', 0.72, 'Bullish pin rejection with breakout');
      }
      if (up >= 2 * b && pin.close <= pin.low + range(pin) * (1 / 3) && pin.volume >= volAvg && pin.close <= (trend.at(-1) ?? pin.close) && last1.close < pin.low) {
        return mkSignal(this.id, 'SELL', ctx.market, '1m', 0.72, 'Bearish pin rejection with breakdown');
      }
      return null;
    },
  },
  {
    id: 'engulfing_momentum_fade',
    name: 'Engulfing Momentum Fade',
    enabled: true,
    analyze(ctx) {
      const c1 = ctx.candles['1m'];
      const c5 = ctx.candles['5m'];
      if (!c1 || !c5 || c1.length < 8) return null;
      const last = c1[c1.length - 1];
      const prev = c1.slice(-6, -1);
      const engulfed = prev.every((x) => Math.max(last.open, last.close) >= Math.max(x.open, x.close) && Math.min(last.open, last.close) <= Math.min(x.open, x.close));
      if (!engulfed) return null;
      const closes = c1.map((x) => x.close);
      const r = rsi(closes, 3).at(-1);
      const st = stochastic(c1, 5).at(-1);
      const volAvg = c1.slice(-20).reduce((a, x) => a + x.volume, 0) / Math.min(20, c1.length);
      if (last.volume < volAvg * 3) return null;
      if ((r >= 80 || st >= 85) && last.close < last.open) return mkSignal(this.id, 'SELL', ctx.market, '1m', 0.68, 'Bearish fade from short-term extreme');
      if ((r <= 20 || st <= 15) && last.close > last.open) return mkSignal(this.id, 'BUY', ctx.market, '1m', 0.68, 'Bullish fade from short-term extreme');
      return null;
    },
  },
  {
    id: 'inside_bar_breakout_scalp',
    name: 'Inside Bar Breakout Scalp',
    enabled: true,
    analyze(ctx) {
      const c5 = ctx.candles['5m'];
      const c1 = ctx.candles['1m'];
      if (!c5 || !c1 || c5.length < 3) return null;
      const mother = c5[c5.length - 2];
      const inside = c5[c5.length - 1];
      const last1 = c1.at(-1);
      const isInside = inside.high <= mother.high && inside.low >= mother.low;
      if (!isInside) return null;
      const vAvg = c5.slice(-20).reduce((a, c) => a + c.volume, 0) / Math.min(20, c5.length);
      if (inside.volume > vAvg * 0.8) return null;
      if (last1.volume < (c1.slice(-20).reduce((a, c) => a + c.volume, 0) / Math.min(20, c1.length)) * 1.2) return null;
      if (last1.close > mother.high) return mkSignal(this.id, 'BUY', ctx.market, '1m', 0.7, 'Inside bar bullish breakout');
      if (last1.close < mother.low) return mkSignal(this.id, 'SELL', ctx.market, '1m', 0.7, 'Inside bar bearish breakout');
      return null;
    },
  },
  {
    id: 'doji_macd_divergence',
    name: 'Doji + MACD Divergence',
    enabled: true,
    analyze(ctx) {
      const c5 = ctx.candles['5m'];
      if (!c5 || c5.length < 25) return null;
      const closes = c5.map((x) => x.close);
      const m = macd(closes, 5, 13, 1);
      const a = c5[c5.length - 3];
      const b = c5[c5.length - 2];
      const d = c5[c5.length - 1];
      const doji = body(d) <= range(d) * 0.15;
      if (!doji) return null;
      if (b.low < a.low && (m.line.at(-2) ?? 0) > (m.line.at(-3) ?? 0)) return mkSignal(this.id, 'BUY', ctx.market, '5m', 0.66, 'Bullish divergence with doji support');
      if (b.high > a.high && (m.line.at(-2) ?? 0) < (m.line.at(-3) ?? 0)) return mkSignal(this.id, 'SELL', ctx.market, '5m', 0.66, 'Bearish divergence with doji resistance');
      return null;
    },
  },
  {
    id: 'volume_spike_exhaustion',
    name: 'Volume Spike Exhaustion',
    enabled: true,
    analyze(ctx) {
      const c1 = ctx.candles['1m'];
      if (!c1 || c1.length < 30) return null;
      const last = c1.at(-1);
      const avgVol = c1.slice(-30, -1).reduce((a, x) => a + x.volume, 0) / 29;
      const vw = vwap(c1).at(-1);
      const longWicks = upperWick(last) > body(last) && lowerWick(last) > body(last);
      const rangeLarge = range(last) > (c1.slice(-20).reduce((a, x) => a + range(x), 0) / 20) * 1.7;
      if (last.volume >= avgVol * 5 && rangeLarge && longWicks && Math.abs(last.close - vw) / vw < 0.004) {
        if (last.close > last.open) return mkSignal(this.id, 'SELL', ctx.market, '1m', 0.64, 'Bull spike exhaustion near VWAP');
        return mkSignal(this.id, 'BUY', ctx.market, '1m', 0.64, 'Bear spike exhaustion near VWAP');
      }
      return null;
    },
  },
];

export class StrategyEngine {
  constructor(bus) {
    this.bus = bus;
    this.strategies = strategyDefs.map((s) => ({ ...s }));
  }

  setEnabled(id, enabled) {
    const strategy = this.strategies.find((s) => s.id === id);
    if (strategy) strategy.enabled = enabled;
  }

  analyze(context) {
    const signals = [];
    for (const strategy of this.strategies) {
      if (!strategy.enabled) continue;
      const signal = strategy.analyze(context);
      if (signal) signals.push(signal);
    }
    return signals;
  }
}
