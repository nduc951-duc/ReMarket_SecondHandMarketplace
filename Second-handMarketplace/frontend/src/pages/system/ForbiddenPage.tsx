import { ShieldX } from 'lucide-react';

import { SystemStatusPage } from '@/components/system/SystemStatusPage';

export default function ForbiddenPage() {
  return (
    <SystemStatusPage
      code="403"
      eyebrow="Quyền truy cập"
      title="Bạn chưa có quyền xem trang này"
      description="Tài khoản hiện tại không có role phù hợp. Nếu bạn cho rằng đây là nhầm lẫn, hãy đăng nhập lại hoặc liên hệ hỗ trợ."
      icon={ShieldX}
      secondaryPath="/login"
      secondaryLabel="Đăng nhập lại"
    />
  );
}
