const express = require('express');
const {
  getConversationsHandler,
  getUnreadConversationCountHandler,
  getMessagesHandler,
  sendMessageHandler,
  ensureConversationHandler,
  markConversationReadHandler,
} = require('../controllers/chatController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/conversations', getConversationsHandler);
router.get('/conversations/unread-count', getUnreadConversationCountHandler);
router.post('/conversations/ensure', ensureConversationHandler);
router.get('/conversations/:id/messages', getMessagesHandler);
router.patch('/conversations/:id/read', markConversationReadHandler);
router.post('/messages', sendMessageHandler);

module.exports = router;