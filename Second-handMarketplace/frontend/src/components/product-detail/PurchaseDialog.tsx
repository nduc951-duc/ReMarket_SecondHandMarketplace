import { CheckCircle2, ShoppingBag } from 'lucide-react';

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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/data/marketplaceConfig';
import type { PaymentMethod, Product } from '@/types/domain';

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  image?: string;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  note: string;
  onNoteChange: (note: string) => void;
  submitting?: boolean;
  feedback?: { type: 'success' | 'error' | ''; message: string };
  onConfirm: () => void;
}

function PurchaseDialog({
  open,
  onOpenChange,
  product,
  image,
  paymentMethod,
  onPaymentMethodChange,
  note,
  onNoteChange,
  submitting = false,
  feedback,
  onConfirm,
}: PurchaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            Xác nhận đặt mua
          </DialogTitle>
          <DialogDescription>
            Kiểm tra sản phẩm và chọn phương thức thanh toán phù hợp.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-xl bg-muted/55 p-3">
          {image ? (
            <img
              src={image}
              alt=""
              width="64"
              height="64"
              className="size-16 rounded-lg object-cover"
            />
          ) : (
            <span className="grid size-16 place-items-center rounded-lg bg-muted">
              <ShoppingBag className="size-6 text-muted-foreground" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{product.title}</p>
            <p className="mt-1 font-bold text-primary">{formatCurrency(product.price)}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <FormField label="Phương thức thanh toán" required>
            <Select
              value={paymentMethod}
              onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethod)}
            >
              <option value="cod">Thanh toán khi nhận hàng (COD)</option>
              <option value="momo">Ví MoMo</option>
              <option value="vnpay">VNPAY</option>
            </Select>
          </FormField>
          <FormField label="Lời nhắn" description="Không bắt buộc.">
            <Textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ví dụ: Gọi cho tôi vào buổi chiều…"
            />
          </FormField>
          {feedback?.message && (
            <p
              role="status"
              className={
                feedback.type === 'success'
                  ? 'flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success'
                  : 'rounded-xl bg-destructive/10 p-3 text-sm text-destructive'
              }
            >
              {feedback.type === 'success' && <CheckCircle2 className="size-4" />}
              {feedback.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Đang xử lý…' : 'Xác nhận đặt hàng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { PurchaseDialog };
