const { createPaymentExpiryWorker } = require('./paymentExpiryWorker');

async function runPaymentExpiryOnce(options = {}) {
  const worker = createPaymentExpiryWorker(options);
  return worker.runOnce();
}

if (require.main === module) {
  runPaymentExpiryOnce().catch(() => {
    process.exitCode = 1;
  });
}

module.exports = {
  runPaymentExpiryOnce,
};
