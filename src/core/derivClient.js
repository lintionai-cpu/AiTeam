import { DERIV_WS } from '../config.js';

export class DerivClient {
  constructor(bus) {
    this.bus = bus;
    this.ws = null;
    this.appId = null;
    this.token = null;
    this.msgId = 1;
    this.pending = new Map();
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.subscriptions = [];
    this.connected = false;
  }

  connect(appId, token) {
    this.appId = appId;
    this.token = token;
    this.ws = new WebSocket(`${DERIV_WS}?app_id=${appId}`);

    this.ws.onopen = async () => {
      this.connected = true;
      this.bus.emit('connection:status', 'Connected');
      await this.authorize(token);
      this.startHeartbeat();
      this.resubscribe();
    };

    this.ws.onmessage = (evt) => this.handleMessage(evt);
    this.ws.onerror = () => this.bus.emit('connection:status', 'Error');
    this.ws.onclose = () => {
      this.connected = false;
      this.stopHeartbeat();
      this.bus.emit('connection:status', 'Reconnecting...');
      this.scheduleReconnect();
    };
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.ws?.close();
    this.connected = false;
    this.bus.emit('connection:status', 'Disconnected');
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.connected && this.appId && this.token) this.connect(this.appId, this.token);
    }, 1500);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.send({ ping: 1 }), 10000);
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatTimer);
  }

  send(payload, { track = false } = {}) {
    if (!this.ws || this.ws.readyState !== 1) return Promise.reject(new Error('WebSocket not connected'));
    const reqId = this.msgId++;
    const message = { ...payload, req_id: reqId };

    if (track) {
      return new Promise((resolve, reject) => {
        this.pending.set(reqId, { resolve, reject, ts: Date.now() });
        this.ws.send(JSON.stringify(message));
      });
    }

    this.ws.send(JSON.stringify(message));
    return Promise.resolve(null);
  }

  handleMessage(evt) {
    const msg = JSON.parse(evt.data);
    if (msg.req_id && this.pending.has(msg.req_id)) {
      const { resolve, reject } = this.pending.get(msg.req_id);
      this.pending.delete(msg.req_id);
      if (msg.error) reject(msg.error);
      else resolve(msg);
    }
    this.bus.emit('deriv:raw', msg);
  }

  authorize(token) {
    return this.send({ authorize: token }, { track: true });
  }

  subscribe(payload) {
    this.subscriptions.push(payload);
    return this.send({ ...payload, subscribe: 1 });
  }

  resubscribe() {
    for (const payload of this.subscriptions) this.send({ ...payload, subscribe: 1 });
  }
}
