const express = require('express');
const {
  getWishlistHandler,
  getWishlistStatusHandler,
  toggleWishlistHandler,
} = require('../controllers/wishlistController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', getWishlistHandler);
router.get('/status/:productId', getWishlistStatusHandler);
router.post('/toggle', toggleWishlistHandler);

module.exports = router;