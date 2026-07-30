export type FormErrors<T> = Partial<Record<keyof T, string>>;

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues extends LoginValues {
  fullName: string;
  confirmPassword: string;
}

export interface ForgotPasswordValues {
  email: string;
}

export interface ResetPasswordValues {
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string) {
  if (!email?.trim()) return 'Vui lòng nhập email.';
  if (!emailRegex.test(email.trim())) return 'Email không đúng định dạng.';
  return '';
}

export function validateLoginForm(values: LoginValues): FormErrors<LoginValues> {
  const errors: FormErrors<LoginValues> = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = 'Vui lòng nhập mật khẩu.';
  else if (values.password.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
  return errors;
}

export function validateRegisterForm(values: RegisterValues): FormErrors<RegisterValues> {
  const errors: FormErrors<RegisterValues> = validateLoginForm(values);
  if (!values.fullName?.trim()) errors.fullName = 'Vui lòng nhập họ tên.';
  else if (values.fullName.trim().length < 2) errors.fullName = 'Họ tên phải có ít nhất 2 ký tự.';
  if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
  else if (values.confirmPassword !== values.password)
    errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
  return errors;
}

export function validateForgotPasswordForm(
  values: ForgotPasswordValues,
): FormErrors<ForgotPasswordValues> {
  const email = validateEmail(values.email);
  return email ? { email } : {};
}

export function validateResetPasswordForm(
  values: ResetPasswordValues,
): FormErrors<ResetPasswordValues> {
  const errors: FormErrors<ResetPasswordValues> = {};
  if (!values.password) errors.password = 'Vui lòng nhập mật khẩu mới.';
  else if (values.password.length < 8) errors.password = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu mới.';
  else if (values.confirmPassword !== values.password)
    errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
  return errors;
}

export function validateChangePasswordForm(
  values: ChangePasswordValues,
): FormErrors<ChangePasswordValues> {
  const errors: FormErrors<ChangePasswordValues> = {};
  if (!values.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
  if (!values.newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới.';
  else if (values.newPassword.length < 8)
    errors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  else if (values.currentPassword === values.newPassword)
    errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  if (!values.confirmNewPassword) errors.confirmNewPassword = 'Vui lòng nhập lại mật khẩu mới.';
  else if (values.confirmNewPassword !== values.newPassword)
    errors.confirmNewPassword = 'Mật khẩu nhập lại không khớp.';
  return errors;
}

export function hasValidationErrors(errors: object) {
  return Object.keys(errors).length > 0;
}
