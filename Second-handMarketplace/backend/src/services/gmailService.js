const nodemailer = require('nodemailer');
const { GMAIL_APP_PASSWORD, GMAIL_USER, MAIL_FROM_NAME } = require('../config/env');

function normalizedAppPassword() {
  return GMAIL_APP_PASSWORD.replace(/\s+/g, '');
}

function ensureGmailCredentials() {
  if (!GMAIL_USER || !normalizedAppPassword()) {
    throw new Error('Thiếu GMAIL_USER hoặc GMAIL_APP_PASSWORD trong backend/.env.');
  }
}

function buildTransporter() {
  ensureGmailCredentials();

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: normalizedAppPassword(),
    },
  });
}

async function sendMail({ to, subject, text, html, fromName }) {
  const transporter = buildTransporter();
  const senderName = fromName || MAIL_FROM_NAME;

  const info = await transporter.sendMail({
    from: senderName ? `"${senderName}" <${GMAIL_USER}>` : GMAIL_USER,
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
  sendMail,
};
