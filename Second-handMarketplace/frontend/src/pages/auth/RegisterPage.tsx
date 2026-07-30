import { Globe2, Loader2 } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';

import { AuthFeedback, type FeedbackTone } from '@/components/auth/AuthFeedback';
import AuthLayout from '@/components/auth/AuthLayout';
import PasswordInput from '@/components/auth/PasswordInput';
import { Button, FormField, Input } from '@/components/ui';
import { loginWithGoogle, registerWithEmail } from '@/services/authService';
import {
  hasValidationErrors,
  validateRegisterForm,
  type FormErrors,
  type RegisterValues,
} from '@/utils/authValidation';

const initialForm: RegisterValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors<RegisterValues>>({});
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFeedback(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateRegisterForm(form);
    if (hasValidationErrors(nextErrors)) return setErrors(nextErrors);
    try {
      setSubmitting(true);
      const result = await registerWithEmail({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setFeedback({ tone: 'success', message: result.message });
      setForm(initialForm);
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'Không thể tạo tài khoản.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const googleRegister = async () => {
    try {
      setSubmitting(true);
      await loginWithGoogle();
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'Không thể đăng ký với Google.',
      });
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Tham gia cộng đồng mua bán đồ cũ an toàn và bắt đầu đăng sản phẩm của bạn."
      alternateLabel="Đã có tài khoản?"
      alternateAction="Đăng nhập"
      alternatePath="/login"
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <FormField label="Họ và tên" htmlFor="fullName" error={errors.fullName} required>
          <Input
            name="fullName"
            autoComplete="name"
            value={form.fullName}
            onChange={change}
            placeholder="Nguyễn Văn A"
          />
        </FormField>
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
            autoComplete="new-password"
            value={form.password}
            onChange={change}
            placeholder="Tối thiểu 8 ký tự"
          />
        </FormField>
        <FormField
          label="Nhập lại mật khẩu"
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
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Tạo tài khoản
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={googleRegister}
          disabled={submitting}
        >
          <Globe2 className="size-4" />
          Đăng ký với Google
        </Button>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
