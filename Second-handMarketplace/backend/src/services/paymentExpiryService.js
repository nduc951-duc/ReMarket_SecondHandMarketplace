const { expireUnpaidTransactions } = require('./transactionService');

const DEFAULT_INTERVAL_MS = 60 * 1000;

let intervalId = null;

function startPaymentExpiryWorker(intervalMs = DEFAULT_INTERVAL_MS) {
  if (intervalId) {
    return intervalId;
  }

  intervalId = setInterval(async () => {
    try {
      const expiredCount = await expireUnpaidTransactions();
      if (expiredCount > 0) {
        console.log(`Expired ${expiredCount} unpaid transaction(s).`);
      }
    } catch (error) {
      console.error('Payment expiry worker error:', error);
    }
  }, intervalMs);

  if (typeof intervalId.unref === 'function') {
    intervalId.unref();
  }

  return intervalId;
}

function stopPaymentExpiryWorker() {
  if (!intervalId) {
    return;
  }

  clearInterval(intervalId);
  intervalId = null;
}

module.exports = {
  startPaymentExpiryWorker,
  stopPaymentExpiryWorker,
};
