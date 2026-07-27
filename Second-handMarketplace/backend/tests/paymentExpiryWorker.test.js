const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_INTERVAL_MS,
  createPaymentExpiryWorker,
} = require('../src/workers/paymentExpiryWorker');

function createLogger() {
  const entries = {
    error: [],
    log: [],
    warn: [],
  };

  return {
    entries,
    logger: {
      error: (...args) => entries.error.push(args),
      log: (...args) => entries.log.push(args),
      warn: (...args) => entries.warn.push(args),
    },
  };
}

test('payment expiry worker defaults to a one-minute interval', () => {
  assert.equal(DEFAULT_INTERVAL_MS, 60000);
});

test('runOnce reports how many transactions expired', async () => {
  const { entries, logger } = createLogger();
  const worker = createPaymentExpiryWorker({
    expire: async () => 3,
    logger,
  });

  const result = await worker.runOnce();

  assert.deepEqual(result, {
    skipped: false,
    expiredCount: 3,
  });
  assert.match(entries.log[0][0], /completed expired=3/);
});

test('runOnce logs and rethrows failures', async () => {
  const { entries, logger } = createLogger();
  const expectedError = new Error('database unavailable');
  const worker = createPaymentExpiryWorker({
    expire: async () => {
      throw expectedError;
    },
    logger,
  });

  await assert.rejects(() => worker.runOnce(), expectedError);
  assert.equal(entries.error[0][1], expectedError);
});

test('overlapping runs are skipped', async () => {
  const { entries, logger } = createLogger();
  let release;
  const blocked = new Promise((resolve) => {
    release = resolve;
  });
  const worker = createPaymentExpiryWorker({
    expire: () => blocked,
    logger,
  });

  const firstRun = worker.runOnce();
  const overlappingRun = await worker.runOnce();
  release(1);
  await firstRun;

  assert.deepEqual(overlappingRun, {
    skipped: true,
    expiredCount: 0,
  });
  assert.equal(entries.warn.length, 1);
});

test('start schedules one interval and is idempotent', () => {
  const { logger } = createLogger();
  const scheduled = [];
  const worker = createPaymentExpiryWorker({
    expire: async () => 0,
    logger,
    setIntervalFn: (callback, intervalMs) => {
      const interval = { callback, intervalMs };
      scheduled.push(interval);
      return interval;
    },
  });

  const first = worker.start({ runImmediately: false });
  const second = worker.start({ runImmediately: false });

  assert.equal(first, second);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].intervalMs, DEFAULT_INTERVAL_MS);
  assert.equal(worker.isRunning(), true);
});

test('stop clears the scheduled interval', () => {
  const { logger } = createLogger();
  const cleared = [];
  const interval = { id: 1 };
  const worker = createPaymentExpiryWorker({
    expire: async () => 0,
    logger,
    setIntervalFn: () => interval,
    clearIntervalFn: (value) => cleared.push(value),
  });

  worker.start({ runImmediately: false });
  worker.stop();
  worker.stop();

  assert.deepEqual(cleared, [interval]);
  assert.equal(worker.isRunning(), false);
});

test('starting standalone worker is the only automatic startup path', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');

  assert.doesNotMatch(appSource, /paymentExpiryWorker|startPaymentExpiryWorker/);
  assert.doesNotMatch(serverSource, /paymentExpiryWorker|startPaymentExpiryWorker/);
});
