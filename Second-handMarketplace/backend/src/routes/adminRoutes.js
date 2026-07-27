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
const {
  getModerationReportsHandler,
  moderateReportHandler,
} = require('../controllers/reportController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireAdmin, requireAdminOrAgent } = require('../middlewares/adminMiddleware');
const { requireDemoWriteAccess } = require('../middlewares/demoModeMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { moderateReport } = require('../validation/requestSchemas');

const router = express.Router();

router.use(requireAuth);

router.get('/overview', requireAdminOrAgent, getAdminOverviewHandler);
router.get('/users', requireAdminOrAgent, getAdminUsersHandler);
router.get('/products', requireAdminOrAgent, getAdminProductsHandler);
router.get('/transactions', requireAdminOrAgent, getAdminTransactionsHandler);
router.get('/reports', requireAdminOrAgent, getModerationReportsHandler);

router.post('/users', requireAdmin, requireDemoWriteAccess, createUserHandler);
router.patch('/users/:id/role', requireAdmin, requireDemoWriteAccess, updateUserRoleHandler);
router.patch('/users/:id/status', requireAdmin, requireDemoWriteAccess, updateUserStatusHandler);
router.patch(
  '/products/:id/status',
  requireAdmin,
  requireDemoWriteAccess,
  updateProductStatusByAdminHandler,
);
router.patch(
  '/reports/:id',
  requireAdminOrAgent,
  requireDemoWriteAccess,
  validateRequest(moderateReport),
  moderateReportHandler,
);

module.exports = router;
