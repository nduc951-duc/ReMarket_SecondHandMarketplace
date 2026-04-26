const {
  getTransactions,
  getTransactionStats,
} = require('../services/transactionService');

/**
 * GET /api/transactions
 * Query params: type (buy|sell|all), page, limit, status
 */
async function getTransactionsHandler(req, res) {
  try {
    const result = await getTransactions(req.user.id, {
      type: req.query.type,
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
    });

    return res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the lay lich su giao dich.',
    });
  }
}

/**
 * GET /api/transactions/stats
 */
async function getTransactionStatsHandler(req, res) {
  try {
    const stats = await getTransactionStats(req.user.id);

    return res.status(200).json({
      ok: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the lay thong ke giao dich.',
    });
  }
}

module.exports = {
  getTransactionsHandler,
  getTransactionStatsHandler,
};
