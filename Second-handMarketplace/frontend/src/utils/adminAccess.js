export function parseAdminEmails() {
  return String(import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function parseAgentEmails() {
  return String(import.meta.env.VITE_AGENT_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getUserRole(user) {
  if (!user) {
    return 'guest';
  }

  const role = String(
    user.user_metadata?.role || user.app_metadata?.role || '',
  ).toLowerCase();

  if (role) {
    return role;
  }

  const email = String(user.email || '').toLowerCase();
  if (!email) {
    return 'customer';
  }

  if (parseAdminEmails().includes(email)) {
    return 'admin';
  }

  if (parseAgentEmails().includes(email)) {
    return 'agent';
  }

  return 'customer';
}

export function isAdminUser(user) {
  return getUserRole(user) === 'admin';
}

export function isAgentUser(user) {
  return getUserRole(user) === 'agent';
}