import { Globe2, Loader2, Mail } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AuthFeedback, type FeedbackTone } from '@/components/auth/AuthFeedback';
import AuthLayout from '@/components/auth/AuthLayout';
import PasswordInput from '@/components/auth/PasswordInput';
import { Button, FormField, Input } from '@/components/ui';
import {
  AuthenticationError,
  loginWithEmail,
  loginWithGoogle,
  resendVerificationEmail,
} from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import {
  hasValidationErrors,
  validateLoginForm,
  type FormErrors,
  type LoginValues,
} from '@/utils/authValidation';

function LoginPage() {
  const [form, setForm] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors<LoginValues>>({});
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const authError = useAuthStore((state) => state.errorMessage);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/app';

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFeedback(null);
    setUnconfirmedEmail('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateLoginForm(form);
    if (hasValidationErrors(nextErrors)) return setErrors(nextErrors);

    try {
      setSubmitting(true);
      await loginWithEmail({ email: form.email.trim(), password: form.password });
      navigate(redirectPath, { replace: true });
    } catch (caught) {
      if (caught instanceof AuthenticationError && caught.code === 'EMAIL_NOT_CONFIRMED') {
        setUnconfirmedEmail(caught.email || form.email.trim());
      }
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'Không thể đăng nhập.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const googleLogin = async () => {
    try {
      setSubmitting(true);
      setFeedback(null);
      await loginWithGoogle();
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'Không thể đăng nhập với Google.',
      });
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!unconfirmedEmail) return;
    try {
      setResending(true);
      const result = await resendVerificationEmail(unconfirmedEmail);
      setFeedback({ tone: 'success', message: result.message });
      setUnconfirmedEmail('');
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'Không thể gửi lại email.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay lại. Tiếp tục quản lý sản phẩm, đơn hàng và cuộc trò chuyện."
      alternateLabel="Chưa có tài khoản?"
      alternateAction="Đăng ký miễn phí"
      alternatePath="/register"
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <FormField label="Email" htmlFor="email" error={errors.email} required>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={change}
            placeholder="you@example.com"
          />
        </FormField>
        <FormField label="Mật khẩu" htmlFor="password" error={errors.password} required>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={change}
            placeholder="Tối thiểu 8 ký tự"
          />
        </FormField>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
        {(feedback || authError) && (
          <AuthFeedback tone={feedback?.tone || 'error'} message={feedback?.message || authError} />
        )}
        {unconfirmedEmail && (
          <Button type="button" variant="outline" className="w-full" onClick={resend}>
            {resending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            Gửi lại email xác nhận
          </Button>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Đăng nhập
        </Button>
        <div className="relative text-center text-xs text-muted-foreground before:absolute before:left-0 before:top-1/2 before:h-px before:w-[44%] before:bg-border after:absolute after:right-0 after:top-1/2 after:h-px after:w-[44%] after:bg-border">
          hoặc
        </div>
        <Button type="button" variant="outline" className="w-full" size="lg" onClick={googleLogin}>
          <Globe2 className="size-4" />
          Tiếp tục với Google
        </Button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
