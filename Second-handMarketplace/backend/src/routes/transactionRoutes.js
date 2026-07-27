const express = require('express');
const {
  createTransactionHandler,
  getTransactionByIdHandler,
  getTransactionsHandler,
  getTransactionStatsHandler,
  updateTransactionStatusHandler,
} = require('../controllers/transactionController');
const { requireAuth } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { createTransaction, updateTransactionStatus } = require('../validation/requestSchemas');

const router = express.Router();

// All transaction routes require authentication
router.use(requireAuth);

router.post('/', validateRequest(createTransaction), createTransactionHandler);
router.get('/', getTransactionsHandler);
router.get('/stats', getTransactionStatsHandler);
router.get('/:id', getTransactionByIdHandler);
router.patch(
  '/:id/status',
  validateRequest(updateTransactionStatus),
  updateTransactionStatusHandler,
);

module.exports = router;
