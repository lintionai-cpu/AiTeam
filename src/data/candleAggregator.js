import { RingBuffer } from '../core/ringBuffer.js';

export class CandleAggregator {
  constructor(timeframeSec, bufferSize) {
    this.timeframeSec = timeframeSec;
    this.buffer = new RingBuffer(bufferSize);
    this.current = null;
  }

  ingestTick(tick) {
    const epoch = tick.epoch;
    const bucket = Math.floor(epoch / this.timeframeSec) * this.timeframeSec;

    if (!this.current || this.current.epoch !== bucket) {
      if (this.current) this.buffer.push(this.current);
      this.current = {
        epoch: bucket,
        open: tick.quote,
        high: tick.quote,
        low: tick.quote,
        close: tick.quote,
        volume: 1,
      };
      return { closed: true, candle: this.current };
    }

    this.current.high = Math.max(this.current.high, tick.quote);
    this.current.low = Math.min(this.current.low, tick.quote);
    this.current.close = tick.quote;
    this.current.volume += 1;
    return { closed: false, candle: this.current };
  }

  getCandles() {
    const closed = this.buffer.toArray();
    return this.current ? [...closed, this.current] : closed;
  }

  resetTradingStateOnly() {
    // intentionally no-op to preserve live price streams and candle history
  }
}
