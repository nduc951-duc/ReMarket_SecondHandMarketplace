const {
  FORGOT_PASSWORD_COOLDOWN_SECONDS,
  MAIL_FROM_NAME,
  SIGNUP_COOLDOWN_SECONDS,
} = require('../config/env');
const { sendMail } = require('../services/gmailService');
const {
  changeUserPassword,
  generateRecoveryLink,
  generateSignupLink,
  resendVerificationEmail,
} = require('../services/supabaseAdminService');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const forgotRequestCooldownMap = new Map();
const signupRequestCooldownMap = new Map();
const resendCooldownMap = new Map();

function normalize(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function isInvalidEmail(email) {
  return !email || !emailRegex.test(email);
}

function canRequestNow(cooldownMap, email, cooldownSeconds) {
  const now = Date.now();
  const cooldownMs = cooldownSeconds * 1000;
  const lastSent = cooldownMap.get(email);

  if (lastSent && now - lastSent < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - (now - lastSent)) / 1000);
    return {
      allowed: false,
      waitSeconds,
    };
  }

  cooldownMap.set(email, now);
  return {
    allowed: true,
    waitSeconds: 0,
  };
}

function isUserNotFoundError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('user not found');
}

function isUserAlreadyRegisteredError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('already been registered') ||
    message.includes('already registered') ||
    message.includes('already exists')
  );
}

function isRateLimitError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('rate limit');
}

function validateSignupPayload(body) {
  const fullName = normalize(body?.fullName);
  const email = normalize(body?.email).toLowerCase();
  const password = normalize(body?.password);
  const errors = [];

  if (!fullName || fullName.length < 2) {
    errors.push('Ho ten phai co it nhat 2 ky tu.');
  }

  if (isInvalidEmail(email)) {
    errors.push('Email khong hop le.');
  }

  if (!password || password.length < 8) {
    errors.push('Mat khau phai co it nhat 8 ky tu.');
  }

  return {
    payload: {
      fullName,
      email,
      password,
    },
    errors,
  };
}

function buildSignupHtml({ fullName, actionLink }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Xac nhan tai khoan ReMarket</h2>
      <p>Xin chao ${fullName || 'ban'},</p>
      <p>Cam on ban da dang ky tai khoan. Bam vao nut ben duoi de xac nhan email.</p>
      <p>
        <a href="${actionLink}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 10px 14px; text-decoration: none; border-radius: 8px;">Xac nhan tai khoan</a>
      </p>
      <p>Neu ban khong tao tai khoan nay, hay bo qua email.</p>
      <p>ReMarket Team</p>
    </div>
  `;
}

function buildForgotPasswordHtml({ email, actionLink }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Yeu cau dat lai mat khau</h2>
      <p>Xin chao ${email},</p>
      <p>Ban vua yeu cau dat lai mat khau cho tai khoan ReMarket.</p>
      <p>
        Bam vao link ben duoi de dat lai mat khau:
      </p>
      <p>
        <a href="${actionLink}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 10px 14px; text-decoration: none; border-radius: 8px;">Dat lai mat khau</a>
      </p>
      <p>Neu ban khong yeu cau hanh dong nay, hay bo qua email.</p>
      <p>ReMarket Team</p>
    </div>
  `;
}

