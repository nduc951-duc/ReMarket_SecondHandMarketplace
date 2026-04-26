import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { changePassword } from '../../services/authService';
import { hasValidationErrors, validateChangePasswordForm } from '../../utils/authValidation';

const defaultForm = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

function ChangePasswordPage() {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    const nextErrors = validateChangePasswordForm(form);
    if (hasValidationErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setFeedback({
        type: 'success',
        message: `${result.message} Đang chuyển về trang chủ...`,
      });
      setForm(defaultForm);

      window.setTimeout(() => {
        navigate('/app', { replace: true });
      }, 1500);
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
      title="Đổi mật khẩu"
      subtitle="Cập nhật mật khẩu để bảo mật tài khoản của bạn"
      alternateLabel="Không muốn đổi nữa?"
      alternateAction="Quay lại trang chủ"
      alternatePath="/app"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="form-field" htmlFor="currentPassword">
          Mật khẩu hiện tại
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={handleChange}
            placeholder="Nhập mật khẩu hiện tại"
            className={errors.currentPassword ? 'input-error' : ''}
          />
          {errors.currentPassword && <span className="field-error">{errors.currentPassword}</span>}
        </label>

        <label className="form-field" htmlFor="newPassword">
          Mật khẩu mới
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={handleChange}
            placeholder="Tối thiểu 8 ký tự"
            className={errors.newPassword ? 'input-error' : ''}
          />
          {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
        </label>

        <label className="form-field" htmlFor="confirmNewPassword">
          Nhập lại mật khẩu mới
          <input
            id="confirmNewPassword"
            name="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmNewPassword}
            onChange={handleChange}
            placeholder="Nhập lại mật khẩu mới"
            className={errors.confirmNewPassword ? 'input-error' : ''}
          />
          {errors.confirmNewPassword && <span className="field-error">{errors.confirmNewPassword}</span>}
        </label>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
        </button>

        {feedback.message && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}
      </form>
    </AuthLayout>
  );
}

export default ChangePasswordPage;
