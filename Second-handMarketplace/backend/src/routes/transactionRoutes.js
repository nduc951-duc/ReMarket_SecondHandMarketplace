const express = require('express');
const {
  getTransactionsHandler,
  getTransactionStatsHandler,
} = require('../controllers/transactionController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

// All transaction routes require authentication
router.use(requireAuth);

router.get('/', getTransactionsHandler);
router.get('/stats', getTransactionStatsHandler);

module.exports = router;
