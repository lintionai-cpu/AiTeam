export function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let result = sma(values.slice(0, period), period);
  for (let i = period; i < values.length; i += 1) {
    result = values[i] * k + result * (1 - k);
  }
  return result;
}

export function macd(values, fast = 12, slow = 26, signalPeriod = 9) {
  if (values.length < slow + signalPeriod) return null;
  const lineSeries = [];
  for (let i = slow; i <= values.length; i += 1) {
    const win = values.slice(0, i);
    lineSeries.push(ema(win, fast) - ema(win, slow));
  }
  const signal = ema(lineSeries, signalPeriod);
  const line = lineSeries[lineSeries.length - 1];
  return { line, signal, histogram: line - signal };
}

export function rsi(values, period = 14) {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  if (!loss) return 100;
  const rs = gain / loss;
  return 100 - (100 / (1 + rs));
}

export function stochastic(candles, period = 14) {
  if (candles.length < period) return null;
  const w = candles.slice(-period);
  const high = Math.max(...w.map((c) => c.high));
  const low = Math.min(...w.map((c) => c.low));
  const close = w[w.length - 1].close;
  return ((close - low) / (high - low || 1)) * 100;
}

export function vwap(candles) {
  let pv = 0;
  let volume = 0;
  candles.forEach((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    volume += c.volume;
  });
  return volume ? pv / volume : null;
}
