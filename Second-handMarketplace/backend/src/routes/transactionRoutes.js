const express = require('express');
const {
  createTransactionHandler,
  getTransactionByIdHandler,
  getTransactionsHandler,
  getTransactionStatsHandler,
  updateTransactionStatusHandler,
} = require('../controllers/transactionController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

// All transaction routes require authentication
router.use(requireAuth);

router.post('/', createTransactionHandler);
router.get('/', getTransactionsHandler);
router.get('/stats', getTransactionStatsHandler);
router.get('/:id', getTransactionByIdHandler);
router.patch('/:id/status', updateTransactionStatusHandler);

module.exports = router;
