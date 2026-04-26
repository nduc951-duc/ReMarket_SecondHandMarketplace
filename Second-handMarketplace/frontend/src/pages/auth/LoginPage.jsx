import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { loginWithEmail, loginWithGoogle, resendVerificationEmail } from '../../services/authService';
import { hasValidationErrors, validateLoginForm } from '../../utils/authValidation';

const defaultForm = {
  email: '',
  password: '',
};

function LoginPage() {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/app';

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
    setUnconfirmedEmail('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateLoginForm(form);
    if (hasValidationErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setUnconfirmedEmail('');
      await loginWithEmail({
        email: form.email.trim(),
        password: form.password,
      });

      navigate(redirectPath, { replace: true });
    } catch (error) {
      if (error.code === 'EMAIL_NOT_CONFIRMED') {
        setUnconfirmedEmail(error.email || form.email.trim());
      }
      setFeedback({
        type: 'error',
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
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

  const handleResendVerification = async () => {
    if (!unconfirmedEmail) {
      return;
    }

    try {
      setIsResending(true);
      setFeedback({ type: '', message: '' });
      const result = await resendVerificationEmail(unconfirmedEmail);
      setFeedback({
        type: 'success',
        message: result.message,
      });
      setUnconfirmedEmail('');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay lại ReMarket"
      alternateLabel="Chưa có tài khoản?"
      alternateAction="Đăng ký ngay"
      alternatePath="/register"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            placeholder="Tối thiểu 8 ký tự"
            className={errors.password ? 'input-error' : ''}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>

        <div className="auth-inline-links">
          <Link to="/forgot-password" className="text-link">
            Quên mật khẩu?
          </Link>
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
        >
          Đăng nhập với Google
        </button>

        {feedback.message && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}

        {unconfirmedEmail && (
          <button
            type="button"
            className="btn-resend"
            onClick={handleResendVerification}
            disabled={isResending}
          >
            {isResending ? 'Đang gửi lại...' : '📧 Gửi lại email xác nhận'}
          </button>
        )}
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
