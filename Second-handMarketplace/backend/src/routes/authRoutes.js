const express = require('express');
const {
	changePasswordHandler,
	requestForgotPasswordHandler,
	requestSignupVerificationHandler,
	resendVerificationHandler,
} = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', requestSignupVerificationHandler);
router.post('/forgot-password', requestForgotPasswordHandler);
router.post('/resend-verification', resendVerificationHandler);
router.post('/change-password', requireAuth, changePasswordHandler);

module.exports = router;
