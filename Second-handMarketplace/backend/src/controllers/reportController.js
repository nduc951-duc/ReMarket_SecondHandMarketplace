const {
  createReport,
  getModerationReports,
  getMyReports,
  moderateReport,
} = require('../services/reportService');

function sendError(res, error, fallbackMessage) {
  return res.status(Number(error?.statusCode) || 500).json({
    ok: false,
    code: error?.code,
    message: error?.message || fallbackMessage,
  });
}

async function createReportHandler(req, res) {
  try {
    const data = await createReport(req.user.id, req.body);
    return res.status(201).json({ ok: true, data, message: 'Gui bao cao thanh cong.' });
  } catch (error) {
    return sendError(res, error, 'Khong the gui bao cao.');
  }
}

async function getMyReportsHandler(req, res) {
  try {
    const data = await getMyReports(req.user.id);
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    return sendError(res, error, 'Khong the lay bao cao.');
  }
}

async function getModerationReportsHandler(req, res) {
  try {
    const data = await getModerationReports(req.query);
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    return sendError(res, error, 'Khong the lay moderation queue.');
  }
}

async function moderateReportHandler(req, res) {
  try {
    const data = await moderateReport(req.user.id, req.params.id, req.body);
    return res.status(200).json({ ok: true, data, message: 'Da cap nhat bao cao.' });
  } catch (error) {
    return sendError(res, error, 'Khong the xu ly bao cao.');
  }
}

module.exports = {
  createReportHandler,
  getModerationReportsHandler,
  getMyReportsHandler,
  moderateReportHandler,
};
