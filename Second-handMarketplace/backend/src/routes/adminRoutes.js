const express = require('express');
const {
  getAdminOverviewHandler,
  getAdminUsersHandler,
  getAdminProductsHandler,
  updateProductStatusByAdminHandler,
  getAdminTransactionsHandler,
} = require('../controllers/adminController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/overview', getAdminOverviewHandler);
router.get('/users', getAdminUsersHandler);
router.get('/products', getAdminProductsHandler);
router.patch('/products/:id/status', updateProductStatusByAdminHandler);
router.get('/transactions', getAdminTransactionsHandler);

module.exports = router;