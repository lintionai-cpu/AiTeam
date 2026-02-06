const levels = ['debug', 'info', 'warn', 'error'];
let minLevel = 'info';

export function setLogLevel(level) {
  if (levels.includes(level)) minLevel = level;
}

export function log(level, message, context = {}) {
  if (levels.indexOf(level) < levels.indexOf(minLevel)) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context
  };
  console[level](`[${payload.ts}] ${message}`, context);
}
