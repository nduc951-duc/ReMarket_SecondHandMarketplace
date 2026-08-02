import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import { Button, Card, CardContent } from '@/components/ui';
import { verifyPaymentReturn, type VerifyPaymentReturnResult } from '@/services/paymentService';

type ReturnState = 'verifying' | 'success' | 'failed' | 'error';

function PaymentReturnPage() {
  const { method = '' } = useParams();
  const [searchParams] = useSearchParams();
  const started = useRef(false);
  const [state, setState] = useState<ReturnState>('verifying');
  const [message, setMessage] = useState('Đang xác minh kết quả trực tiếp với cổng thanh toán…');
  const [result, setResult] = useState<VerifyPaymentReturnResult | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const verify = async () => {
      try {
        if (!['momo', 'vnpay'].includes(method)) {
          throw new Error('Cổng thanh toán không hợp lệ.');
        }
        const verification = await verifyPaymentReturn(method, searchParams);
        setResult(verification);
        if (verification.isValid && verification.status === 'success') {
          setState('success');
          setMessage('Thanh toán thành công. Đơn hàng đã được chuyển cho người bán xác nhận.');
        } else {
          setState('failed');
          setMessage('Thanh toán chưa thành công hoặc đã bị hủy tại cổng thanh toán.');
        }
      } catch (caught) {
        setState('error');
        setMessage(
          caught instanceof Error ? caught.message : 'Không thể xác minh kết quả thanh toán.',
        );
      }
    };

    void verify();
  }, [method, searchParams]);

  const Icon = state === 'verifying' ? Loader2 : state === 'success' ? CheckCircle2 : XCircle;

  return (
    <MarketplaceLayout className="grid min-h-[70vh] place-items-center">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
          <span
            className={`grid size-16 place-items-center rounded-full ${
              state === 'success'
                ? 'bg-success/10 text-success'
                : state === 'verifying'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-destructive/10 text-destructive'
            }`}
          >
            <Icon className={`size-8 ${state === 'verifying' ? 'animate-spin' : ''}`} />
          </span>
          <h1 className="mt-6 text-2xl font-bold">
            {state === 'verifying'
              ? 'Đang xác minh thanh toán'
              : state === 'success'
                ? 'Thanh toán thành công'
                : 'Thanh toán chưa hoàn tất'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
          {result?.orderId && (
            <p className="mt-3 font-mono text-xs text-muted-foreground">Mã đơn: {result.orderId}</p>
          )}
          {state !== 'verifying' && (
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button render={<Link to="/transactions" />}>Xem đơn hàng</Button>
              {state !== 'success' && (
                <Button render={<Link to="/app" />} variant="outline">
                  Về marketplace
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </MarketplaceLayout>
  );
}

export default PaymentReturnPage;
