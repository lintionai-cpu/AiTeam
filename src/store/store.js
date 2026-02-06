import { Emitter } from '../utils/emitter.js';
import { defaultSettings, validateSettings } from '../config/schema.js';

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

export class AppStore {
  constructor() {
    this.events = new Emitter();
    this.initialSettings = clone(defaultSettings);
    this.state = {
      connection: { status: 'offline', latencyMs: null, reconnectAttempt: 0 },
      account: { balance: 0, equity: 0, sessionPnl: 0, wins: 0, losses: 0 },
      settings: clone(defaultSettings),
      markets: {},
      activeTrades: [],
      tradeHistory: [],
      scanner: {},
      logs: [],
      safety: { emergencyStop: false }
    };
  }

  getState() {
    return this.state;
  }

  patch(mutator) {
    const draft = clone(this.state);
    mutator(draft);
    this.state = draft;
    this.events.emit('state', this.state);
  }

  updateSettings(nextSettings) {
    validateSettings(nextSettings);
    this.patch((s) => {
      s.settings = nextSettings;
    });
  }

  resetSetup() {
    this.patch((s) => {
      s.settings = clone(this.initialSettings);
      s.account.sessionPnl = 0;
      s.account.wins = 0;
      s.account.losses = 0;
      s.activeTrades = [];
      s.tradeHistory = [];
      s.safety.emergencyStop = false;
    });
  }
}
