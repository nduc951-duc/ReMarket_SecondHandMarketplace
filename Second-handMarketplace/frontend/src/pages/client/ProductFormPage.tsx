import { ArrowLeft, ImagePlus, Loader2, PackagePlus, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  FormField,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import {
  createProduct,
  getProductById,
  updateProduct,
  uploadImages,
} from '@/services/productService';
import { useAuthStore } from '@/store/authStore';

interface ProductFormValue {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  location: string;
}

type ProductFormErrors = Partial<Record<keyof ProductFormValue | 'images', string>>;

const initialForm: ProductFormValue = {
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

export function validateProductForm(form: ProductFormValue, imageCount: number): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = 'Vui lòng nhập tiêu đề sản phẩm.';
  else if (title.length < 10 || title.length > 200) {
    errors.title = 'Tiêu đề cần từ 10 đến 200 ký tự.';
  }
  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Giá phải là số lớn hơn 0.';
  if (!form.category) errors.category = 'Vui lòng chọn danh mục.';
  if (imageCount === 0) errors.images = 'Cần ít nhất một hình ảnh sản phẩm.';
  return errors;
}

function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const editMode = Boolean(id);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [form, setForm] = useState<ProductFormValue>(initialForm);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'info' | 'success';
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(editMode);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const allowNavigation = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadProduct = useCallback(async () => {
    if (!editMode || !id) return;
    try {
      setLoading(true);
      const product = await getProductById(id, { skipView: true });
      setForm({
        title: product.title || '',
        description: product.description || '',
        price: product.price ? String(product.price) : '',
        category:
          typeof product.category === 'string' ? product.category : product.category?.name || '',
        condition: product.condition || 'good',
        location: product.location || '',
      });
      setExistingImages(product.images || []);
    } catch (caught) {
      setFeedback({
        tone: 'error',
        text: caught instanceof Error ? caught.message : 'Không thể tải sản phẩm.',
      });
    } finally {
      setLoading(false);
    }
  }, [editMode, id]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || allowNavigation.current) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  const updateField = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFeedback(null);
    setDirty(true);
  };

  const addImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const invalid = files.find(
      (file) => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024,
    );
    if (invalid) {
      setFeedback({ tone: 'error', text: 'Chỉ nhận file ảnh, tối đa 5 MB cho mỗi ảnh.' });
      return;
    }
    if (existingImages.length + newFiles.length + files.length > 5) {
      setFeedback({ tone: 'error', text: 'Mỗi sản phẩm được đăng tối đa 5 ảnh.' });
      return;
    }
    setNewFiles((current) => [...current, ...files]);
    setNewPreviews((current) => [...current, ...files.map((file) => URL.createObjectURL(file))]);
    setErrors((current) => ({ ...current, images: undefined }));
    setDirty(true);
    event.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
    setDirty(true);
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewPreviews((current) => current.filter((_, imageIndex) => imageIndex !== index));
    setNewFiles((current) => current.filter((_, imageIndex) => imageIndex !== index));
    setDirty(true);
  };

  const leaveForm = () => {
    if (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Vẫn rời khỏi trang?')) return;
    allowNavigation.current = true;
    navigate(-1);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateProductForm(form, existingImages.length + newFiles.length);
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }
    try {
      setSubmitting(true);
      setFeedback({ tone: 'info', text: 'Đang lưu sản phẩm…' });
      const uploads = newFiles.length ? await uploadImages(newFiles) : [];
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        price: Number(form.price),
        images: [...existingImages, ...uploads.map((image) => image.url)],
      };
      if (editMode && id) await updateProduct(id, payload);
      else await createProduct(payload);
      allowNavigation.current = true;
      setDirty(false);
      setFeedback({
        tone: 'success',
        text: editMode ? 'Đã cập nhật sản phẩm.' : 'Đã đăng sản phẩm mới.',
      });
      window.setTimeout(() => navigate('/my-products'), 500);
    } catch (caught) {
      setFeedback({
        tone: 'error',
        text: caught instanceof Error ? caught.message : 'Không thể lưu sản phẩm.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <MarketplaceLayout className="grid min-h-[60vh] place-items-center">
        <EmptyState
          title="Bạn cần đăng nhập"
          description="Đăng nhập để đăng và quản lý sản phẩm của mình."
          action={<Button render={<Link to="/login" />}>Đăng nhập</Button>}
        />
      </MarketplaceLayout>
    );
  }

  if (loading) {
    return (
      <MarketplaceLayout className="max-w-4xl space-y-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-[620px] rounded-3xl" />
      </MarketplaceLayout>
    );
  }

  const images = [...existingImages, ...newPreviews];

  return (
    <MarketplaceLayout className="max-w-4xl space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3" onClick={leaveForm}>
            <ArrowLeft className="size-4" />
            Quay lại
          </Button>
          <h1 className="mt-3 text-3xl font-bold">
            {editMode ? 'Chỉnh sửa sản phẩm' : 'Đăng sản phẩm mới'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thông tin rõ ràng và ảnh thật giúp sản phẩm dễ được người mua tin tưởng hơn.
          </p>
        </div>
        {dirty && <span className="text-xs font-semibold text-warning">Có thay đổi chưa lưu</span>}
      </header>

      <form onSubmit={submit} noValidate className="space-y-5">
        <Card>
          <CardContent className="grid gap-5 pt-5">
            <FormField label="Tiêu đề sản phẩm" required error={errors.title}>
              <Input
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="Ví dụ: Máy ảnh Fujifilm X-T30 còn đẹp"
                maxLength={200}
              />
            </FormField>
            <FormField
              label="Mô tả"
              description="Nêu tình trạng sử dụng, phụ kiện đi kèm và lý do bán."
            >
              <Textarea
                name="description"
                value={form.description}
                onChange={updateField}
                rows={6}
                placeholder="Mô tả chi tiết sản phẩm…"
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Giá bán (VNĐ)" required error={errors.price}>
                <Input
                  name="price"
                  type="number"
                  min="1000"
                  step="1000"
                  value={form.price}
                  onChange={updateField}
                  placeholder="1.500.000"
                />
              </FormField>
              <FormField label="Danh mục" required error={errors.category}>
                <Select name="category" value={form.category} onChange={updateField}>
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Tình trạng">
                <Select name="condition" value={form.condition} onChange={updateField}>
                  <option value="new">Mới</option>
                  <option value="like_new">Như mới</option>
                  <option value="good">Tốt</option>
                  <option value="fair">Khá</option>
                  <option value="poor">Đã qua sử dụng nhiều</option>
                </Select>
              </FormField>
              <FormField label="Khu vực giao dịch">
                <Input
                  name="location"
                  value={form.location}
                  onChange={updateField}
                  placeholder="Ví dụ: Quận 1, TP.HCM"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Hình ảnh sản phẩm</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tối đa 5 ảnh, mỗi ảnh không quá 5 MB.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={images.length >= 5}
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus className="size-4" />
                Thêm ảnh
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={addImages}
              />
            </div>
            {images.length ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {images.map((image, index) => {
                  const existing = index < existingImages.length;
                  const targetIndex = existing ? index : index - existingImages.length;
                  return (
                    <div
                      key={`${image}-${index}`}
                      className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted"
                    >
                      <img
                        src={image}
                        alt={`Ảnh sản phẩm ${index + 1}`}
                        className="size-full object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        aria-label={`Xóa ảnh ${index + 1}`}
                        className="absolute right-2 top-2 size-8 opacity-90"
                        onClick={() =>
                          existing ? removeExistingImage(targetIndex) : removeNewImage(targetIndex)
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                className="mt-5 grid min-h-44 w-full place-items-center rounded-2xl border border-dashed border-border bg-muted/40 text-center transition hover:border-primary hover:bg-primary/5"
                onClick={() => fileInput.current?.click()}
              >
                <span>
                  <ImagePlus className="mx-auto size-7 text-primary" />
                  <span className="mt-2 block text-sm font-semibold">Chọn ảnh sản phẩm</span>
                </span>
              </button>
            )}
            {errors.images && (
              <p className="mt-2 text-xs font-medium text-destructive">{errors.images}</p>
            )}
          </CardContent>
        </Card>

        {feedback && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.tone === 'error'
                ? 'border-destructive/20 bg-destructive/10 text-destructive'
                : feedback.tone === 'success'
                  ? 'border-success/20 bg-success/10 text-success'
                  : 'border-info/20 bg-info/10 text-info'
            }`}
          >
            {feedback.text}
          </p>
        )}

        <footer className="sticky bottom-20 z-20 flex justify-end gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur md:bottom-4">
          <Button type="button" variant="outline" disabled={submitting} onClick={leaveForm}>
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : editMode ? (
              <Save className="size-4" />
            ) : (
              <PackagePlus className="size-4" />
            )}
            {submitting ? 'Đang lưu…' : editMode ? 'Lưu thay đổi' : 'Đăng sản phẩm'}
          </Button>
        </footer>
      </form>
    </MarketplaceLayout>
  );
}

export default ProductFormPage;
