const {
  getAdminOverview,
  getAdminUsers,
  getAdminProducts,
  updateProductStatusByAdmin,
  getAdminTransactions,
} = require('../services/adminService');

function sendError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    ok: false,
    message: error?.message || fallbackMessage,
  });
}

async function getAdminOverviewHandler(req, res) {
  try {
    const data = await getAdminOverview();

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay tong quan admin.');
  }
}

async function getAdminUsersHandler(req, res) {
  try {
    const data = await getAdminUsers({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay danh sach user.');
  }
}

async function getAdminProductsHandler(req, res) {
  try {
    const data = await getAdminProducts({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      status: req.query.status,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay danh sach san pham.');
  }
}

async function updateProductStatusByAdminHandler(req, res) {
  const status = String(req.body?.status || '').trim();

  if (!status) {
    return res.status(400).json({
      ok: false,
      message: 'status la bat buoc.',
    });
  }

  try {
    const data = await updateProductStatusByAdmin(req.params.id, status);

    return res.status(200).json({
      ok: true,
      data,
      message: 'Cap nhat trang thai san pham thanh cong.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the cap nhat trang thai san pham.');
  }
}

async function getAdminTransactionsHandler(req, res) {
  try {
    const data = await getAdminTransactions({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay danh sach giao dich.');
  }
}

module.exports = {
  getAdminOverviewHandler,
  getAdminUsersHandler,
  getAdminProductsHandler,
  updateProductStatusByAdminHandler,
  getAdminTransactionsHandler,
};