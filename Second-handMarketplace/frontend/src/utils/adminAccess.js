export function parseAdminEmails() {
  return String(import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user) {
  if (!user) {
    return false;
  }

  const role = String(
    user.user_metadata?.role || user.app_metadata?.role || '',
  ).toLowerCase();

  if (role === 'admin') {
    return true;
  }

  const email = String(user.email || '').toLowerCase();
  if (!email) {
    return false;
  }

  return parseAdminEmails().includes(email);
}