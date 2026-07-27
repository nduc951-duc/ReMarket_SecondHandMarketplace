const express = require('express');
const {
  createReviewHandler,
  getReviewsByUserHandler,
  getReviewForTransactionHandler,
  getMyReviewsHandler,
} = require('../controllers/reviewController');
const { requireAuth } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { createReview } = require('../validation/requestSchemas');

const router = express.Router();

router.get('/user/:userId', getReviewsByUserHandler);

router.use(requireAuth);

router.post('/', validateRequest(createReview), createReviewHandler);
router.get('/me', getMyReviewsHandler);
router.get('/transaction/:transactionId/me', getReviewForTransactionHandler);

module.exports = router;
