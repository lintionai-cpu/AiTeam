import { BUFFER_SIZE, MARKETS, TIMEFRAMES } from '../config.js';
import { CandleAggregator } from './candleAggregator.js';

export class MarketDataEngine {
  constructor(bus, client, strategyEngine) {
    this.bus = bus;
    this.client = client;
    this.strategyEngine = strategyEngine;
    this.ticks = new Map();
    this.markets = new Map();

    for (const market of MARKETS) {
      const tfs = {};
      for (const [tf, sec] of Object.entries(TIMEFRAMES)) tfs[tf] = new CandleAggregator(sec, BUFFER_SIZE);
      this.markets.set(market, tfs);
    }

    this.bus.on('deriv:raw', (msg) => this.handleRaw(msg));
  }

  subscribeAll() {
    for (const market of MARKETS) this.client.subscribe({ ticks: market });
    this.client.subscribe({ proposal_open_contract: 1 });
    this.client.subscribe({ portfolio: 1 });
    this.client.subscribe({ balance: 1 });
    this.client.send({ statement: 1, limit: 50 });
  }

  handleRaw(msg) {
    if (msg.tick) this.handleTick(msg.tick);
    if (msg.balance) this.bus.emit('account:balance', msg.balance);
    if (msg.portfolio) this.bus.emit('trade:active', msg.portfolio);
    if (msg.proposal_open_contract) this.bus.emit('trade:update', msg.proposal_open_contract);
    if (msg.statement) this.bus.emit('trade:history', msg.statement.transactions || []);
  }

  handleTick(tick) {
    const market = tick.symbol;
    this.ticks.set(market, tick);
    const tfAgg = this.markets.get(market);
    if (!tfAgg) return;

    for (const [timeframe, agg] of Object.entries(tfAgg)) {
      const out = agg.ingestTick(tick);
      if (out.closed) {
        this.bus.emit('candle:closed', { market, timeframe, candle: out.candle });
      }
    }

    this.bus.emit('market:tick', { market, tick });
  }

  getContext(market) {
    const tfs = this.markets.get(market);
    const candles = {};
    for (const key of Object.keys(TIMEFRAMES)) candles[key] = tfs[key].getCandles();
    return { market, candles, tick: this.ticks.get(market) };
  }
}
