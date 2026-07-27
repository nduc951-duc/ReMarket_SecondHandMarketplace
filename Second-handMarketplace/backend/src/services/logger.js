const SENSITIVE_KEYS = new Set([
  'accesstoken',
  'apikey',
  'authorization',
  'password',
  'paymentsignature',
  'refreshtoken',
  'secretkey',
  'servicerolekey',
  'signature',
  'supabaseservicerolekey',
  'token',
]);

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.has(
    String(key)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ''),
  );
}

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      isSensitiveKey(key) ? '[REDACTED]' : redact(entry),
    ]),
  );
}

function write(level, event, fields = {}) {
  const entry = redact({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  const output = JSON.stringify(entry);
  const target = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  target(output);
}

module.exports = {
  error: (event, fields) => write('error', event, fields),
  info: (event, fields) => write('info', event, fields),
  redact,
  warn: (event, fields) => write('warn', event, fields),
};
