import { TIMEFRAMES } from '../../config/schema.js';

export class CandleEngine {
  constructor(maxCandles = 500) {
    this.maxCandles = maxCandles;
    this.book = new Map();
  }

  key(symbol, tf) {
    return `${symbol}:${tf}`;
  }

  ensure(symbol, tf) {
    const k = this.key(symbol, tf);
    if (!this.book.has(k)) this.book.set(k, []);
    return this.book.get(k);
  }

  ingestTick(symbol, epochSec, price, volume = 1) {
    const updates = [];
    for (const tf of TIMEFRAMES) {
      const candles = this.ensure(symbol, tf);
      const openTime = Math.floor(epochSec / tf) * tf;
      let current = candles[candles.length - 1];
      if (!current || current.openTime !== openTime) {
        if (current) current.closed = true;
        current = { openTime, open: price, high: price, low: price, close: price, volume, closed: false };
        candles.push(current);
      } else {
        current.high = Math.max(current.high, price);
        current.low = Math.min(current.low, price);
        current.close = price;
        current.volume += volume;
      }
      while (candles.length > this.maxCandles) candles.shift();
      updates.push({ symbol, timeframe: tf, candle: current, candles });
    }
    return updates;
  }

  recoverMissing(symbol, tf, sourceCandles) {
    const candles = this.ensure(symbol, tf);
    const seen = new Set(candles.map((c) => c.openTime));
    sourceCandles.forEach((c) => {
      if (!seen.has(c.openTime)) candles.push({ ...c, closed: true });
    });
    candles.sort((a, b) => a.openTime - b.openTime);
    while (candles.length > this.maxCandles) candles.shift();
  }

  getCandles(symbol, tf) {
    return this.ensure(symbol, tf);
  }
}
