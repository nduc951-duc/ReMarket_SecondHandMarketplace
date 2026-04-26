import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getProfile, updateProfile, uploadAvatar } from '../../services/profileService';

const defaultFormErrors = {};

function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState(null);
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
      <main className="page-shell">
        <div className="page-loading">
          <div className="loading-spinner" />
          <p>Đang tải hồ sơ...</p>
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
    <main className="page-shell">
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <Link to="/app" className="back-link">← Quay lại</Link>
            <h1>Hồ sơ cá nhân</h1>
          </div>
        </div>

        {/* Profile Card */}
        <section className="profile-card" aria-label="Hồ sơ cá nhân">
          {/* Avatar Section */}
          <div className="profile-avatar-section">
            <button
              type="button"
              className="avatar-wrapper"
              onClick={handleAvatarClick}
              disabled={isUploading}
              title="Bấm để đổi avatar"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="avatar-img" />
              ) : (
                <span className="avatar-initials">{initials}</span>
              )}
              <span className="avatar-overlay">
                {isUploading ? '⏳' : '📷'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden-input"
            />
            <div className="avatar-info">
              <h2>{profile?.full_name || 'Chưa cập nhật'}</h2>
              <p className="profile-email">{profile?.email || user?.email}</p>
            </div>
          </div>

          {/* Feedback */}
          {feedback.message && (
            <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>
          )}

          {/* Profile Details */}
          {isEditing ? (
            <div className="profile-form">
              <label className="form-field" htmlFor="full_name">
                Họ và tên
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={editForm.full_name}
                  onChange={handleEditChange}
                  placeholder="Nguyễn Văn A"
                  className={formErrors.full_name ? 'input-error' : ''}
                />
                {formErrors.full_name && <span className="field-error">{formErrors.full_name}</span>}
              </label>

              <label className="form-field" htmlFor="phone">
                Số điện thoại
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  placeholder="0912 345 678"
                  className={formErrors.phone ? 'input-error' : ''}
                />
                {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
              </label>

              <label className="form-field" htmlFor="address">
                Địa chỉ
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={editForm.address}
                  onChange={handleEditChange}
                  placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                  className={formErrors.address ? 'input-error' : ''}
                />
                {formErrors.address && <span className="field-error">{formErrors.address}</span>}
              </label>

              <label className="form-field" htmlFor="bio">
                Giới thiệu bản thân
                <textarea
                  id="bio"
                  name="bio"
                  value={editForm.bio}
                  onChange={handleEditChange}
                  placeholder="Viết vài dòng về bạn..."
                  rows="3"
                  className={formErrors.bio ? 'input-error' : ''}
                />
                <span className="char-count">{editForm.bio.length}/500</span>
                {formErrors.bio && <span className="field-error">{formErrors.bio}</span>}
              </label>

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-details">
              <div className="detail-row">
                <span className="detail-label">📧 Email</span>
                <span className="detail-value">{profile?.email || user?.email || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">📱 Số điện thoại</span>
                <span className="detail-value">{profile?.phone || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">📍 Địa chỉ</span>
                <span className="detail-value">{profile?.address || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">📝 Giới thiệu</span>
                <span className="detail-value bio-text">{profile?.bio || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">📅 Tham gia</span>
                <span className="detail-value">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </span>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Chỉnh sửa hồ sơ
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;
