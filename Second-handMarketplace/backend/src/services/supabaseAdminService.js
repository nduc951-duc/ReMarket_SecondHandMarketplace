const { createClient } = require('@supabase/supabase-js');
const {
  FRONTEND_ORIGIN,
  RESET_PASSWORD_PATH,
  SIGNUP_CONFIRM_PATH,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');

let adminClient = null;

function buildResetRedirectUrl() {
  return new URL(RESET_PASSWORD_PATH, FRONTEND_ORIGIN).toString();
}

function buildSignupRedirectUrl() {
  return new URL(SIGNUP_CONFIRM_PATH, FRONTEND_ORIGIN).toString();
}

function getAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong backend/.env để tạo link reset password.',
    );
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

async function generateRecoveryLink(email) {
  const client = getAdminClient();

  const { data, error } = await client.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: buildResetRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  const actionLink = data?.properties?.action_link;
  if (!actionLink) {
    throw new Error('Khong tao duoc action_link cho reset password.');
  }

  return actionLink;
}

async function generateSignupLink({ email, password, userMetadata }) {
  const client = getAdminClient();

  const { data, error } = await client.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      redirectTo: buildSignupRedirectUrl(),
      data: userMetadata || {},
    },
  });

  if (error) {
    throw error;
  }

  const actionLink = data?.properties?.action_link;
  if (!actionLink) {
    throw new Error('Khong tao duoc action_link cho signup confirmation.');
  }

  return actionLink;
}

/**
 * Generate a new email confirmation link for an existing unconfirmed user.
 * Uses the 'magiclink' type with the signup redirect URL so that clicking
 * the link confirms the user's email.
 */
async function resendVerificationEmail(email) {
  const client = getAdminClient();

  // First check if user exists and is unconfirmed
  const { data: usersData, error: listError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  // Use generateLink with type 'signup' for existing unconfirmed users
  // Supabase will return the confirmation link for the existing user
  const { data, error } = await client.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: buildSignupRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  const actionLink = data?.properties?.action_link;
  if (!actionLink) {
    throw new Error('Khong tao duoc action_link cho resend verification.');
  }

  return actionLink;
}

/**
 * Change a user's password via the Supabase Admin API.
 * First verifies the current password by attempting a sign-in,
 * then updates to the new password.
 */
async function changeUserPassword({ userId, email, currentPassword, newPassword }) {
  const client = getAdminClient();

  // Verify current password by attempting sign-in
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const verifyClient = createClient(SUPABASE_URL, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError) {
    throw new Error('Mat khau hien tai khong dung.');
  }

  // Update password via admin API
  const { error: updateError } = await client.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updateError) {
    throw updateError;
  }
}

module.exports = {
  generateRecoveryLink,
  generateSignupLink,
  resendVerificationEmail,
  changeUserPassword,
};
