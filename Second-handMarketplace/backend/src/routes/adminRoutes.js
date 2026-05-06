const express = require('express');
const {
  getAdminOverviewHandler,
  getAdminUsersHandler,
  getAdminProductsHandler,
  updateProductStatusByAdminHandler,
  getAdminTransactionsHandler,
  createUserHandler,
  updateUserRoleHandler,
  updateUserStatusHandler,
} = require('../controllers/adminController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireAdmin, requireAdminOrAgent } = require('../middlewares/adminMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/overview', requireAdminOrAgent, getAdminOverviewHandler);
router.get('/users', requireAdminOrAgent, getAdminUsersHandler);
router.get('/products', requireAdminOrAgent, getAdminProductsHandler);
router.get('/transactions', requireAdminOrAgent, getAdminTransactionsHandler);

router.post('/users', requireAdmin, createUserHandler);
router.patch('/users/:id/role', requireAdmin, updateUserRoleHandler);
router.patch('/users/:id/status', requireAdmin, updateUserStatusHandler);
router.patch('/products/:id/status', requireAdmin, updateProductStatusByAdminHandler);

module.exports = router;