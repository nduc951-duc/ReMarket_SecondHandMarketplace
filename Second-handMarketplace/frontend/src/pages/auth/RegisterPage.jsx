import { useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import { loginWithGoogle, registerWithEmail } from '../../services/authService';
import { hasValidationErrors, validateRegisterForm } from '../../utils/authValidation';

const defaultForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function RegisterPage() {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: '',
    }));

    setFeedback({ type: '', message: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateRegisterForm(form);
    if (hasValidationErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await registerWithEmail({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setFeedback({
        type: 'success',
        message: result.message,
      });
      setForm(defaultForm);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setIsSubmitting(true);
      setFeedback({ type: '', message: '' });
      await loginWithGoogle();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Bắt đầu mua bán an toàn cùng ReMarket"
      alternateLabel="Đã có tài khoản?"
      alternateAction="Đăng nhập"
      alternatePath="/login"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="form-field" htmlFor="fullName">
          Họ và tên
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Nguyễn Văn A"
            className={errors.fullName ? 'input-error' : ''}
          />
          {errors.fullName && <span className="field-error">{errors.fullName}</span>}
        </label>

        <label className="form-field" htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={errors.email ? 'input-error' : ''}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>

        <label className="form-field" htmlFor="password">
          Mật khẩu
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            placeholder="Tối thiểu 8 ký tự"
            className={errors.password ? 'input-error' : ''}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>

        <label className="form-field" htmlFor="confirmPassword">
          Nhập lại mật khẩu
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Nhập lại mật khẩu"
            className={errors.confirmPassword ? 'input-error' : ''}
          />
          {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
        </label>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Đang xử lý...' : 'Tạo tài khoản'}
        </button>

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleRegister}
          disabled={isSubmitting}
        >
          Đăng ký với Google
        </button>

        {feedback.message && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
