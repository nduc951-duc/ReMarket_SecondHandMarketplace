import { Flag } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface ProductReportInput {
  reason: string;
  details: string;
  evidenceUrl: string;
}

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting?: boolean;
  feedback?: string;
  onSubmit: (input: ProductReportInput) => Promise<void>;
}

function ReportDialog({
  open,
  onOpenChange,
  submitting = false,
  feedback,
  onSubmit,
}: ReportDialogProps) {
  const [reason, setReason] = useState('scam');
  const [details, setDetails] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  useEffect(() => {
    if (!open) {
      setDetails('');
      setEvidenceUrl('');
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ reason, details: details.trim(), evidenceUrl: evidenceUrl.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="size-5 text-warning" />
              Báo cáo sản phẩm
            </DialogTitle>
            <DialogDescription>
              Báo cáo sẽ được gửi tới đội kiểm duyệt. Không nhập dữ liệu cá nhân nhạy cảm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormField label="Lý do" required>
              <Select value={reason} onChange={(event) => setReason(event.target.value)}>
                <option value="scam">Có dấu hiệu lừa đảo</option>
                <option value="counterfeit">Hàng giả hoặc không chính hãng</option>
                <option value="prohibited">Sản phẩm bị cấm</option>
                <option value="harassment">Quấy rối</option>
                <option value="spam">Tin rác hoặc trùng lặp</option>
                <option value="other">Lý do khác</option>
              </Select>
            </FormField>
            <FormField label="Mô tả" description="Nêu ngắn gọn dấu hiệu bạn nhận thấy.">
              <Textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Mô tả vấn đề..."
              />
            </FormField>
            <FormField label="Link bằng chứng" description="Không bắt buộc, sử dụng URL https.">
              <Input
                type="url"
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(event.target.value)}
                placeholder="https://..."
              />
            </FormField>
            {feedback && (
              <p role="status" className="rounded-xl bg-muted px-3 py-2 text-sm">
                {feedback}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ReportDialog };
