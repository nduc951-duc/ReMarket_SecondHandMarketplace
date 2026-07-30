import { SearchX } from 'lucide-react';

import { SystemStatusPage } from '@/components/system/SystemStatusPage';

export default function NotFoundPage() {
  return (
    <SystemStatusPage
      code="404"
      eyebrow="Không tìm thấy"
      title="Trang này không còn ở đây"
      description="Đường dẫn có thể đã thay đổi hoặc nội dung đã được gỡ. Bạn có thể quay lại marketplace để tiếp tục khám phá."
      icon={SearchX}
      secondaryPath="/search"
      secondaryLabel="Tìm sản phẩm"
    />
  );
}
