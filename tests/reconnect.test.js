import test from 'node:test';
import assert from 'node:assert/strict';
import { DerivClient } from '../src/api/derivClient.js';

test('mock mode emits connection and ticks with idempotent subscriptions', async () => {
  const client = new DerivClient({ appId: '1089', mode: 'mock' });
  let connected = false;
  let ticks = 0;
  client.events.on('connection', ({ status }) => { if (status === 'online') connected = true; });
  client.events.on('tick', () => { ticks += 1; });
  client.subscribeTicks('R_50');
  client.subscribeTicks('R_50');
  client.connect();
  await new Promise((r) => setTimeout(r, 2200));
  assert.equal(client.subscriptions.size, 1);
  assert.equal(connected, true);
  assert.ok(ticks >= 1);
  clearInterval(client.mockTimer);
});
