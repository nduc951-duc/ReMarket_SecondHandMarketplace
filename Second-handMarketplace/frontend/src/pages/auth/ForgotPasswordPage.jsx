import { useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import { requestPasswordReset } from '../../services/authService';
import { hasValidationErrors, validateForgotPasswordForm } from '../../utils/authValidation';

const defaultForm = {
  email: '',
};

function ForgotPasswordPage() {
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

    const nextErrors = validateForgotPasswordForm(form);
    if (hasValidationErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await requestPasswordReset(form.email.trim());
      setFeedback({
        type: 'success',
        message: result.message,
      });
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
      title="Quên mật khẩu"
      subtitle="Nhập email để nhận link đặt lại mật khẩu"
      alternateLabel="Đã nhớ mật khẩu?"
      alternateAction="Quay lại đăng nhập"
      alternatePath="/login"
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

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
        </button>

        {feedback.message && <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>}
      </form>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
