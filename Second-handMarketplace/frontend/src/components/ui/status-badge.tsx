import { Badge } from '@/components/ui/badge';

type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const statusLabels: Record<string, string> = {
  active: 'Đang hiển thị',
  hidden: 'Đã ẩn',
  sold: 'Đã bán',
  inactive: 'Ngừng hiển thị',
  banned: 'Đã chặn',
  blocked: 'Đã khóa',
  customer: 'Khách hàng',
  seller: 'Người bán',
  agent: 'Nhân viên',
  admin: 'Quản trị viên',
  awaiting_payment: 'Chờ thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  unpaid: 'Chưa thanh toán',
  cod: 'Thanh toán khi nhận',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  expired: 'Đã hết hạn',
  refunded: 'Đã hoàn tiền',
  submitted: 'Mới gửi',
  in_review: 'Đang xem xét',
  resolved: 'Đã xử lý',
  dismissed: 'Đã bỏ qua',
};

const statusTones: Record<string, StatusTone> = {
  active: 'success',
  hidden: 'neutral',
  sold: 'info',
  inactive: 'neutral',
  banned: 'danger',
  blocked: 'danger',
  customer: 'neutral',
  seller: 'info',
  agent: 'primary',
  admin: 'danger',
  awaiting_payment: 'warning',
  pending: 'warning',
  confirmed: 'primary',
  shipped: 'info',
  completed: 'success',
  cancelled: 'danger',
  unpaid: 'neutral',
  cod: 'info',
  paid: 'success',
  failed: 'danger',
  expired: 'neutral',
  refunded: 'info',
  submitted: 'warning',
  in_review: 'primary',
  resolved: 'success',
  dismissed: 'neutral',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalizedStatus = status.trim().toLowerCase();
  return (
    <Badge variant={statusTones[normalizedStatus] ?? 'neutral'} className={className}>
      {label ?? statusLabels[normalizedStatus] ?? status}
    </Badge>
  );
}

export { StatusBadge, statusLabels, statusTones, type StatusBadgeProps };
