import {
  Check,
  Clock3,
  CreditCard,
  DollarSign,
  Package,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { supabase } from '@/lib/supabaseClient';
import { createReview } from '@/services/reviewService';
import { createPayment } from '@/services/paymentService';
import {
  getTransactionById,
  getTransactions,
  getTransactionStats,
  updateTransactionStatus,
} from '@/services/transactionService';
import { useAuthStore } from '@/store/authStore';
import type { Transaction, TransactionStats, TransactionStatus } from '@/types/domain';
import { createRealtimeRefreshQueue } from '@/utils/realtime';

type OrderRole = 'buy' | 'sell';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function timeline(transaction: Transaction) {
  const events = [
    {
      label: transaction.status === 'awaiting_payment' ? 'Đơn hàng được khởi tạo' : 'Đã đặt hàng',
      time: transaction.created_at,
    },
  ];
  if (transaction.paid_at) events.push({ label: 'Đã thanh toán', time: transaction.paid_at });
  if (transaction.confirmed_at)
    events.push({ label: 'Người bán đã xác nhận', time: transaction.confirmed_at });
  if (transaction.shipped_at)
    events.push({ label: 'Đang giao hàng', time: transaction.shipped_at });
  if (transaction.completed_at)
    events.push({ label: 'Giao dịch hoàn tất', time: transaction.completed_at });
  if (transaction.cancelled_at)
    events.push({ label: 'Đơn hàng đã hủy', time: transaction.cancelled_at });
  return events;
}

function paymentTimeLeft(expiresAt: string | null | undefined, now: number) {
  if (!expiresAt) return '';
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function TransactionHistoryPage() {
  const user = useAuthStore((state) => state.user);
  const [role, setRole] = useState<OrderRole>('buy');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Transaction | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Transaction | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const statsLoaded = useRef(false);
  const statsRef = useRef<TransactionStats | null>(null);

  const loadData = useCallback(
    async (refreshStats = false) => {
      try {
        setLoading(true);
        setError('');
        const [transactionResult, statsResult] = await Promise.all([
          getTransactions({ type: role, page, limit: 10 }),
          refreshStats || !statsLoaded.current
            ? getTransactionStats()
            : Promise.resolve(statsRef.current),
        ]);
        setTransactions(transactionResult.transactions || []);
        setTotalPages(transactionResult.totalPages || 1);
        setTotal(transactionResult.total || 0);
        if (statsResult) {
          statsLoaded.current = true;
          statsRef.current = statsResult;
          setStats(statsResult);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Không thể tải đơn hàng.');
      } finally {
        setLoading(false);
      }
    },
    [page, role],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!transactions.some((transaction) => transaction.status === 'awaiting_payment')) return;
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [transactions]);

  useEffect(() => {
    if (!user || !supabase) return;
    const client = supabase;
    const queue = createRealtimeRefreshQueue(() => loadData(true));
    const channel = client
      .channel(`transactions-ui-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `buyer_id=eq.${user.id}`,
        },
        () => queue.schedule(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `seller_id=eq.${user.id}`,
        },
        () => queue.schedule(),
      )
      .subscribe((status) => status === 'SUBSCRIBED' && queue.flush());
    return () => {
      queue.cancel();
      void client.removeChannel(channel);
    };
  }, [loadData, user]);

  const updateStatus = async (transactionId: string, status: TransactionStatus, reason = '') => {
    try {
      setBusyId(transactionId);
      setError('');
      await updateTransactionStatus(transactionId, status, reason);
      setRejectTarget(null);
      setRejectionReason('');
      await loadData(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật đơn hàng.');
    } finally {
      setBusyId('');
    }
  };

  const openDetail = async (transaction: Transaction) => {
    try {
      setBusyId(transaction.id);
      setDetail(await getTransactionById(transaction.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải chi tiết.');
    } finally {
      setBusyId('');
    }
  };

  const resumePayment = async (transaction: Transaction) => {
    const method = String(transaction.payment_method || '').toLowerCase();
    if (method !== 'momo' && method !== 'vnpay') return;

    try {
      setBusyId(transaction.id);
      setError('');
      const payment = await createPayment({
        orderId: transaction.id,
        amount: transaction.amount,
        orderInfo: `Thanh toán đơn hàng ${transaction.id}`,
        paymentMethod: method,
        returnUrl: `${window.location.origin}/payment/return/${method}`,
      });
      if (!payment.paymentUrl) throw new Error('Cổng thanh toán chưa trả về đường dẫn.');
      window.location.assign(payment.paymentUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tiếp tục thanh toán.');
      setBusyId('');
    }
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    try {
      setBusyId(reviewTarget.id);
      await createReview({
        transaction_id: reviewTarget.id,
        rating,
        comment: comment.trim(),
      });
      setReviewTarget(null);
      setComment('');
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể gửi đánh giá.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <MarketplaceLayout className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Giao dịch</p>
          <h1 className="mt-2 text-3xl font-bold">Đơn hàng của bạn</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Theo dõi thanh toán, tiến độ giao hàng và các hành động dành riêng cho người mua hoặc
            người bán.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadData(true)}>
          <RefreshCw className="size-4" />
          Làm mới
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          {
            label: 'Đơn mua',
            value: stats?.totalBuy || 0,
            completed: stats?.completedBuy || 0,
            icon: ShoppingBag,
          },
          {
            label: 'Đơn bán',
            value: stats?.totalSell || 0,
            completed: stats?.completedSell || 0,
            icon: DollarSign,
          },
        ].map(({ label, value, completed, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 pt-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <strong className="text-2xl">{value}</strong>
                <span className="ml-2 text-xs text-muted-foreground">{completed} hoàn tất</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <nav className="grid grid-cols-2 rounded-2xl border border-border bg-card p-2">
        {(
          [
            ['buy', 'Đơn mua', ShoppingBag],
            ['sell', 'Đơn bán', DollarSign],
          ] as const
        ).map(([value, label, Icon]) => (
          <Button
            key={value}
            variant={role === value ? 'default' : 'ghost'}
            onClick={() => {
              setRole(value);
              setPage(1);
            }}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </nav>

      {error && <ErrorState title="Chưa thể tải đơn hàng" description={error} onRetry={loadData} />}

      {loading ? (
        <section className="space-y-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-48 rounded-2xl" />
          ))}
        </section>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Package}
          title={role === 'buy' ? 'Bạn chưa có đơn mua' : 'Bạn chưa có đơn bán'}
          description="Các giao dịch mới sẽ xuất hiện tại đây và tự cập nhật khi trạng thái thay đổi."
        />
      ) : (
        <section className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="grid gap-5 pt-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 gap-4">
                  <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                    {transaction.product_image ? (
                      <img
                        src={transaction.product_image}
                        alt=""
                        width="80"
                        height="80"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Package className="size-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">
                      {transaction.product_name || transaction.product?.title || 'Sản phẩm'}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={transaction.status} />
                      {transaction.payment_status && (
                        <StatusBadge status={transaction.payment_status} />
                      )}
                    </div>
                    <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      {formatDate(transaction.created_at)}
                    </p>
                    {transaction.status === 'awaiting_payment' && (
                      <p className="mt-2 text-sm font-semibold text-warning-foreground dark:text-warning">
                        Còn {paymentTimeLeft(transaction.payment_expires_at, clock)} để thanh toán
                      </p>
                    )}
                    {transaction.note && (
                      <p className="mt-2 line-clamp-2 text-sm italic text-muted-foreground">
                        “{transaction.note}”
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 border-t border-border pt-4 lg:items-end lg:border-0 lg:pt-0">
                  <strong className="text-xl text-primary">
                    {formatCurrency(transaction.amount)}
                  </strong>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === transaction.id}
                      onClick={() => void openDetail(transaction)}
                    >
                      <ReceiptText className="size-4" />
                      Chi tiết
                    </Button>
                    {role === 'buy' && transaction.status === 'awaiting_payment' && (
                      <Button
                        size="sm"
                        disabled={busyId === transaction.id}
                        onClick={() => void resumePayment(transaction)}
                      >
                        <CreditCard className="size-4" />
                        Thanh toán ngay
                      </Button>
                    )}
                    {role === 'buy' && transaction.status === 'shipped' && (
                      <Button
                        size="sm"
                        disabled={busyId === transaction.id}
                        onClick={() => void updateStatus(transaction.id, 'completed')}
                      >
                        <PackageCheck className="size-4" />
                        Đã nhận hàng
                      </Button>
                    )}
                    {role === 'buy' &&
                      transaction.status === 'completed' &&
                      !transaction.my_review && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewTarget(transaction)}
                        >
                          <Star className="size-4" />
                          Bình luận sản phẩm
                        </Button>
                      )}
                    {role === 'sell' && transaction.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          disabled={busyId === transaction.id}
                          onClick={() => void updateStatus(transaction.id, 'confirmed')}
                        >
                          <Check className="size-4" />
                          Xác nhận
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectTarget(transaction)}
                        >
                          <X className="size-4" />
                          Từ chối
                        </Button>
                      </>
                    )}
                    {role === 'sell' && transaction.status === 'confirmed' && (
                      <Button
                        size="sm"
                        disabled={busyId === transaction.id}
                        onClick={() => void updateStatus(transaction.id, 'shipped')}
                      >
                        <Truck className="size-4" />
                        Giao hàng
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <footer className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <span className="text-sm text-muted-foreground">{total} giao dịch</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </Button>
            <span className="px-2 text-sm">
              {page}/{totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </Button>
          </div>
        </footer>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tiến trình đơn hàng</DialogTitle>
            <DialogDescription>
              {detail?.product_name || detail?.product?.title || 'Chi tiết giao dịch'}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Giá trị đơn hàng</p>
                <strong className="mt-1 block text-xl text-primary">
                  {formatCurrency(detail.amount)}
                </strong>
              </div>
              <div className="space-y-4">
                {timeline(detail).map((event) => (
                  <div key={`${event.label}-${event.time}`} className="flex gap-3">
                    <span className="mt-1 size-3 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
                    <div>
                      <p className="text-sm font-semibold">{event.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(event.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {detail.rejection_reason && (
                <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  Lý do hủy: {detail.rejection_reason}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bình luận về sản phẩm</DialogTitle>
            <DialogDescription>
              Nhận xét đúng tình trạng và trải nghiệm sử dụng sản phẩm bạn đã nhận.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} sao`}
                onClick={() => setRating(value)}
                className="rounded-lg p-1 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star
                  className={`size-8 ${value <= rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={500}
            placeholder="Ví dụ: Sản phẩm đúng mô tả, ngoại hình còn tốt…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>
              Hủy
            </Button>
            <Button
              disabled={!reviewTarget || busyId === reviewTarget.id}
              onClick={() => void submitReview()}
            >
              Gửi bình luận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đơn hàng?</DialogTitle>
            <DialogDescription>Lý do sẽ được hiển thị cho người mua.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Nhập lý do từ chối…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Quay lại
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectTarget || !rejectionReason.trim() || busyId === rejectTarget.id}
              onClick={() =>
                rejectTarget &&
                void updateStatus(rejectTarget.id, 'cancelled', rejectionReason.trim())
              }
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MarketplaceLayout>
  );
}

export default TransactionHistoryPage;
