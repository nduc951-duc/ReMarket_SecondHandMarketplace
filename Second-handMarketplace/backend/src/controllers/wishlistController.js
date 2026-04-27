const {
  getWishlist,
  getWishlistStatus,
  toggleWishlist,
} = require('../services/wishlistService');

function sendError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    ok: false,
    message: error?.message || fallbackMessage,
  });
}

async function getWishlistHandler(req, res) {
  try {
    const data = await getWishlist(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay wishlist.');
  }
}

async function getWishlistStatusHandler(req, res) {
  try {
    const status = await getWishlistStatus(req.user.id, req.params.productId);

    return res.status(200).json({
      ok: true,
      data: { wishlisted: status },
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay trang thai wishlist.');
  }
}

async function toggleWishlistHandler(req, res) {
  const productId = String(req.body?.product_id || '').trim();

  if (!productId) {
    return res.status(400).json({
      ok: false,
      message: 'product_id la bat buoc.',
    });
  }

  try {
    const data = await toggleWishlist(req.user.id, productId);

    return res.status(200).json({
      ok: true,
      data,
      message: data.wishlisted
        ? 'Da them vao wishlist.'
        : 'Da xoa khoi wishlist.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the cap nhat wishlist.');
  }
}

module.exports = {
  getWishlistHandler,
  getWishlistStatusHandler,
  toggleWishlistHandler,
};