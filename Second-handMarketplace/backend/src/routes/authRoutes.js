const express = require('express');
const {
  changePasswordHandler,
  requestForgotPasswordHandler,
  requestSignupVerificationHandler,
  resendVerificationHandler,
} = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { authEmailRateLimiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

router.post('/register', authEmailRateLimiter, requestSignupVerificationHandler);
router.post('/forgot-password', authEmailRateLimiter, requestForgotPasswordHandler);
router.post('/resend-verification', authEmailRateLimiter, resendVerificationHandler);
router.post('/change-password', requireAuth, changePasswordHandler);

module.exports = router;
