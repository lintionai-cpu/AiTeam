import { MARKETS } from './config.js';
import { EventBus } from './core/eventBus.js';
import { DerivClient } from './core/derivClient.js';
import { MarketDataEngine } from './data/marketDataEngine.js';
import { TradeExecutor } from './execution/tradeExecutor.js';
import { MartingaleManager } from './risk/martingaleManager.js';
import { RiskManager } from './risk/riskManager.js';
import { state } from './state/store.js';
import { StrategyEngine } from './strategies/strategies.js';
import { renderAccount, renderLogs } from './ui/render.js';

const $ = (id) => document.getElementById(id);
const bus = new EventBus();
const client = new DerivClient(bus);
const strategyEngine = new StrategyEngine(bus);
const risk = new RiskManager(state.risk);
const martingale = new MartingaleManager(state.martingale);
const marketData = new MarketDataEngine(bus, client, strategyEngine);
const executor = new TradeExecutor(client, risk, martingale, () => state.settings);

const accountEl = $('account-overview');
const signalEl = $('signal-log');
const activeEl = $('active-trades');
const historyEl = $('trade-history');

function rerenderLogs() {
  renderLogs({
    signalsEl: signalEl,
    activeTradesEl: activeEl,
    historyEl: historyEl,
    signals: state.signalLog,
    activeTrades: state.activeTrades,
    history: state.tradeHistory,
  });
}

function addSignal(sig) {
  state.signalLog.push(sig);
  if (state.signalLog.length > 1000) state.signalLog.shift();
  rerenderLogs();
}

function setupMarketSelector() {
  const marketSel = $('focus-market');
  marketSel.innerHTML = MARKETS.map((m) => `<option value="${m}">${m}</option>`).join('');
  marketSel.value = state.settings.focusMarket;
  marketSel.addEventListener('change', (e) => {
    state.settings.focusMarket = e.target.value;
  });
}

function setupStrategyToggles() {
  const root = $('strategy-toggles');
  root.innerHTML = strategyEngine.strategies
    .map(
      (s) => `<label class="strategy-item"><input type="checkbox" data-strategy="${s.id}" ${s.enabled ? 'checked' : ''}/> ${s.name}</label>`,
    )
    .join('');
  root.querySelectorAll('input[data-strategy]').forEach((el) => {
    el.addEventListener('change', (e) => strategyEngine.setEnabled(e.target.dataset.strategy, e.target.checked));
  });
}

function bindControlInputs() {
  const numericMap = [
    ['stake', 'stake'],
    ['run-count', 'runCount'],
    ['max-win', 'maxWin'],
    ['min-win', 'minWin'],
    ['max-loss', 'maxLoss'],
    ['duration', 'duration'],
  ];
  numericMap.forEach(([id, key]) => $(id).addEventListener('input', (e) => {
    state.settings[key] = Number(e.target.value);
  }));
  $('duration-unit').addEventListener('change', (e) => { state.settings.durationUnit = e.target.value; });
  $('focus-timeframe').addEventListener('change', (e) => { state.settings.focusTimeframe = e.target.value; });

  $('risk-enabled').addEventListener('change', (e) => risk.updateSettings({ enabled: e.target.checked }));
  $('max-drawdown').addEventListener('input', (e) => risk.updateSettings({ maxDrawdownPct: Number(e.target.value) }));
  $('max-consec-loss').addEventListener('input', (e) => risk.updateSettings({ maxConsecutiveLosses: Number(e.target.value) }));
  $('equity-floor').addEventListener('input', (e) => risk.updateSettings({ equityFloor: Number(e.target.value) }));

  $('martingale-enabled').addEventListener('change', (e) => martingale.updateSettings({ enabled: e.target.checked }));
  $('martingale-multiplier').addEventListener('input', (e) => martingale.updateSettings({ multiplier: Number(e.target.value) }));
  $('martingale-steps').addEventListener('input', (e) => martingale.updateSettings({ maxSteps: Number(e.target.value) }));
}

$('connect-btn').addEventListener('click', () => {
  const appId = $('app-id').value;
  const token = $('api-token').value;
  client.connect(appId, token);
});
$('disconnect-btn').addEventListener('click', () => client.disconnect());
$('reset-btn').addEventListener('click', () => {
  state.activeTrades = [];
  state.tradeHistory = [];
  state.signalLog = [];
  state.settings.executedTrades = 0;
  risk.resetTradingState();
  martingale.resetTradingState();
  executor.resetTradingState();
  rerenderLogs();
});

bus.on('connection:status', (status) => {
  state.connectionStatus = status;
  $('connection-status').textContent = status;
});

bus.on('deriv:raw', (msg) => {
  if (msg.msg_type === 'authorize') {
    state.account = msg.authorize;
    renderAccount(accountEl, state.account);
    marketData.subscribeAll();
  }
});

bus.on('account:balance', (b) => {
  state.account = { ...(state.account || {}), ...b };
  renderAccount(accountEl, state.account);
  risk.onBalance(Number(b.balance));
});

bus.on('trade:active', (portfolio) => {
  state.activeTrades = portfolio.contracts || [];
  rerenderLogs();
});

bus.on('trade:history', (history) => {
  state.tradeHistory = history;
  rerenderLogs();
});

bus.on('trade:update', (contract) => {
  if (contract.is_sold) {
    const profit = Number(contract.profit || 0);
    risk.onTradeResult(profit);
    martingale.onTradeResult(profit);
  }
});

bus.on('candle:closed', async ({ market }) => {
  const context = marketData.getContext(market);
  const signals = strategyEngine.analyze(context);
  for (const signal of signals) {
    addSignal(signal);
    if (signal.market !== state.settings.focusMarket) continue;
    const result = await executor.execute(signal);
    if (result.ok) state.settings.executedTrades += 1;
    if (result.ok === false) addSignal({ ...signal, strategyId: 'execution_error', detail: result.error, ts: Date.now(), confidence: 0 });
  }
});

setupMarketSelector();
setupStrategyToggles();
bindControlInputs();
rerenderLogs();
