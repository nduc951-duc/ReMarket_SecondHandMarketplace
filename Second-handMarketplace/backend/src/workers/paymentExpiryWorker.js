const { expireUnpaidTransactions } = require('../services/transactionService');

const DEFAULT_INTERVAL_MS = 60 * 1000;

function createPaymentExpiryWorker({
  expire = expireUnpaidTransactions,
  intervalMs = DEFAULT_INTERVAL_MS,
  logger = console,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  let intervalId = null;
  let running = false;

  async function runOnce() {
    if (running) {
      logger.warn('[payment-expiry] skipped because the previous run is still active');
      return {
        skipped: true,
        expiredCount: 0,
      };
    }

    running = true;
    const startedAt = Date.now();

    try {
      const expiredCount = await expire();
      logger.log(
        `[payment-expiry] completed expired=${expiredCount} duration_ms=${Date.now() - startedAt}`,
      );
      return {
        skipped: false,
        expiredCount,
      };
    } catch (error) {
      logger.error('[payment-expiry] failed', error);
      throw error;
    } finally {
      running = false;
    }
  }

  function runSafely() {
    return runOnce().catch(() => null);
  }

  function start({ runImmediately = true } = {}) {
    if (intervalId) {
      return intervalId;
    }

    if (runImmediately) {
      void runSafely();
    }

    intervalId = setIntervalFn(runSafely, intervalMs);
    logger.log(`[payment-expiry] worker started interval_ms=${intervalMs}`);
    return intervalId;
  }

  function stop() {
    if (!intervalId) {
      return;
    }

    clearIntervalFn(intervalId);
    intervalId = null;
    logger.log('[payment-expiry] worker stopped');
  }

  function isRunning() {
    return Boolean(intervalId);
  }

  return {
    isRunning,
    runOnce,
    start,
    stop,
  };
}

function startStandaloneWorker() {
  const intervalMs = Number(process.env.PAYMENT_EXPIRY_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  const worker = createPaymentExpiryWorker({ intervalMs });

  function shutdown(signal) {
    console.log(`[payment-expiry] received ${signal}`);
    worker.stop();
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  worker.start();
  return worker;
}

if (require.main === module) {
  startStandaloneWorker();
}

module.exports = {
  DEFAULT_INTERVAL_MS,
  createPaymentExpiryWorker,
  startStandaloneWorker,
};
