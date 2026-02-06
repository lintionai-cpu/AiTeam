import test from 'node:test';
import assert from 'node:assert/strict';
import { StrategyEngine } from '../src/strategies/index.js';

function candlesWithPinbar() {
  const candles = [];
  for (let i = 0; i < 30; i += 1) {
    candles.push({ openTime: i * 60, open: 100 + i * 0.1, high: 100 + i * 0.2, low: 99 + i * 0.1, close: 100 + i * 0.15, volume: 12 });
  }
  candles[candles.length - 1] = { openTime: 29 * 60, open: 110, high: 110.1, low: 107, close: 110.05, volume: 15 };
  return candles;
}

test('strategy engine emits signals and deduplicates same candle', () => {
  const engine = new StrategyEngine();
  const candles = candlesWithPinbar();
  const enabledStrategies = {
    emaCross: { enabled: false, fast: 3, slow: 5 },
    macdCross: { enabled: false },
    pinBar: { enabled: true, wickToBody: 2 },
    engulfingFade: { enabled: false },
    insideBarBreakout: { enabled: false },
    dojiDivergence: { enabled: false },
    volumeExhaustion: { enabled: false }
  };

  const first = engine.run({ symbol: 'R_50', timeframe: 60, candles, enabledStrategies });
  const second = engine.run({ symbol: 'R_50', timeframe: 60, candles, enabledStrategies });

  assert.ok(first.length >= 1);
  assert.equal(second.length, 0);
});