function buildResendVerificationHtml({ email, actionLink }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Gui lai email xac nhan tai khoan</h2>
      <p>Xin chao ${email},</p>
      <p>Ban da yeu cau gui lai email xac nhan tai khoan ReMarket.</p>
      <p>Bam vao nut ben duoi de xac nhan email cua ban:</p>
      <p>
        <a href="${actionLink}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 10px 14px; text-decoration: none; border-radius: 8px;">Xac nhan tai khoan</a>
      </p>
      <p>Neu ban khong yeu cau hanh dong nay, hay bo qua email.</p>
      <p>ReMarket Team</p>
    </div>
  `;
}

async function requestSignupVerificationHandler(req, res) {
  const { payload, errors } = validateSignupPayload(req.body || {});

  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      message: 'Du lieu dang ky khong hop le.',
      errors,
    });
  }

  const cooldownResult = canRequestNow(
    signupRequestCooldownMap,
    payload.email,
    SIGNUP_COOLDOWN_SECONDS,
  );
  if (!cooldownResult.allowed) {
    return res.status(429).json({
      ok: false,
      message: `Ban thao tac qua nhanh. Thu lai sau ${cooldownResult.waitSeconds} giay.`,
    });
  }

  try {
    const actionLink = await generateSignupLink({
      email: payload.email,
      password: payload.password,
      userMetadata: {
        full_name: payload.fullName,
      },
    });

    await sendMail({
      to: payload.email,
      subject: 'ReMarket - Xac nhan tai khoan',
      text: `Xac nhan tai khoan tai day: ${actionLink}`,
      html: buildSignupHtml({
        fullName: payload.fullName,
        actionLink,
      }),
      fromName: MAIL_FROM_NAME,
    });

    return res.status(200).json({
      ok: true,
      message: 'Da gui email xac nhan tai khoan. Vui long kiem tra hop thu cua ban.',
    });
  } catch (error) {
    if (isUserAlreadyRegisteredError(error)) {
      return res.status(409).json({
        ok: false,
        message: 'Email nay da duoc dang ky. Vui long dang nhap hoac dung quen mat khau.',
      });
    }

    if (isRateLimitError(error)) {
      return res.status(429).json({
        ok: false,
        message:
          'Email rate limit exceeded. Vui long doi it phut hoac giam tan suat gui yeu cau.',
      });
    }

    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the gui email xac nhan dang ky.',
    });
  }
}

async function requestForgotPasswordHandler(req, res) {
  const email = normalize(req.body?.email).toLowerCase();

  if (isInvalidEmail(email)) {
    return res.status(400).json({
      ok: false,
      message: 'Email khong hop le.',
    });
  }

  const cooldownResult = canRequestNow(
    forgotRequestCooldownMap,
    email,
    FORGOT_PASSWORD_COOLDOWN_SECONDS,
  );
  if (!cooldownResult.allowed) {
    return res.status(429).json({
      ok: false,
      message: `Ban thao tac qua nhanh. Thu lai sau ${cooldownResult.waitSeconds} giay.`,
    });
  }

  try {
    const actionLink = await generateRecoveryLink(email);

    await sendMail({
      to: email,
      subject: 'ReMarket - Dat lai mat khau',
      text: `Dat lai mat khau tai day: ${actionLink}`,
      html: buildForgotPasswordHtml({ email, actionLink }),
      fromName: MAIL_FROM_NAME,
    });

    return res.status(200).json({
      ok: true,
      message: 'Neu email ton tai, link dat lai mat khau da duoc gui.',
    });
  } catch (error) {
    if (isUserNotFoundError(error)) {
      return res.status(200).json({
        ok: true,
        message: 'Neu email ton tai, link dat lai mat khau da duoc gui.',
      });
    }

    if (isRateLimitError(error)) {
      return res.status(429).json({
        ok: false,
        message:
          'Email rate limit exceeded. Vui long doi it phut hoac giam tan suat gui yeu cau.',
      });
    }

    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the gui yeu cau reset password.',
    });
  }
}

/**
 * POST /api/auth/resend-verification
 * Body: { email }
 * Generates a new signup confirmation link and sends it via Gmail.
 */
async function resendVerificationHandler(req, res) {
  const email = normalize(req.body?.email).toLowerCase();

  if (isInvalidEmail(email)) {
    return res.status(400).json({
      ok: false,
      message: 'Email khong hop le.',
    });
  }

  const cooldownResult = canRequestNow(
    resendCooldownMap,
    email,
    SIGNUP_COOLDOWN_SECONDS,
  );
  if (!cooldownResult.allowed) {
    return res.status(429).json({
      ok: false,
      message: `Ban thao tac qua nhanh. Thu lai sau ${cooldownResult.waitSeconds} giay.`,
    });
  }

  try {
    const actionLink = await resendVerificationEmail(email);

    await sendMail({
      to: email,
      subject: 'ReMarket - Gui lai xac nhan tai khoan',
      text: `Xac nhan tai khoan tai day: ${actionLink}`,
      html: buildResendVerificationHtml({ email, actionLink }),
      fromName: MAIL_FROM_NAME,
    });

    return res.status(200).json({
      ok: true,
      message: 'Da gui lai email xac nhan. Vui long kiem tra hop thu cua ban.',
    });
  } catch (error) {
    if (isUserNotFoundError(error)) {
      // Don't leak whether the email exists
      return res.status(200).json({
        ok: true,
        message: 'Neu email ton tai va chua xac nhan, link xac nhan da duoc gui.',
      });
    }

    if (isRateLimitError(error)) {
      return res.status(429).json({
        ok: false,
        message:
          'Email rate limit exceeded. Vui long doi it phut hoac giam tan suat gui yeu cau.',
      });
    }

    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the gui lai email xac nhan.',
    });
  }
}

/**
 * POST /api/auth/change-password
 * Requires authenticated user (via requireAuth middleware).
 * Body: { currentPassword, newPassword }
 * Verifies current password then updates to new password via Supabase Admin API.
 */
async function changePasswordHandler(req, res) {
  const currentPassword = normalize(req.body?.currentPassword);
  const newPassword = normalize(req.body?.newPassword);

  if (!currentPassword) {
    return res.status(400).json({
      ok: false,
      message: 'Vui long nhap mat khau hien tai.',
    });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      ok: false,
      message: 'Mat khau moi phai co it nhat 8 ky tu.',
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      ok: false,
      message: 'Mat khau moi phai khac mat khau hien tai.',
    });
  }

  try {
    await changeUserPassword({
      userId: req.user.id,
      email: req.user.email,
      currentPassword,
      newPassword,
    });

    return res.status(200).json({
      ok: true,
      message: 'Doi mat khau thanh cong.',
    });
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('invalid') || message.includes('incorrect') || message.includes('wrong')) {
      return res.status(400).json({
        ok: false,
        message: 'Mat khau hien tai khong dung.',
      });
    }

    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the doi mat khau.',
    });
  }
}

module.exports = {
  requestSignupVerificationHandler,
  requestForgotPasswordHandler,
  resendVerificationHandler,
  changePasswordHandler,
};
