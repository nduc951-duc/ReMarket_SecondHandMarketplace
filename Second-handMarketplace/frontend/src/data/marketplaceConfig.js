export const categories = [
  { name: 'Điện tử' },
  { name: 'Thời trang' },
  { name: 'Đồ gia dụng' },
  { name: 'Sách vở' },
  { name: 'Thể thao' },
  { name: 'Ô tô - Xe máy' },
  { name: 'Bất động sản' },
  { name: 'Khác' },
];

export const conditions = [
  { value: 'new', label: 'Mới 100%' },
  { value: 'like_new', label: 'Như mới' },
  { value: 'good', label: 'Còn tốt' },
  { value: 'fair', label: 'Trung bình' },
  { value: 'poor', label: 'Cũ' },
];

export const sortOptions = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'view_desc', label: 'Nhiều lượt xem' },
];

export const locations = ['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Bình Dương'];

export function getConditionLabel(value) {
  return conditions.find((condition) => condition.value === value)?.label || value || 'Đã qua sử dụng';
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

export function formatCompactCount(value) {
  const amount = Number(value || 0);
  if (amount < 1000) return String(amount);
  return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
}

export function formatTimeAgo(value) {
  if (!value) return '';
  const now = new Date();
  const created = new Date(value);
  const diffMs = Math.max(0, now - created);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return `${Math.floor(days / 7)} tuần trước`;
}
