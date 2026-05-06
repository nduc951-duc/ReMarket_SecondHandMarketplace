const {
  getAdminOverview,
  getAdminUsers,
  getAdminProducts,
  updateProductStatusByAdmin,
  getAdminTransactions,
  updateUserRole,
  updateUserStatus,
  createUser,
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

async function createUserHandler(req, res) {
  try {
    const data = await createUser({
      email: req.body?.email,
      password: req.body?.password,
      fullName: req.body?.full_name,
      role: req.body?.role,
    });

    return res.status(201).json({
      ok: true,
      data,
      message: 'Tao user thanh cong.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the tao user.');
  }
}

async function updateUserRoleHandler(req, res) {
  try {
    const data = await updateUserRole(req.params.id, req.body?.role);

    return res.status(200).json({
      ok: true,
      data,
      message: 'Cap nhat role thanh cong.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the cap nhat role.');
  }
}

async function updateUserStatusHandler(req, res) {
  try {
    const data = await updateUserStatus(req.params.id, req.body?.status);

    return res.status(200).json({
      ok: true,
      data,
      message: 'Cap nhat trang thai user thanh cong.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the cap nhat trang thai user.');
  }
}

module.exports = {
  getAdminOverviewHandler,
  getAdminUsersHandler,
  getAdminProductsHandler,
  updateProductStatusByAdminHandler,
  getAdminTransactionsHandler,
  createUserHandler,
  updateUserRoleHandler,
  updateUserStatusHandler,
};