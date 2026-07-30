import { Loader2, MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { AuthFeedback, type FeedbackTone } from '@/components/auth/AuthFeedback';
import AuthLayout from '@/components/auth/AuthLayout';
import { Button, FormField, Input } from '@/components/ui';
import { requestPasswordReset } from '@/services/authService';
import {
  hasValidationErrors,
  validateForgotPasswordForm,
  type FormErrors,
  type ForgotPasswordValues,
} from '@/utils/authValidation';

function ForgotPasswordPage() {
  const [form, setForm] = useState<ForgotPasswordValues>({ email: '' });
  const [errors, setErrors] = useState<FormErrors<ForgotPasswordValues>>({});
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForgotPasswordForm(form);
    if (hasValidationErrors(nextErrors)) return setErrors(nextErrors);
    try {
      setSubmitting(true);
      const result = await requestPasswordReset(form.email.trim());
      setFeedback({ tone: 'success', message: result.message });
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'Không thể gửi email khôi phục.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Quên mật khẩu?"
      subtitle="Nhập email tài khoản. Nếu thông tin khớp, chúng tôi sẽ gửi liên kết khôi phục."
      alternateLabel="Đã nhớ mật khẩu?"
      alternateAction="Quay lại đăng nhập"
      alternatePath="/login"
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </div>
        <FormField label="Email" htmlFor="email" error={errors.email} required>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => {
              setForm({ email: event.target.value });
              setErrors({});
              setFeedback(null);
            }}
            placeholder="you@example.com"
          />
        </FormField>
        {feedback && <AuthFeedback {...feedback} />}
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Gửi liên kết khôi phục
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
