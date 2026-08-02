const express = require('express');
const {
  getSellerFollowStatusHandler,
  toggleSellerFollowHandler,
} = require('../controllers/followController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(requireAuth);
router.get('/sellers/:sellerId/status', getSellerFollowStatusHandler);
router.post('/sellers/:sellerId/toggle', toggleSellerFollowHandler);

module.exports = router;
