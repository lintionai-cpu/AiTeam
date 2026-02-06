import test from 'node:test';
import assert from 'node:assert/strict';
import { ema, macd, rsi, stochastic } from '../src/indicators/index.js';

test('ema computes deterministic value', () => {
  const value = ema([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
  assert.ok(value > 8 && value < 10);
});

test('macd provides line/signal/histogram', () => {
  const series = Array.from({ length: 80 }, (_, i) => i + Math.random());
  const m = macd(series);
  assert.ok(m && Number.isFinite(m.line) && Number.isFinite(m.signal) && Number.isFinite(m.histogram));
});

test('rsi and stochastic return normalized range', () => {
  const closes = [1,2,3,2,3,4,3,4,5,4,5,6,5,6,7,8];
  const candles = closes.map((c, i) => ({ high: c + 0.5, low: c - 0.5, close: c, open: closes[i - 1] || c }));
  assert.ok(rsi(closes, 3) >= 0 && rsi(closes, 3) <= 100);
  assert.ok(stochastic(candles, 5) >= 0 && stochastic(candles, 5) <= 100);
});
