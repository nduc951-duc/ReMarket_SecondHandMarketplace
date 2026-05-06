const {
  getConversations,
  getMessages,
  sendMessage,
  ensureConversation,
  markConversationRead,
  getUnreadConversationCount,
} = require('../services/chatService');

function sendError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    ok: false,
    message: error?.message || fallbackMessage,
  });
}

async function getConversationsHandler(req, res) {
  try {
    const conversations = await getConversations(req.user.id);
    const unread = conversations.reduce((total, item) => total + (item.unread_count || 0), 0);

    return res.status(200).json({
      ok: true,
      data: {
        conversations,
        unread,
      },
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay danh sach conversation.');
  }
}

async function getUnreadConversationCountHandler(req, res) {
  try {
    const unread = await getUnreadConversationCount(req.user.id);

    return res.status(200).json({
      ok: true,
      data: { unread },
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay unread chat.');
  }
}

async function getMessagesHandler(req, res) {
  try {
    const data = await getMessages(req.user.id, req.params.id, {
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay tin nhan.');
  }
}

async function sendMessageHandler(req, res) {
  try {
    const message = await sendMessage({
      userId: req.user.id,
      conversationId: req.body?.conversation_id,
      receiverId: req.body?.receiver_id,
      productId: req.body?.product_id,
      content: req.body?.content,
    });

    return res.status(201).json({
      ok: true,
      data: message,
      message: 'Gui tin nhan thanh cong.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the gui tin nhan.');
  }
}

async function ensureConversationHandler(req, res) {
  try {
    const data = await ensureConversation({
      userId: req.user.id,
      receiverId: req.body?.receiver_id,
      productId: req.body?.product_id,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the tao conversation.');
  }
}

async function markConversationReadHandler(req, res) {
  try {
    const updated = await markConversationRead(req.user.id, req.params.id);

    return res.status(200).json({
      ok: true,
      data: updated,
      message: 'Da danh dau conversation la da doc.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the cap nhat conversation.');
  }
}

module.exports = {
  getConversationsHandler,
  getUnreadConversationCountHandler,
  getMessagesHandler,
  sendMessageHandler,
  ensureConversationHandler,
  markConversationReadHandler,
};