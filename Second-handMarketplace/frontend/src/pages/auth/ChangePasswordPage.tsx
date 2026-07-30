import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthFeedback, type FeedbackTone } from '@/components/auth/AuthFeedback';
import AuthLayout from '@/components/auth/AuthLayout';
import PasswordInput from '@/components/auth/PasswordInput';
import { Button, FormField } from '@/components/ui';
import { changePassword } from '@/services/authService';
import {
  hasValidationErrors,
  validateChangePasswordForm,
  type ChangePasswordValues,
  type FormErrors,
} from '@/utils/authValidation';

const initialForm: ChangePasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

function ChangePasswordPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors<ChangePasswordValues>>({});
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
    const nextErrors = validateChangePasswordForm(form);
    if (hasValidationErrors(nextErrors)) return setErrors(nextErrors);
    try {
      setSubmitting(true);
      const result = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setFeedback({ tone: 'success', message: `${result.message} Đang quay lại hồ sơ…` });
      setForm(initialForm);
      redirectTimer.current = window.setTimeout(
        () => navigate('/profile', { replace: true }),
        1200,
      );
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'Không thể đổi mật khẩu.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Đổi mật khẩu"
      subtitle="Xác nhận mật khẩu hiện tại và chọn mật khẩu mới để bảo vệ tài khoản."
      alternateLabel="Không muốn thay đổi?"
      alternateAction="Quay lại hồ sơ"
      alternatePath="/profile"
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <FormField
          label="Mật khẩu hiện tại"
          htmlFor="currentPassword"
          error={errors.currentPassword}
          required
        >
          <PasswordInput
            name="currentPassword"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={change}
            placeholder="Nhập mật khẩu hiện tại"
          />
        </FormField>
        <FormField label="Mật khẩu mới" htmlFor="newPassword" error={errors.newPassword} required>
          <PasswordInput
            name="newPassword"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={change}
            placeholder="Tối thiểu 8 ký tự"
          />
        </FormField>
        <FormField
          label="Nhập lại mật khẩu mới"
          htmlFor="confirmNewPassword"
          error={errors.confirmNewPassword}
          required
        >
          <PasswordInput
            name="confirmNewPassword"
            autoComplete="new-password"
            value={form.confirmNewPassword}
            onChange={change}
            placeholder="Nhập lại mật khẩu mới"
          />
        </FormField>
        {feedback && <AuthFeedback {...feedback} />}
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Đổi mật khẩu
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ChangePasswordPage;
