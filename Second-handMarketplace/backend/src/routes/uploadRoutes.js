const express = require('express');
const { uploadImagesHandler } = require('../controllers/uploadController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { upload } = require('../services/uploadService');

const router = express.Router();

// Protected routes (require authentication)
router.use(requireAuth);
router.post('/images', upload.array('images', 5), uploadImagesHandler); // Allow up to 5 images

module.exports = router;