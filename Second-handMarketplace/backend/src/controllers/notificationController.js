const {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../services/notificationService');

function sendError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    ok: false,
    message: error?.message || fallbackMessage,
  });
}

async function getNotificationsHandler(req, res) {
  try {
    const data = await getNotifications(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
      unreadOnly: req.query.unread,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay danh sach thong bao.');
  }
}

async function getUnreadNotificationCountHandler(req, res) {
  try {
    const unread = await getUnreadNotificationCount(req.user.id);

    return res.status(200).json({
      ok: true,
      data: { unread },
    });
  } catch (error) {
    return sendError(res, error, 'Khong the lay so thong bao chua doc.');
  }
}

async function markNotificationReadHandler(req, res) {
  try {
    const updated = await markNotificationRead(req.user.id, req.params.id);

    if (!updated) {
      return res.status(404).json({
        ok: false,
        message: 'Khong tim thay thong bao.',
      });
    }

    return res.status(200).json({
      ok: true,
      data: updated,
      message: 'Da danh dau da doc.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the cap nhat thong bao.');
  }
}

async function markAllNotificationsReadHandler(req, res) {
  try {
    const affectedCount = await markAllNotificationsRead(req.user.id);

    return res.status(200).json({
      ok: true,
      data: { affectedCount },
      message: 'Da danh dau tat ca thong bao la da doc.',
    });
  } catch (error) {
    return sendError(res, error, 'Khong the cap nhat thong bao.');
  }
}

module.exports = {
  getNotificationsHandler,
  getUnreadNotificationCountHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
};