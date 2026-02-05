const avg = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

export function ema(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  let prev = avg(values.slice(0, period));
  const out = Array(period - 1).fill(null);
  out.push(prev);
  for (let i = period; i < values.length; i += 1) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function sma(values, period) {
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    if (i + 1 < period) out.push(null);
    else out.push(avg(values.slice(i + 1 - period, i + 1)));
  }
  return out;
}

export function rsi(values, period = 14) {
  if (values.length <= period) return values.map(() => null);
  const out = Array(period).fill(null);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  let rs = gains / Math.max(1e-9, losses);
  out.push(100 - 100 / (1 + rs));
  for (let i = period + 1; i < values.length; i += 1) {
    const d = values[i] - values[i - 1];
    gains = (gains * (period - 1) + Math.max(0, d)) / period;
    losses = (losses * (period - 1) + Math.max(0, -d)) / period;
    rs = gains / Math.max(1e-9, losses);
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

export function macd(values, fast = 12, slow = 26, signalP = 9) {
  const fastE = ema(values, fast);
  const slowE = ema(values, slow);
  const line = values.map((_, i) => (fastE[i] != null && slowE[i] != null ? fastE[i] - slowE[i] : null));
  const compact = line.filter((v) => v != null);
  const signalCompact = ema(compact, signalP);
  let idx = 0;
  const signal = line.map((v) => {
    if (v == null) return null;
    const s = signalCompact[idx];
    idx += 1;
    return s ?? null;
  });
  const hist = line.map((v, i) => (v != null && signal[i] != null ? v - signal[i] : null));
  return { line, signal, hist };
}

export function stochastic(candles, period = 14) {
  return candles.map((c, i) => {
    if (i + 1 < period) return null;
    const chunk = candles.slice(i + 1 - period, i + 1);
    const h = Math.max(...chunk.map((x) => x.high));
    const l = Math.min(...chunk.map((x) => x.low));
    return ((c.close - l) / Math.max(1e-9, h - l)) * 100;
  });
}

export function vwap(candles) {
  let pv = 0;
  let vol = 0;
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    vol += c.volume;
    return pv / Math.max(1, vol);
  });
}

export function crossedUp(aPrev, aNow, bPrev, bNow) {
  return aPrev != null && bPrev != null && aNow != null && bNow != null && aPrev <= bPrev && aNow > bNow;
}

export function crossedDown(aPrev, aNow, bPrev, bNow) {
  return aPrev != null && bPrev != null && aNow != null && bNow != null && aPrev >= bPrev && aNow < bNow;
}
