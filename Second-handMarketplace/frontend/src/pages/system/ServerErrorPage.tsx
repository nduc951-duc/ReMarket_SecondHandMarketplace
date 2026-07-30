import { ServerCrash } from 'lucide-react';

import { SystemStatusPage } from '@/components/system/SystemStatusPage';

export default function ServerErrorPage() {
  return (
    <SystemStatusPage
      code="500"
      eyebrow="Sự cố hệ thống"
      title="ReMarket đang gặp chút trục trặc"
      description="Máy chủ tạm thời chưa thể xử lý yêu cầu. Dữ liệu của bạn vẫn an toàn; vui lòng thử lại sau ít phút."
      icon={ServerCrash}
      secondaryPath="/profile"
      secondaryLabel="Về hồ sơ"
    />
  );
}
