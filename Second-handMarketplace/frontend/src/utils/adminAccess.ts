import type { User } from '@supabase/supabase-js';

export type UserRole = 'guest' | 'customer' | 'seller' | 'agent' | 'admin' | string;

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

export function getUserRole(user: User | null | undefined): UserRole {
  if (!user) {
    return 'guest';
  }

  const role = String(user.user_metadata?.role || user.app_metadata?.role || '').toLowerCase();

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

export function isAdminUser(user: User | null | undefined) {
  return getUserRole(user) === 'admin';
}

export function isAgentUser(user: User | null | undefined) {
  return getUserRole(user) === 'agent';
}
