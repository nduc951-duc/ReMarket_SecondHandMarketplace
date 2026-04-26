const express = require('express');
const multer = require('multer');
const {
  getProfileHandler,
  updateProfileHandler,
  uploadAvatarHandler,
} = require('../controllers/profileController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// All profile routes require authentication
router.use(requireAuth);

router.get('/', getProfileHandler);
router.put('/', updateProfileHandler);
router.post('/avatar', upload.single('avatar'), uploadAvatarHandler);

module.exports = router;
