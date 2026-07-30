import {
  CheckCircle2,
  Clock3,
  PackageCheck,
  PackageOpen,
  Plus,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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
import { getTransactions, updateTransactionStatus } from '@/services/transactionService';
import { useAuthStore } from '@/store/authStore';
import type { Transaction, TransactionStatus } from '@/types/domain';

const filters = [
  ['all', 'Tất cả'],
  ['awaiting_payment', 'Chờ thanh toán'],
  ['pending', 'Chờ xác nhận'],
  ['confirmed', 'Đã xác nhận'],
  ['shipped', 'Đang giao'],
  ['completed', 'Hoàn tất'],
  ['cancelled', 'Đã hủy'],
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function SellerDashboard() {
  const user = useAuthStore((state) => state.user);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>('all');
  const [rejecting, setRejecting] = useState<Transaction | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getTransactions({
        type: 'sell',
        status: filter === 'all' ? undefined : filter,
        limit: 50,
      });
      setTransactions(result.transactions || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải đơn bán.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const counts = useMemo(
    () =>
      transactions.reduce<Record<string, number>>((result, transaction) => {
        result[transaction.status] = (result[transaction.status] || 0) + 1;
        return result;
      }, {}),
    [transactions],
  );

  const updateStatus = async (
    transactionId: string,
    status: TransactionStatus,
    rejectionReason = '',
  ) => {
    try {
      setBusyId(transactionId);
      setError('');
      await updateTransactionStatus(transactionId, status, rejectionReason);
      setRejecting(null);
      setReason('');
      await loadTransactions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật đơn hàng.');
    } finally {
      setBusyId('');
    }
  };

  if (!user) {
    return (
      <MarketplaceLayout className="grid min-h-[60vh] place-items-center">
        <EmptyState
          title="Bạn cần đăng nhập"
          description="Đăng nhập để quản lý đơn bán và cập nhật tiến độ giao hàng."
          action={<Button render={<Link to="/login" />}>Đăng nhập</Button>}
        />
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout className="space-y-6">
      <header className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Không gian người bán</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Đơn hàng đang bán</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Xác nhận đơn, bàn giao cho đơn vị vận chuyển và theo dõi từng mốc xử lý.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadTransactions()}>
            <RefreshCw className="size-4" />
            Làm mới
          </Button>
          <Button render={<Link to="/products/new" />}>
            <Plus className="size-4" />
            Đăng sản phẩm
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Chờ xác nhận', value: counts.pending || 0, icon: Clock3, tone: 'text-warning' },
          {
            label: 'Đã xác nhận',
            value: counts.confirmed || 0,
            icon: PackageCheck,
            tone: 'text-primary',
          },
          { label: 'Đang giao', value: counts.shipped || 0, icon: Truck, tone: 'text-info' },
          {
            label: 'Hoàn tất',
            value: counts.completed || 0,
            icon: CheckCircle2,
            tone: 'text-success',
          },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <strong className="mt-2 block text-3xl">{value}</strong>
              </div>
              <span className={`grid size-11 place-items-center rounded-2xl bg-muted ${tone}`}>
                <Icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">
        {filters.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'ghost'}
            className="shrink-0"
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </nav>

      {error && (
        <ErrorState
          title="Chưa thể cập nhật đơn hàng"
          description={error}
          onRetry={loadTransactions}
        />
      )}

      {loading ? (
        <section className="space-y-3" aria-label="Đang tải đơn hàng">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-44 rounded-2xl" />
          ))}
        </section>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Không có đơn phù hợp"
          description="Khi có đơn mới hoặc bạn đổi bộ lọc, danh sách sẽ xuất hiện tại đây."
        />
      ) : (
        <section className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id} className="overflow-hidden">
              <CardContent className="grid gap-5 pt-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 gap-4">
                  <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                    {transaction.product_image ? (
                      <img
                        src={transaction.product_image}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <PackageOpen className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold">
                        {transaction.product_name || transaction.product?.title || 'Sản phẩm'}
                      </h2>
                      <StatusBadge status={transaction.status} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Người mua: {transaction.buyer?.full_name || 'Khách hàng ReMarket'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mã {transaction.id.slice(0, 8).toUpperCase()} ·{' '}
                      {formatDate(transaction.created_at)}
                    </p>
                    {transaction.rejection_reason && (
                      <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        Lý do hủy: {transaction.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <strong className="text-xl text-primary">
                    {formatCurrency(transaction.amount)}
                  </strong>
                  <div className="flex flex-wrap gap-2">
                    {transaction.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          disabled={busyId === transaction.id}
                          onClick={() => void updateStatus(transaction.id, 'confirmed')}
                        >
                          Xác nhận đơn
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === transaction.id}
                          onClick={() => setRejecting(transaction)}
                        >
                          Từ chối
                        </Button>
                      </>
                    )}
                    {transaction.status === 'confirmed' && (
                      <Button
                        size="sm"
                        disabled={busyId === transaction.id}
                        onClick={() => void updateStatus(transaction.id, 'shipped')}
                      >
                        <Truck className="size-4" />
                        Đã giao hàng
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đơn hàng?</DialogTitle>
            <DialogDescription>
              Đơn sẽ chuyển sang trạng thái đã hủy. Vui lòng ghi lý do rõ ràng cho người mua.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ví dụ: Sản phẩm không còn khả dụng…"
            aria-label="Lý do từ chối"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Quay lại
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || !rejecting || busyId === rejecting.id}
              onClick={() =>
                rejecting && void updateStatus(rejecting.id, 'cancelled', reason.trim())
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

export default SellerDashboard;
