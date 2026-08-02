import {
  CalendarDays,
  Camera,
  Check,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShoppingBag,
  Star,
  Store,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import {
  Avatar,
  Button,
  buttonVariants,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Skeleton,
  Textarea,
} from '@/components/ui';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  type ProfileUpdateInput,
} from '@/services/profileService';
import { getReviewsByUser } from '@/services/reviewService';
import { getTransactionStats } from '@/services/transactionService';
import { useAuthStore } from '@/store/authStore';
import type { Profile, Review, TransactionStats } from '@/types/domain';

type ProfileErrors = Partial<Record<keyof ProfileUpdateInput, string>>;

export function validateProfileForm(form: ProfileUpdateInput): ProfileErrors {
  const errors: ProfileErrors = {};
  if (form.full_name.trim().length < 2) errors.full_name = 'Họ tên phải có ít nhất 2 ký tự.';
  if (form.phone.trim() && !/^[0-9+\-\s()]{8,15}$/.test(form.phone.trim()))
    errors.phone = 'Số điện thoại không hợp lệ.';
  if (form.address.trim().length > 300) errors.address = 'Địa chỉ không được vượt quá 300 ký tự.';
  if (form.bio.trim().length > 500) errors.bio = 'Giới thiệu không được vượt quá 500 ký tự.';
  return errors;
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(value));
}

function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [form, setForm] = useState<ProfileUpdateInput>({
    full_name: '',
    phone: '',
    address: '',
    bio: '',
  });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getProfile();
      setProfile(data);
      setForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
        bio: data.bio || '',
      });
      const [reviewResult, statsResult] = await Promise.allSettled([
        getReviewsByUser(data.id, { limit: 6 }),
        getTransactionStats(),
      ]);
      setReviews(reviewResult.status === 'fulfilled' ? reviewResult.value.reviews || [] : []);
      setStats(statsResult.status === 'fulfilled' ? statsResult.value : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải hồ sơ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSuccess('');
  };

  const save = async () => {
    const nextErrors = validateProfileForm(form);
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    try {
      setSaving(true);
      setError('');
      setProfile(await updateProfile(form));
      setEditing(false);
      setSuccess('Hồ sơ đã được cập nhật.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setEditing(false);
    setErrors({});
    setForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      bio: profile?.bio || '',
    });
  };

  const changeAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh đại diện không được vượt quá 5 MB.');
      return;
    }
    try {
      setUploading(true);
      setError('');
      setProfile(await uploadAvatar(file));
      setSuccess('Ảnh đại diện đã được cập nhật.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải ảnh đại diện.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <MarketplaceLayout className="space-y-5">
        <Skeleton className="h-56 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-3xl" />
      </MarketplaceLayout>
    );
  }

  if (!profile) {
    return (
      <MarketplaceLayout>
        <ErrorState title="Chưa thể tải hồ sơ" description={error} onRetry={load} />
      </MarketplaceLayout>
    );
  }

  const fallback = (profile.full_name || user?.email || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return (
    <MarketplaceLayout className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="absolute -right-20 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <button
            type="button"
            className="group relative w-fit rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Đổi ảnh đại diện"
          >
            <Avatar
              src={profile.avatar_url}
              alt={profile.full_name || 'Ảnh đại diện'}
              fallback={fallback}
              className="size-28 border-4 border-background text-2xl shadow-lg"
            />
            <span className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground">
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </span>
          </button>
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={changeAvatar}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">Hồ sơ cá nhân</p>
            <h1 className="mt-1 truncate text-3xl font-bold">
              {profile.full_name || 'Chưa cập nhật họ tên'}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" />
              {profile.email || user?.email}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 font-semibold text-warning">
                <Star className="size-4 fill-current" />
                {Number(profile.rating_avg || 0).toFixed(1)} ({profile.rating_count || 0} đánh giá)
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                Thành viên từ {formatDate(profile.created_at)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/change-password" className={buttonVariants({ variant: 'outline' })}>
              <KeyRound className="size-4" />
              Bảo mật
            </Link>
            {!editing && (
              <Button onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
                Chỉnh sửa
              </Button>
            )}
          </div>
        </div>
      </section>

      {error && <ErrorState title="Có lỗi xảy ra" description={error} onRetry={load} />}
      {success && (
        <p className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 p-3 text-sm text-success">
          <Check className="size-4" />
          {success}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Đơn mua', value: stats?.totalBuy || 0, icon: ShoppingBag },
          { label: 'Đơn bán', value: stats?.totalSell || 0, icon: Store },
          {
            label: 'Hoàn tất',
            value: (stats?.completedBuy || 0) + (stats?.completedSell || 0),
            icon: Check,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 pt-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <strong className="text-2xl">{value}</strong>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="pt-6">
          {editing ? (
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Họ và tên" htmlFor="full_name" error={errors.full_name} required>
                <Input name="full_name" value={form.full_name} onChange={change} />
              </FormField>
              <FormField label="Số điện thoại" htmlFor="phone" error={errors.phone}>
                <Input name="phone" type="tel" value={form.phone} onChange={change} />
              </FormField>
              <FormField
                label="Địa chỉ"
                htmlFor="address"
                error={errors.address}
                className="md:col-span-2"
              >
                <Input name="address" value={form.address} onChange={change} />
              </FormField>
              <FormField
                label="Giới thiệu"
                htmlFor="bio"
                error={errors.bio}
                description={`${form.bio.length}/500 ký tự`}
                className="md:col-span-2"
              >
                <Textarea name="bio" rows={5} maxLength={500} value={form.bio} onChange={change} />
              </FormField>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button variant="outline" onClick={cancel} disabled={saving}>
                  <X className="size-4" />
                  Hủy
                </Button>
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: 'Số điện thoại', value: profile.phone || 'Chưa cập nhật', icon: Phone },
                { label: 'Địa chỉ', value: profile.address || 'Chưa cập nhật', icon: MapPin },
                {
                  label: 'Ngày tham gia',
                  value: formatDate(profile.created_at),
                  icon: CalendarDays,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex gap-3 rounded-2xl bg-muted/60 p-4">
                  <Icon className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl bg-muted/60 p-4 md:col-span-2">
                <p className="text-xs text-muted-foreground">Giới thiệu</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {profile.bio || 'Bạn chưa thêm phần giới thiệu.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section>
        <div className="mb-4">
          <p className="text-sm font-semibold text-primary">Uy tín cộng đồng</p>
          <h2 className="mt-1 text-2xl font-bold">Đánh giá gần đây</h2>
        </div>
        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Chưa có đánh giá"
            description="Đánh giá từ các giao dịch hoàn tất sẽ xuất hiện tại đây."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{review.reviewer_profile?.full_name || 'Người dùng ReMarket'}</strong>
                    <span className="flex text-warning">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`size-4 ${index < review.rating ? 'fill-current' : 'opacity-25'}`}
                        />
                      ))}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {review.comment || 'Người dùng không để lại nhận xét.'}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </MarketplaceLayout>
  );
}

export default ProfilePage;
