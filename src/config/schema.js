export const DEFAULT_SYMBOLS = [
  'R_10',
  'R_25',
  'R_50',
  'R_75',
  'R_100',
  '1HZ100V',
  'frxXAUUSD'
];

export const TIMEFRAMES = [60, 180, 300];

export const defaultSettings = {
  mode: 'mock',
  appId: '1089',
  token: '',
  focusSymbol: 'R_50',
  focusTimeframe: 60,
  stake: 1,
  runCount: 100,
  minWin: 0,
  maxWin: 9999,
  maxLoss: -9999,
  duration: { type: 'minutes', value: 1 },
  contractType: 'CALL',
  risk: {
    enabled: true,
    drawdownCap: 100,
    maxConsecutiveLosses: 4,
    maxOpenTrades: 2,
    volatilityLimit: 0.03,
    paused: false
  },
  martingale: {
    enabled: false,
    baseStake: 1,
    multiplier: 2,
    maxSteps: 3,
    hardCap: 25,
    currentStep: 0
  },
  strategies: {
    emaCross: { enabled: true, fast: 9, slow: 29 },
    macdCross: { enabled: true },
    pinBar: { enabled: true, wickToBody: 2 },
    engulfingFade: { enabled: true },
    insideBarBreakout: { enabled: true },
    dojiDivergence: { enabled: true },
    volumeExhaustion: { enabled: true }
  },
  featureFlags: {
    paperTrading: true,
    liveTrading: false
  }
};

export function validateSettings(next) {
  if (!next || typeof next !== 'object') throw new Error('Settings must be object');
  if (next.stake <= 0) throw new Error('Stake must be > 0');
  if (!TIMEFRAMES.includes(next.focusTimeframe)) throw new Error('Unsupported focus timeframe');
  if (next.martingale.hardCap < next.martingale.baseStake) throw new Error('Martingale cap too low');
  return true;
}

export function validateTickPayload(payload) {
  return payload && payload.tick && typeof payload.tick.quote === 'number' && payload.tick.symbol;
}
