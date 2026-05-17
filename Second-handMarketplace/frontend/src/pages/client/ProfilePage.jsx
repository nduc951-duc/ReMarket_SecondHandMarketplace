import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getProfile, updateProfile, uploadAvatar } from '../../services/profileService';
import { getReviewsByUser } from '../../services/reviewService';
import { cn } from '../../lib/utils';
import { Camera, Edit2, Save, X, Star, MapPin, Phone, Mail, Calendar } from 'lucide-react';

const defaultFormErrors = {};

function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [formErrors, setFormErrors] = useState(defaultFormErrors);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    bio: '',
  });
  const fileInputRef = useRef(null);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getProfile();
      setProfile(data);
      setEditForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
        bio: data.bio || '',
      });

      setIsLoadingReviews(true);
      try {
        const reviewData = await getReviewsByUser(data.id, { limit: 6 });
        setReviews(reviewData.reviews || []);
      } catch {
        setReviews([]);
      } finally {
        setIsLoadingReviews(false);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
    setFeedback({ type: '', message: '' });
  };

  const validateForm = () => {
    const errors = {};
    if (editForm.full_name.trim().length < 2) {
      errors.full_name = 'Họ tên phải có ít nhất 2 ký tự.';
    }
    if (editForm.phone.trim() && !/^[0-9+\-\s()]{8,15}$/.test(editForm.phone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ.';
    }
    if (editForm.bio.trim().length > 500) {
      errors.bio = 'Bio không được vượt quá 500 ký tự.';
    }
    if (editForm.address.trim().length > 300) {
      errors.address = 'Địa chỉ không được vượt quá 300 ký tự.';
    }
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateProfile(editForm);
      setProfile(updated);
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Cập nhật hồ sơ thành công!' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormErrors(defaultFormErrors);
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      bio: profile?.bio || '',
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setFeedback({ type: 'error', message: 'Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'File ảnh không được vượt quá 5MB.' });
      return;
    }

    try {
      setIsUploading(true);
      setFeedback({ type: '', message: '' });
      const updated = await uploadAvatar(file);
      setProfile(updated);
      setFeedback({ type: 'success', message: 'Cập nhật avatar thành công!' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-transparent text-slate-200">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-slate-400">Đang tải hồ sơ...</p>
        </div>
      </main>
    );
  }

  const avatarSrc = profile?.avatar_url || null;
  const initials = (profile?.full_name || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <div className="max-w-4xl mx-auto px-4 pb-16 pt-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors font-medium">
            ← Quay lại
          </Link>
          <h1 className="text-2xl font-display font-bold text-white">Hồ sơ cá nhân</h1>
        </div>

        {/* Profile Card */}
        <section className="bg-[#111827] rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl relative overflow-hidden" aria-label="Hồ sơ cá nhân">
          {/* Subtle background glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-teal-500/10 rounded-full blur-[60px] pointer-events-none" />

          {/* Avatar Section */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 pb-8 border-b border-white/5 relative z-10">
            <button
              type="button"
              className="relative w-28 h-28 rounded-full bg-slate-800 border-4 border-white/10 overflow-hidden flex-shrink-0 group focus:outline-none focus:ring-4 focus:ring-teal-500/30 transition-all hover:border-teal-500/50"
              onClick={handleAvatarClick}
              disabled={isUploading}
              title="Bấm để đổi avatar"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400 bg-[#0d1117]">{initials}</span>
              )}
              <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? '⏳' : <Camera size={24} />}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div className="text-center md:text-left flex-1 mt-2">
              <h2 className="text-2xl font-bold text-white mb-1">{profile?.full_name || 'Chưa cập nhật'}</h2>
              <p className="text-slate-400 font-medium mb-3 flex items-center justify-center md:justify-start gap-2">
                <Mail size={16} /> {profile?.email || user?.email}
              </p>
              
              {/* Rating Summary Snippet */}
              <div className="inline-flex items-center gap-2 bg-[#0d1117] px-4 py-2 rounded-full border border-white/5">
                <Star size={16} className="text-amber-400 fill-current" />
                <span className="font-bold text-slate-200">{(Number(profile?.rating_avg) || 0).toFixed(1)}</span>
                <span className="text-slate-500 text-sm">({profile?.rating_count || 0} đánh giá)</span>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedback.message && (
            <div className={cn("p-4 rounded-xl mt-6 text-sm font-medium border flex items-center gap-2", 
              feedback.type === 'success' ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
              {feedback.message}
            </div>
          )}

          {/* Form vs Details */}
          <div className="mt-8 relative z-10">
            {isEditing ? (
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="full_name">Họ và tên</label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    value={editForm.full_name}
                    onChange={handleEditChange}
                    className={cn("w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 transition-all", formErrors.full_name ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500" : "border-white/10 focus:border-teal-500 focus:ring-teal-500")}
                  />
                  {formErrors.full_name && <span className="text-rose-400 text-xs mt-1 block">{formErrors.full_name}</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="phone">Số điện thoại</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={editForm.phone}
                    onChange={handleEditChange}
                    className={cn("w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 transition-all", formErrors.phone ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500" : "border-white/10 focus:border-teal-500 focus:ring-teal-500")}
                  />
                  {formErrors.phone && <span className="text-rose-400 text-xs mt-1 block">{formErrors.phone}</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="address">Địa chỉ</label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={editForm.address}
                    onChange={handleEditChange}
                    className={cn("w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 transition-all", formErrors.address ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500" : "border-white/10 focus:border-teal-500 focus:ring-teal-500")}
                  />
                  {formErrors.address && <span className="text-rose-400 text-xs mt-1 block">{formErrors.address}</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="bio">Giới thiệu bản thân</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={editForm.bio}
                    onChange={handleEditChange}
                    rows="4"
                    className={cn("w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 transition-all resize-none", formErrors.bio ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500" : "border-white/10 focus:border-teal-500 focus:ring-teal-500")}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {formErrors.bio ? <span className="text-rose-400 text-xs block">{formErrors.bio}</span> : <span />}
                    <span className="text-slate-500 text-xs">{editForm.bio.length}/500</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-xl font-bold bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X size={18} /> Hủy
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-teal-400 text-slate-950 hover:shadow-[0_0_15px_rgba(0,212,180,0.4)] transition-all flex items-center justify-center gap-2"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Đang lưu...' : <><Save size={18} /> Lưu thay đổi</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0d1117] p-5 rounded-2xl border border-white/5 flex gap-4 items-start">
                    <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400 shrink-0"><Phone size={20} /></div>
                    <div>
                      <span className="text-sm text-slate-400 block mb-1">Số điện thoại</span>
                      <span className="font-medium text-slate-200">{profile?.phone || '—'}</span>
                    </div>
                  </div>
                  
                  <div className="bg-[#0d1117] p-5 rounded-2xl border border-white/5 flex gap-4 items-start">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 shrink-0"><MapPin size={20} /></div>
                    <div>
                      <span className="text-sm text-slate-400 block mb-1">Địa chỉ</span>
                      <span className="font-medium text-slate-200">{profile?.address || '—'}</span>
                    </div>
                  </div>

                  <div className="bg-[#0d1117] p-5 rounded-2xl border border-white/5 flex gap-4 items-start md:col-span-2">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 shrink-0"><Calendar size={20} /></div>
                    <div>
                      <span className="text-sm text-slate-400 block mb-1">Ngày tham gia</span>
                      <span className="font-medium text-slate-200">
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0d1117] p-5 rounded-2xl border border-white/5 flex flex-col gap-2 mt-2">
                  <span className="text-sm text-slate-400">Giới thiệu</span>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{profile?.bio || 'Chưa có thông tin giới thiệu.'}</p>
                </div>

                <button
                  type="button"
                  className="mt-4 w-full md:w-auto self-start px-6 py-3 rounded-xl font-bold bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 size={18} /> Chỉnh sửa hồ sơ
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Reviews Section */}
        <section className="mt-12">
          <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
            Đánh giá từ người mua
          </h3>
          {isLoadingReviews ? (
            <p className="text-slate-400 bg-[#111827] p-6 rounded-2xl border border-white/5 text-center">Đang tải đánh giá...</p>
          ) : reviews.length === 0 ? (
            <p className="text-slate-400 bg-[#111827] p-6 rounded-2xl border border-white/5 text-center">Bạn chưa có đánh giá nào.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <article key={review.id} className="bg-[#111827] p-5 rounded-2xl border border-white/5 transition-all hover:border-teal-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <strong className="text-slate-200">{review.reviewer_profile?.full_name || 'Người dùng'}</strong>
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} className={i < review.rating ? "fill-current" : "text-slate-600"} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-slate-300 mb-3 text-sm">{review.comment}</p>}
                  <small className="text-slate-500 text-xs">
                    {new Date(review.created_at).toLocaleDateString('vi-VN')}
                  </small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;
