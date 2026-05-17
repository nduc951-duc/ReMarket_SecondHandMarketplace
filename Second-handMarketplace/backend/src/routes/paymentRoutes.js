const express = require('express');
const {
  createPaymentHandler,
  paymentIpnHandler,
  paymentReturnHandler,
  queryPaymentStatusHandler,
  refundPaymentHandler,
} = require('../controllers/paymentController');

const router = express.Router();

router.post('/create', createPaymentHandler);
router.get('/return/:method', paymentReturnHandler);
router.post('/return/:method', paymentReturnHandler);
router.get('/ipn/:method', paymentIpnHandler);
router.post('/ipn/:method', paymentIpnHandler);
router.get('/query/:method/:orderId', queryPaymentStatusHandler);
router.post('/refund', refundPaymentHandler);

module.exports = router;
