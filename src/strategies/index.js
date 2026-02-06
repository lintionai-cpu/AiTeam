import { ema, macd, rsi, stochastic, vwap } from '../indicators/index.js';

function last(candles, n = 1) { return candles[candles.length - n]; }

export const strategyMap = {
  emaCross: ({ candles, closes, settings }) => {
    if (candles.length < settings.slow + 2) return null;
    const prevFast = ema(closes.slice(0, -1), settings.fast);
    const prevSlow = ema(closes.slice(0, -1), settings.slow);
    const fast = ema(closes, settings.fast);
    const slow = ema(closes, settings.slow);
    const c = last(candles);
    if (prevFast <= prevSlow && fast > slow && c.close > c.open) return { side: 'BUY', score: 0.75 };
    if (prevFast >= prevSlow && fast < slow && c.close < c.open) return { side: 'SELL', score: 0.75 };
    return null;
  },
  macdCross: ({ candles, closes }) => {
    const m = macd(closes);
    if (!m) return null;
    const c = last(candles);
    if (m.line > m.signal && c.close > c.open) return { side: 'BUY', score: 0.68 };
    if (m.line < m.signal && c.close < c.open) return { side: 'SELL', score: 0.68 };
    return null;
  },
  pinBar: ({ candles, settings }) => {
    const c = last(candles);
    if (!c) return null;
    const body = Math.abs(c.close - c.open);
    const upper = c.high - Math.max(c.open, c.close);
    const lower = Math.min(c.open, c.close) - c.low;
    if (lower >= settings.wickToBody * (body || 0.00001)) return { side: 'BUY', score: 0.6 };
    if (upper >= settings.wickToBody * (body || 0.00001)) return { side: 'SELL', score: 0.6 };
    return null;
  },
  engulfingFade: ({ candles }) => {
    if (candles.length < 3) return null;
    const prev = last(candles, 2);
    const curr = last(candles);
    const isBullEngulf = curr.open < prev.close && curr.close > prev.open;
    const isBearEngulf = curr.open > prev.close && curr.close < prev.open;
    const rs = rsi(candles.map((c) => c.close), 3);
    const stoch = stochastic(candles, 3);
    if (isBearEngulf && rs > 70 && stoch > 80) return { side: 'SELL', score: 0.72 };
    if (isBullEngulf && rs < 30 && stoch < 20) return { side: 'BUY', score: 0.72 };
    return null;
  },
  insideBarBreakout: ({ candles }) => {
    if (candles.length < 3) return null;
    const mother = last(candles, 3);
    const inside = last(candles, 2);
    const breakout = last(candles, 1);
    const isInside = inside.high <= mother.high && inside.low >= mother.low;
    if (!isInside) return null;
    if (breakout.close > mother.high && breakout.volume > inside.volume) return { side: 'BUY', score: 0.7 };
    if (breakout.close < mother.low && breakout.volume > inside.volume) return { side: 'SELL', score: 0.7 };
    return null;
  },
  dojiDivergence: ({ candles, closes }) => {
    if (candles.length < 10) return null;
    const c = last(candles);
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low || 1;
    const isDoji = body / range < 0.15;
    const m = macd(closes);
    if (!isDoji || !m) return null;
    if (m.histogram > 0 && c.close < candles[candles.length - 2].close) return { side: 'BUY', score: 0.58 };
    if (m.histogram < 0 && c.close > candles[candles.length - 2].close) return { side: 'SELL', score: 0.58 };
    return null;
  },
  volumeExhaustion: ({ candles }) => {
    if (candles.length < 20) return null;
    const c = last(candles);
    const avgVol = candles.slice(-20, -1).reduce((sum, x) => sum + x.volume, 0) / 19;
    const isSpike = c.volume >= avgVol * 5;
    const vw = vwap(candles.slice(-20));
    if (!isSpike) return null;
    if (c.close < vw && c.high - Math.max(c.open, c.close) > Math.abs(c.close - c.open)) return { side: 'SELL', score: 0.66 };
    if (c.close > vw && Math.min(c.open, c.close) - c.low > Math.abs(c.close - c.open)) return { side: 'BUY', score: 0.66 };
    return null;
  }
};

export class StrategyEngine {
  constructor() {
    this.lastExecutionByKey = new Map();
  }

  run({ symbol, timeframe, candles, enabledStrategies }) {
    const closes = candles.map((c) => c.close);
    const signals = [];
    Object.entries(enabledStrategies).forEach(([name, cfg]) => {
      if (!cfg.enabled || !strategyMap[name]) return;
      const signal = strategyMap[name]({ candles, closes, settings: cfg });
      if (!signal) return;
      const k = `${symbol}:${timeframe}:${name}:${candles[candles.length - 1].openTime}`;
      if (this.lastExecutionByKey.has(k)) return;
      this.lastExecutionByKey.set(k, true);
      signals.push({ strategy: name, symbol, timeframe, ...signal });
    });
    return signals;
  }
}
