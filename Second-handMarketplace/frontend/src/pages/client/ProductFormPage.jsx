import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProduct, getProductById, updateProduct, uploadImages } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';

const defaultForm = {
  title: '',
  description: '',
  price: '',
  category: '',
  condition: 'good',
  location: '',
};

const categories = [
  'Điện tử',
  'Thời trang',
  'Đồ gia dụng',
  'Sách vở',
  'Thể thao',
  'Ô tô - Xe máy',
  'Bất động sản',
  'Khác',
];

function ProductFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [form, setForm] = useState(defaultForm);
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const fileInputRef = useRef(null);

  const loadProduct = useCallback(async () => {
    if (!isEditMode) return;
    try {
      setIsLoading(true);
      const data = await getProductById(id);
      setForm({
        title: data.title || '',
        description: data.description || '',
        price: data.price || '',
        category: data.category || '',
        condition: data.condition || 'good',
        location: data.location || '',
      });
      setExistingImages(data.images || []);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Không thể tải thông tin sản phẩm: ' + err.message });
    } finally {
      setIsLoading(false);
    }
  }, [id, isEditMode]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setFeedback({ type: '', message: '' });
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files);

    const validFiles = [];
    const invalidFiles = [];

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        invalidFiles.push(`${file.name}: Chỉ chấp nhận file hình ảnh`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name}: Kích thước file không được vượt quá 5MB`);
        return;
      }
      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      setFeedback({
        type: 'error',
        message: `Các file không hợp lệ:\n${invalidFiles.join('\n')}`,
      });
      return;
    }

    const totalImages = existingImages.length + newImageFiles.length + validFiles.length;
    if (totalImages > 5) {
      setFeedback({
        type: 'error',
        message: 'Chỉ được upload tối đa 5 hình ảnh.',
      });
      return;
    }

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setNewImagePreviews((prev) => [...prev, ...newPreviews]);
    setNewImageFiles((prev) => [...prev, ...validFiles]);
    setFeedback({ type: '', message: '' });
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index) => {
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.title.trim()) {
      newErrors.title = 'Tiêu đề sản phẩm là bắt buộc';
    } else if (form.title.trim().length < 10 || form.title.trim().length > 200) {
      newErrors.title = 'Tiêu đề phải từ 10 đến 200 ký tự';
    }

    if (!form.price || isNaN(form.price) || parseFloat(form.price) <= 0) {
      newErrors.price = 'Giá sản phẩm phải là số dương';
    }

    if (!form.category) {
      newErrors.category = 'Danh mục là bắt buộc';
    }

    if (existingImages.length === 0 && newImageFiles.length === 0) {
      newErrors.images = 'Ít nhất một hình ảnh là bắt buộc';
    }

    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback({ type: 'info', message: 'Đang xử lý...' });

      let uploadedImageUrls = [];
      if (newImageFiles.length > 0) {
        setFeedback({ type: 'info', message: 'Đang upload hình ảnh mới...' });
        const uploadResult = await uploadImages(newImageFiles);
        uploadedImageUrls = uploadResult.map((img) => img.url);
      }

      const finalImages = [...existingImages, ...uploadedImageUrls];
      const productData = {
        ...form,
        price: parseFloat(form.price),
        images: finalImages,
      };

      if (isEditMode) {
        setFeedback({ type: 'info', message: 'Đang cập nhật sản phẩm...' });
        await updateProduct(id, productData);
        setFeedback({ type: 'success', message: 'Cập nhật sản phẩm thành công!' });
      } else {
        setFeedback({ type: 'info', message: 'Đang tạo sản phẩm...' });
        await createProduct(productData);
        setFeedback({ type: 'success', message: 'Tạo sản phẩm thành công!' });
      }

      setTimeout(() => navigate('/my-products'), 1500);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <main className="page-shell">
        <section className="auth-required-card">
          <h2>Bạn cần đăng nhập</h2>
          <p>Vui lòng đăng nhập để đăng sản phẩm.</p>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="page-shell">
        <div className="page-loading">
          <div className="loading-spinner" />
          <p>Đang tải thông tin sản phẩm...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-left">
            <button type="button" onClick={() => navigate(-1)} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ← Quay lại
            </button>
            <h1>{isEditMode ? 'Sửa sản phẩm' : 'Đăng sản phẩm mới'}</h1>
          </div>
        </div>

        <div className="product-form-card">
          <form onSubmit={handleSubmit} className="product-form" noValidate>
            <label className="form-field" htmlFor="title">
              Tiêu đề sản phẩm *
              <input
                type="text"
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Nhập tiêu đề sản phẩm"
                className={errors.title ? 'input-error' : ''}
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </label>

            <label className="form-field" htmlFor="description">
              Mô tả sản phẩm
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Mô tả chi tiết về sản phẩm"
              />
            </label>

            <div className="form-row-2">
              <label className="form-field" htmlFor="price">
                Giá (VNĐ) *
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  placeholder="0"
                  className={errors.price ? 'input-error' : ''}
                />
                {errors.price && <span className="field-error">{errors.price}</span>}
              </label>

              <label className="form-field" htmlFor="category">
                Danh mục *
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className={errors.category ? 'input-error' : ''}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && <span className="field-error">{errors.category}</span>}
              </label>
            </div>

            <div className="form-row-2">
              <label className="form-field" htmlFor="condition">
                Tình trạng
                <select
                  id="condition"
                  name="condition"
                  value={form.condition}
                  onChange={handleChange}
                >
                  <option value="new">Mới</option>
                  <option value="like_new">Như mới</option>
                  <option value="good">Tốt</option>
                  <option value="fair">Khá</option>
                  <option value="poor">Cũ</option>
                </select>
              </label>

              <label className="form-field" htmlFor="location">
                Địa điểm
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Ví dụ: Hà Nội, TP.HCM"
                />
              </label>
            </div>

            <div className="form-field">
              <span>Hình ảnh sản phẩm * (tối đa 5 ảnh)</span>
              
              <div
                className="image-upload-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                />
                <div className="image-upload-label">
                  <span className="image-upload-icon">📸</span>
                  <span>Bấm để chọn ảnh hoặc kéo thả vào đây</span>
                  <span className="form-hint">Chọn nhiều ảnh cùng lúc. Mỗi ảnh tối đa 5MB.</span>
                </div>
              </div>

              {(existingImages.length > 0 || newImagePreviews.length > 0) && (
                <div className="image-previews">
                  {existingImages.map((imgUrl, index) => (
                    <div key={`existing-${index}`} className="image-preview-item">
                      <img src={imgUrl} alt={`Existing ${index + 1}`} />
                      <button type="button" onClick={() => removeExistingImage(index)} className="image-remove-btn">×</button>
                    </div>
                  ))}
                  {newImagePreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="image-preview-item">
                      <img src={preview} alt={`New ${index + 1}`} />
                      <button type="button" onClick={() => removeNewImage(index)} className="image-remove-btn">×</button>
                    </div>
                  ))}
                </div>
              )}
              {errors.images && <span className="field-error">{errors.images}</span>}
            </div>

            {feedback.message && (
              <p className={`form-feedback ${feedback.type}`}>{feedback.message}</p>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-outline"
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Đang xử lý...' : isEditMode ? '💾 Lưu thay đổi' : '📦 Đăng sản phẩm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default ProductFormPage;