const express = require('express');
const {
  getNotificationsHandler,
  getUnreadNotificationCountHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
} = require('../controllers/notificationController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', getNotificationsHandler);
router.get('/unread-count', getUnreadNotificationCountHandler);
router.patch('/read-all', markAllNotificationsReadHandler);
router.patch('/:id/read', markNotificationReadHandler);

module.exports = router;