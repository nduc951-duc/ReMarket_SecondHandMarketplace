const express = require('express');
const {
  createReviewHandler,
  getReviewsByUserHandler,
  getReviewForTransactionHandler,
  getMyReviewsHandler,
} = require('../controllers/reviewController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/user/:userId', getReviewsByUserHandler);

router.use(requireAuth);

router.post('/', createReviewHandler);
router.get('/me', getMyReviewsHandler);
router.get('/transaction/:transactionId/me', getReviewForTransactionHandler);

module.exports = router;