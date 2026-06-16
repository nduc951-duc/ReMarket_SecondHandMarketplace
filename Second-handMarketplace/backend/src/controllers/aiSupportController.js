const { answerAiSupportQuestion } = require('../services/aiSupportService');

function sendError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500;

  return res.status(statusCode).json({
    ok: false,
    message: error?.message || fallbackMessage,
  });
}

async function askAiSupportHandler(req, res) {
  try {
    const data = await answerAiSupportQuestion({
      message: req.body?.message,
    });

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the tra loi cau hoi tu van AI.');
  }
}

module.exports = {
  askAiSupportHandler,
};
