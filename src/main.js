import { AppStore } from './store/store.js';
import { DerivClient } from './api/derivClient.js';
import { CandleEngine } from './data/candles/candleEngine.js';
import { StrategyEngine } from './strategies/index.js';
import { RiskManager, MartingaleManager } from './risk/riskManager.js';
import { TradeExecutor } from './execution/tradeExecutor.js';
import { DashboardUI } from './ui/dashboard.js';
import { DEFAULT_SYMBOLS, TIMEFRAMES } from './config/schema.js';

const store = new AppStore();
const settings = store.getState().settings;
const client = new DerivClient({ appId: settings.appId, token: settings.token, mode: settings.mode });
const candles = new CandleEngine();
const strategies = new StrategyEngine();
const risk = new RiskManager();
const martingale = new MartingaleManager();
const executor = new TradeExecutor({ client, store, riskManager: risk, martingaleManager: martingale });
const ui = new DashboardUI(store);
ui.mount();

window.app = {
  emergencyStop: () => store.patch((s) => { s.safety.emergencyStop = true; }),
  resetSetup: () => store.resetSetup(),
  connect: () => client.connect(),
  toggleLive: () => toggleLiveMode()
};

function toggleLiveMode() {
  const enabled = confirm('Enable LIVE auto-trading? Demo mode is safer.');
  store.patch((s) => { s.settings.featureFlags.liveTrading = enabled; s.settings.featureFlags.paperTrading = !enabled; });
}

client.events.on('connection', (connection) => {
  store.patch((s) => Object.assign(s.connection, connection));
});

client.events.on('account', (account) => {
  store.patch((s) => {
    s.account.balance = Number(account.balance || s.account.balance);
    s.account.equity = s.account.balance + s.activeTrades.length;
  });
});

client.events.on('tick', async (tick) => {
  const before = performance.now();
  const updates = candles.ingestTick(tick.symbol, tick.epoch, tick.quote, 1);
  store.patch((s) => {
    if (!s.markets[tick.symbol]) s.markets[tick.symbol] = { last: tick.quote, volatility: 0 };
    const market = s.markets[tick.symbol];
    market.volatility = Math.abs((tick.quote - market.last) / (market.last || tick.quote));
    market.last = tick.quote;
  });

  for (const update of updates) {
    const signals = strategies.run({
      symbol: update.symbol,
      timeframe: update.timeframe,
      candles: update.candles,
      enabledStrategies: store.getState().settings.strategies
    });

    signals.forEach(async (signal) => {
      const scannerKey = `${signal.symbol}:${signal.timeframe}:${signal.strategy}`;
      store.patch((s) => {
        s.scanner[scannerKey] = signal;
      });
      const focusBoost = signal.symbol === store.getState().settings.focusSymbol ? 0.05 : 0;
      if (signal.score + focusBoost > 0.72) await executor.execute(signal);
    });
  }

  const latencyMs = Math.round(performance.now() - before);
  store.patch((s) => { s.connection.latencyMs = latencyMs; });
});

DEFAULT_SYMBOLS.forEach((symbol) => client.subscribeTicks(symbol));
TIMEFRAMES.forEach(() => null);
client.connect();
