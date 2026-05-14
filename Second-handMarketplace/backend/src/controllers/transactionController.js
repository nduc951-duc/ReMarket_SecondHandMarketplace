const {
  createTransaction,
  getTransactionById,
  getTransactions,
  getTransactionStats,
  updateTransactionStatus,
} = require('../services/transactionService');
const { getProductById } = require('../models/products/productModel');

function sendError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    ok: false,
    message: error?.message || fallbackMessage,
  });
}

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
    return sendError(res, error, 'Khong the lay lich su giao dich.');
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
    return sendError(res, error, 'Khong the lay thong ke giao dich.');
  }
}

/**
 * POST /api/transactions
 * Create a new transaction/order
 */
async function createTransactionHandler(req, res) {
  try {
    const {
      product_id,
      payment_method,
      note,
    } = req.body;

    // Validation
    if (!product_id) {
      return res.status(400).json({
        ok: false,
        message: 'ID sản phẩm là bắt buộc.',
      });
    }

    // Get product details to verify seller and snapshot price
    const product = await getProductById(product_id);

    if (!product) {
      return res.status(404).json({
        ok: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    if (product.seller_id === req.user.id) {
      return res.status(400).json({
        ok: false,
        message: 'Bạn không thể mua sản phẩm của chính mình.',
      });
    }

    if (product.status !== 'active') {
      return res.status(400).json({
        ok: false,
        message: 'Sản phẩm không khả dụng.',
      });
    }

    const transactionData = {
      buyer_id: req.user.id,
      seller_id: product.seller_id,
      product_id,
      product_name: product.title,
        product_image: product.image_url || (product.images && product.images.length > 0 ? product.images[0] : ''),
      amount: Number(product.price),
      payment_method: payment_method || '',
      note: note || '',
    };

    const transaction = await createTransaction(transactionData);

    return res.status(201).json({
      ok: true,
      data: transaction,
      message: 'Tạo đơn hàng thành công.',
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    return sendError(res, error, 'Không thể tạo đơn hàng.');
  }
}

/**
 * GET /api/transactions/:id
 * Get transaction details
 */
async function getTransactionByIdHandler(req, res) {
  try {
    const { id } = req.params;

    const transaction = await getTransactionById(id, req.user.id);

    if (!transaction) {
      return res.status(404).json({
        ok: false,
        message: 'Không tìm thấy giao dịch.',
      });
    }

    return res.status(200).json({
      ok: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    return sendError(res, error, 'Không thể lấy thông tin giao dịch.');
  }
}

/**
 * PATCH /api/transactions/:id/status
 * Update transaction status
 */
async function updateTransactionStatusHandler(req, res) {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!status) {
      return res.status(400).json({
        ok: false,
        message: 'Trạng thái là bắt buộc.',
      });
    }

    const additionalData = {};
    if (rejection_reason) {
      additionalData.rejection_reason = rejection_reason;
    }

    const transaction = await updateTransactionStatus(id, req.user.id, status, additionalData);

    return res.status(200).json({
      ok: true,
      data: transaction,
      message: 'Cập nhật trạng thái thành công.',
    });
  } catch (error) {
    console.error('Update transaction status error:', error);
    return sendError(res, error, 'Không thể cập nhật trạng thái.');
  }
}

module.exports = {
  createTransactionHandler,
  getTransactionByIdHandler,
  getTransactionsHandler,
  getTransactionStatsHandler,
  updateTransactionStatusHandler,
};
