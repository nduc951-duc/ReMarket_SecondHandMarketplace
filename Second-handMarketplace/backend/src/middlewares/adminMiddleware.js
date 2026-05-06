const { ADMIN_EMAILS, AGENT_EMAILS } = require('../config/env');

function parseAdminEmails() {
  return String(ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function parseAgentEmails() {
  return String(AGENT_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminUser(user) {
  if (!user) {
    return false;
  }

  const roleFromMetadata = String(
    user.user_metadata?.role || user.app_metadata?.role || '',
  ).toLowerCase();

  if (roleFromMetadata === 'admin') {
    return true;
  }

  const email = String(user.email || '').toLowerCase();
  if (!email) {
    return false;
  }

  const adminEmails = parseAdminEmails();
  return adminEmails.includes(email);
}

function isAgentUser(user) {
  if (!user) {
    return false;
  }

  const roleFromMetadata = String(
    user.user_metadata?.role || user.app_metadata?.role || '',
  ).toLowerCase();

  if (roleFromMetadata === 'agent') {
    return true;
  }

  const email = String(user.email || '').toLowerCase();
  if (!email) {
    return false;
  }

  const agentEmails = parseAgentEmails();
  return agentEmails.includes(email);
}

function requireAdmin(req, res, next) {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({
      ok: false,
      message: 'Ban khong co quyen truy cap trang quan tri.',
    });
  }

  return next();
}

function requireAdminOrAgent(req, res, next) {
  if (!(isAdminUser(req.user) || isAgentUser(req.user))) {
    return res.status(403).json({
      ok: false,
      message: 'Ban khong co quyen truy cap khu vuc nay.',
    });
  }

  return next();
}

module.exports = {
  requireAdmin,
  requireAdminOrAgent,
  isAdminUser,
  isAgentUser,
};