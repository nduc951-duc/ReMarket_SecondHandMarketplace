import { describe, expect, it } from 'vitest';

import {
  hasValidationErrors,
  validateChangePasswordForm,
  validateForgotPasswordForm,
  validateLoginForm,
  validateRegisterForm,
  validateResetPasswordForm,
} from '../src/utils/authValidation';

describe('auth validation', () => {
  it('accepts valid login credentials', () => {
    expect(
      validateLoginForm({
        email: 'buyer@test.com',
        password: 'ValidPass@123',
      }),
    ).toEqual({});
  });

  it('reports invalid email and short password', () => {
    const errors = validateLoginForm({
      email: 'not-an-email',
      password: 'short',
    });

    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
    expect(hasValidationErrors(errors)).toBe(true);
  });

  it('checks required registration name and matching password confirmation', () => {
    const errors = validateRegisterForm({
      fullName: '',
      email: 'seller@test.com',
      password: 'ValidPass@123',
      confirmPassword: 'Different@123',
    });

    expect(errors.fullName).toBeTruthy();
    expect(errors.confirmPassword).toBeTruthy();
  });

  it('accepts a valid email-only forgot password flow', () => {
    expect(validateForgotPasswordForm({ email: 'admin@test.com' })).toEqual({});
  });

  it('requires matching reset password confirmation', () => {
    const errors = validateResetPasswordForm({
      password: 'NewPass@123',
      confirmPassword: 'OtherPass@123',
    });

    expect(errors.confirmPassword).toBeTruthy();
  });

  it('rejects an unchanged password', () => {
    const errors = validateChangePasswordForm({
      currentPassword: 'SamePass@123',
      newPassword: 'SamePass@123',
      confirmNewPassword: 'SamePass@123',
    });

    expect(errors.newPassword).toBeTruthy();
  });
});
