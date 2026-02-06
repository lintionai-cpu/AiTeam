import { Emitter } from '../utils/emitter.js';
import { validateTickPayload } from '../config/schema.js';
import { log } from '../utils/logger.js';

const DERIV_WS = 'wss://ws.derivws.com/websockets/v3';

export class DerivClient {
  constructor({ appId, token, mode = 'live' }) {
    this.appId = appId;
    this.token = token;
    this.mode = mode;
    this.ws = null;
    this.events = new Emitter();
    this.subscriptions = new Map();
    this.connected = false;
    this.reconnectAttempt = 0;
    this.heartbeat = null;
    this.lastPong = 0;
    this.mockTimer = null;
  }

  connect() {
    if (this.mode === 'live') return this.startMockFeed();
    this.ws = new WebSocket(`${DERIV_WS}?app_id=${this.appId}`);
    this.ws.onopen = () => this.onOpen();
    this.ws.onmessage = (e) => this.onMessage(e);
    this.ws.onclose = () => this.onClose();
    this.ws.onerror = (err) => log('error', 'websocket error', { err });
  }

  onOpen() {
    this.connected = true;
    this.reconnectAttempt = 0;
    this.events.emit('connection', { status: 'online' });
    if (this.token) this.send({ authorize: this.token });
    this.startHeartbeat();
    this.resubscribe();
  }

  onClose() {
    this.connected = false;
    this.events.emit('connection', { status: 'offline' });
    clearInterval(this.heartbeat);
    const delay = Math.min(30_000, (2 ** this.reconnectAttempt) * 1000 + Math.random() * 500);
    this.reconnectAttempt += 1;
    setTimeout(() => this.connect(), delay);
  }

  onMessage(event) {
    const msg = JSON.parse(event.data);
    if (msg.msg_type === 'ping') this.lastPong = Date.now();
    if (msg.error) return log('warn', 'Deriv API error', { msg: msg.error });
    if (validateTickPayload(msg)) this.events.emit('tick', msg.tick);
    if (msg.msg_type === 'proposal_open_contract') this.events.emit('trade_update', msg.proposal_open_contract);
    if (msg.msg_type === 'authorize') this.events.emit('account', msg.authorize);
  }

  startHeartbeat() {
    this.lastPong = Date.now();
    this.heartbeat = setInterval(() => {
      if (!this.connected) return;
      if (Date.now() - this.lastPong > 20_000) {
        log('warn', 'stale connection detected');
        this.ws?.close();
        return;
      }
      this.send({ ping: 1 });
    }, 5000);
  }

  send(payload) {
    if (this.mode === 'live') return;
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  subscribeTicks(symbol) {
    if (this.subscriptions.has(symbol)) return;
    this.subscriptions.set(symbol, { symbol });
    this.send({ ticks: symbol, subscribe: 1 });
  }

  resubscribe() {
    this.subscriptions.forEach((sub) => this.send({ ticks: sub.symbol, subscribe: 1 }));
  }

  async placeTrade(payload) {
    this.send({ buy: 1, price: payload.amount, parameters: payload });
    return { status: 'submitted' };
  }

  startMockFeed() {
    this.connected = true;
    this.events.emit('connection', { status: 'online' });
    const prices = new Map();
    this.mockTimer = setInterval(() => {
      this.subscriptions.forEach(({ symbol }) => {
        const prev = prices.get(symbol) || (100 + Math.random() * 10);
        const next = Math.max(1, prev + (Math.random() - 0.5) * 0.6);
        prices.set(symbol, next);
        this.events.emit('tick', { symbol, quote: Number(next.toFixed(5)), epoch: Math.floor(Date.now() / 1000) });
      });
      this.events.emit('account', { balance: 10000 + Math.random() * 20, currency: 'USD' });
    }, 1000);
  }
}
