const { getSellerFollowStatus, toggleSellerFollow } = require('../services/followService');

function sendError(res, error, fallbackMessage) {
  return res.status(Number(error?.statusCode) || 500).json({
    ok: false,
    message: error?.message || fallbackMessage,
  });
}

async function getSellerFollowStatusHandler(req, res) {
  try {
    const following = await getSellerFollowStatus(req.user.id, req.params.sellerId);
    return res.status(200).json({ ok: true, data: { following } });
  } catch (error) {
    return sendError(res, error, 'Khong the kiem tra trang thai theo doi.');
  }
}

async function toggleSellerFollowHandler(req, res) {
  try {
    const data = await toggleSellerFollow(req.user.id, req.params.sellerId);
    return res.status(200).json({
      ok: true,
      data,
      message: data.following ? 'Da theo doi nguoi ban.' : 'Da bo theo doi nguoi ban.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the cap nhat theo doi.');
  }
}

module.exports = { getSellerFollowStatusHandler, toggleSellerFollowHandler };
