const nodemailer = require('nodemailer');
const {
  GMAIL_APP_PASSWORD,
  GMAIL_USER,
  MAIL_FROM_EMAIL,
  MAIL_FROM_NAME,
  SMTP_HOST,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
} = require('../config/env');

function normalizedAppPassword() {
  return GMAIL_APP_PASSWORD.replace(/\s+/g, '');
}

function buildTransportOptions() {
  if (SMTP_HOST) {
    if (!SMTP_USER || !SMTP_PASSWORD) {
      throw new Error('Thieu SMTP_USER hoac SMTP_PASSWORD.');
    }

    return {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    };
  }

  if (!GMAIL_USER || !normalizedAppPassword()) {
    throw new Error('Thieu cau hinh SMTP. Gmail chi nen dung cho local development.');
  }

  return {
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: normalizedAppPassword(),
    },
  };
}

function getSenderAddress() {
  return MAIL_FROM_EMAIL || SMTP_USER || GMAIL_USER;
}

function buildTransporter() {
  return nodemailer.createTransport(buildTransportOptions());
}

async function sendMail({ to, subject, text, html, fromName }) {
  const transporter = buildTransporter();
  const senderName = fromName || MAIL_FROM_NAME;
  const senderAddress = getSenderAddress();

  const info = await transporter.sendMail({
    from: senderName ? `"${senderName}" <${senderAddress}>` : senderAddress,
    to,
    subject,
    text,
    html,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

module.exports = {
  buildTransportOptions,
  getSenderAddress,
  sendMail,
};
