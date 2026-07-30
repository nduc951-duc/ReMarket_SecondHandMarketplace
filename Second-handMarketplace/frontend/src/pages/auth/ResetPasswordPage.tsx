import { KeyRound, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthFeedback, type FeedbackTone } from '@/components/auth/AuthFeedback';
import AuthLayout from '@/components/auth/AuthLayout';
import PasswordInput from '@/components/auth/PasswordInput';
import { Button, FormField } from '@/components/ui';
import { updatePassword } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import {
  hasValidationErrors,
  validateResetPasswordForm,
  type FormErrors,
  type ResetPasswordValues,
} from '@/utils/authValidation';

function ResetPasswordPage() {
  const [form, setForm] = useState<ResetPasswordValues>({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FormErrors<ResetPasswordValues>>({});
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const redirectTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(redirectTimer.current), []);

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: undefined }));
    setFeedback(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateResetPasswordForm(form);
    if (hasValidationErrors(nextErrors)) return setErrors(nextErrors);
    try {
      setSubmitting(true);
      const result = await updatePassword(form.password);
      setFeedback({ tone: 'success', message: `${result.message} Đang chuyển đến đăng nhập…` });
      redirectTimer.current = window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'Không thể cập nhật mật khẩu.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      subtitle="Tạo mật khẩu mới đủ mạnh để tiếp tục sử dụng tài khoản ReMarket."
      alternateLabel="Muốn đăng nhập ngay?"
      alternateAction="Đến trang đăng nhập"
      alternatePath="/login"
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </div>
        {!user && (
          <AuthFeedback
            tone="error"
            message="Hãy mở đúng liên kết trong email để kích hoạt phiên khôi phục mật khẩu."
          />
        )}
        <FormField label="Mật khẩu mới" htmlFor="password" error={errors.password} required>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={change}
            placeholder="Tối thiểu 8 ký tự"
          />
        </FormField>
        <FormField
          label="Nhập lại mật khẩu mới"
          htmlFor="confirmPassword"
          error={errors.confirmPassword}
          required
        >
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={change}
            placeholder="Nhập lại mật khẩu"
          />
        </FormField>
        {feedback && <AuthFeedback {...feedback} />}
        <Button type="submit" className="w-full" size="lg" disabled={submitting || !user}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Cập nhật mật khẩu
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
