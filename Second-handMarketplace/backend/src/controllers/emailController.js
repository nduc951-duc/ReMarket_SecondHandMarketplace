const { sendMail } = require('../services/gmailService');

function normalizeEmailValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function validatePayload(body) {
  const errors = [];

  const to = normalizeEmailValue(body.to);
  const subject = normalizeEmailValue(body.subject);
  const text = typeof body.text === 'string' ? body.text : '';
  const html = typeof body.html === 'string' ? body.html : '';

  if (!to) {
    errors.push('Truong to la bat buoc.');
  }

  if (!subject) {
    errors.push('Truong subject la bat buoc.');
  }

  if (!text && !html) {
    errors.push('Can it nhat mot trong hai truong text hoac html.');
  }

  return {
    errors,
    payload: {
      to,
      subject,
      text,
      html,
      fromName: normalizeEmailValue(body.fromName),
    },
  };
}

function isAuthorized(req) {
  const apiKey = process.env.MAIL_API_KEY;
  if (!apiKey) {
    return true;
  }

  return req.headers['x-api-key'] === apiKey;
}

async function sendEmailHandler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized. Sai hoac thieu x-api-key.',
    });
  }

  const { errors, payload } = validatePayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      message: 'Du lieu gui len khong hop le.',
      errors,
    });
  }

  try {
    const result = await sendMail(payload);
    return res.status(200).json({
      ok: true,
      message: 'Gui email thanh cong.',
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || 'Gui email that bai.',
    });
  }
}

module.exports = {
  sendEmailHandler,
};
