import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { updatePassword } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { hasValidationErrors, validateResetPasswordForm } from '../../utils/authValidation';

const defaultForm = {
  password: '',
  confirmPassword: '',
};

function ResetPasswordPage() {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

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

    const nextErrors = validateResetPasswordForm(form);
    if (hasValidationErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await updatePassword(form.password);
      setFeedback({
        type: 'success',
        message: `${result.message} Đang chuyển về trang đăng nhập...`,
      });

      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      subtitle="Tạo mật khẩu mới để tiếp tục sử dụng ReMarket"
      alternateLabel="Muốn đăng nhập lại ngay?"
      alternateAction="Đến trang đăng nhập"
      alternatePath="/login"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {!user && (
          <p className="auth-notice">
            Hãy mở đúng link từ email đặt lại mật khẩu để phiên khôi phục được kích hoạt.
          </p>
        )}

        <label className="form-field" htmlFor="password">
          Mật khẩu mới
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
          Nhập lại mật khẩu mới
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
          {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>

        {feedback.message && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
