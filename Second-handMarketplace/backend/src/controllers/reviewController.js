const {
  createReview,
  getReviewsByUser,
  getReviewForTransaction,
  getMyReviews,
} = require('../services/reviewService');

function sendError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    ok: false,
    message: error?.message || fallbackMessage,
  });
}

async function createReviewHandler(req, res) {
  const transactionId = String(req.body?.transaction_id || '').trim();
  const rating = Number(req.body?.rating);
  const comment = req.body?.comment;

  if (!transactionId) {
    return res.status(400).json({
      ok: false,
      message: 'transaction_id la bat buoc.',
    });
  }

  try {
    const data = await createReview({
      reviewerId: req.user.id,
      transactionId,
      rating,
      comment,
    });

    return res.status(201).json({
      ok: true,
      data,
      message: 'Danh gia thanh cong.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the tao danh gia.');
  }
}

async function getReviewsByUserHandler(req, res) {
  try {
    const data = await getReviewsByUser(req.params.userId, {
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay danh sach danh gia.');
  }
}

async function getReviewForTransactionHandler(req, res) {
  try {
    const review = await getReviewForTransaction(req.params.transactionId, req.user.id);

    return res.status(200).json({
      ok: true,
      data: review,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay danh gia giao dich.');
  }
}

async function getMyReviewsHandler(req, res) {
  try {
    const data = await getMyReviews(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay danh gia cua ban.');
  }
}

module.exports = {
  createReviewHandler,
  getReviewsByUserHandler,
  getReviewForTransactionHandler,
  getMyReviewsHandler,
};