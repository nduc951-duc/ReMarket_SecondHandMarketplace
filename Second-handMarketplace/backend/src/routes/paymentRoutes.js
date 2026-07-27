const express = require('express');
const {
  createPaymentHandler,
  paymentIpnHandler,
  paymentReturnHandler,
  queryPaymentStatusHandler,
  refundPaymentHandler,
} = require('../controllers/paymentController');
const { requireAdmin } = require('../middlewares/adminMiddleware');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireDemoWriteAccess } = require('../middlewares/demoModeMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { createPayment, refundPayment } = require('../validation/requestSchemas');

const router = express.Router();

router.post('/create', requireAuth, validateRequest(createPayment), createPaymentHandler);
router.get('/return/:method', paymentReturnHandler);
router.post('/return/:method', paymentReturnHandler);
router.get('/ipn/:method', paymentIpnHandler);
router.post('/ipn/:method', paymentIpnHandler);
router.get('/query/:method/:orderId', queryPaymentStatusHandler);
router.post(
  '/refund',
  requireAuth,
  requireAdmin,
  requireDemoWriteAccess,
  validateRequest(refundPayment),
  refundPaymentHandler,
);

module.exports = router;
