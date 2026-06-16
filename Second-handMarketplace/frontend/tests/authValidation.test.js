import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasValidationErrors,
  validateChangePasswordForm,
  validateForgotPasswordForm,
  validateLoginForm,
  validateRegisterForm,
  validateResetPasswordForm,
} from '../src/utils/authValidation.js';

test('validateLoginForm accepts valid credentials', () => {
  assert.deepEqual(
    validateLoginForm({
      email: 'buyer@test.com',
      password: 'Buyer@123',
    }),
    {},
  );
});

test('validateLoginForm reports invalid email and short password', () => {
  const errors = validateLoginForm({
    email: 'not-an-email',
    password: 'short',
  });

  assert.equal(Boolean(errors.email), true);
  assert.equal(Boolean(errors.password), true);
  assert.equal(hasValidationErrors(errors), true);
});

test('validateRegisterForm checks required name and matching password confirmation', () => {
  const errors = validateRegisterForm({
    fullName: '',
    email: 'seller@test.com',
    password: 'Seller@123',
    confirmPassword: 'Different@123',
  });

  assert.equal(Boolean(errors.fullName), true);
  assert.equal(Boolean(errors.confirmPassword), true);
});

test('validateForgotPasswordForm accepts a valid email only flow', () => {
  assert.deepEqual(validateForgotPasswordForm({ email: 'admin@test.com' }), {});
});

test('validateResetPasswordForm requires matching password confirmation', () => {
  const errors = validateResetPasswordForm({
    password: 'NewPass@123',
    confirmPassword: 'OtherPass@123',
  });

  assert.equal(Boolean(errors.confirmPassword), true);
});

test('validateChangePasswordForm rejects unchanged password', () => {
  const errors = validateChangePasswordForm({
    currentPassword: 'SamePass@123',
    newPassword: 'SamePass@123',
    confirmNewPassword: 'SamePass@123',
  });

  assert.equal(Boolean(errors.newPassword), true);
});
