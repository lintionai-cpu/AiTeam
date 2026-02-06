# Operations Playbook

## Startup
1. `npm run start`
2. Load app and verify connection shows `online`.
3. Confirm mock/paper mode before any live activity.

## Health checks
- Connection badge remains online and latency updates.
- Scanner cards keep refreshing with BUY/SELL/NEUTRAL badges.
- Active trades panel updates when signals exceed threshold.

## Reconnect behavior
- If websocket closes/stalls, client triggers exponential backoff reconnect.
- Heartbeat ping detects stale connection and forces recycle.
- Existing subscriptions are replayed automatically (`resubscribe`).

## Safe shutdown
- Click `EMERGENCY STOP` first to halt new entries.
- Disable live mode if enabled.
- Stop server process (`Ctrl+C`).
