import { ema, macd, rsi, stochastic } from '../indicators/index.js';

self.onmessage = (event) => {
  const { type, payload } = event.data;
  if (type !== 'compute') return;
  const { closes, candles } = payload;
  self.postMessage({
    ema9: ema(closes, 9),
    ema29: ema(closes, 29),
    macd: macd(closes),
    rsi3: rsi(closes, 3),
    stoch3: stochastic(candles, 3)
  });
};
