import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  Loader2,
  Package,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
  Star,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import { createReview } from '../../services/reviewService';
import {
  getTransactionById,
  getTransactions,
  getTransactionStats,
  updateTransactionStatus,
} from '../../services/transactionService';

const STATUS_LABELS = {
  awaiting_payment: 'Chờ thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const STATUS_STYLES = {
  awaiting_payment: 'border-orange-300/20 bg-orange-300/10 text-orange-100',
  pending: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  confirmed: 'border-sky-300/20 bg-sky-300/10 text-sky-100',
  shipped: 'border-violet-300/20 bg-violet-300/10 text-violet-100',
  completed: 'border-teal-300/20 bg-teal-300/10 text-teal-100',
  cancelled: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
};

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Chưa thanh toán',
  pending: 'Đang thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán thất bại',
  expired: 'Hết hạn thanh toán',
  cod: 'Thanh toán khi nhận hàng',
};

const PAYMENT_STATUS_STYLES = {
  unpaid: 'border-slate-300/20 bg-slate-300/10 text-slate-200',
  pending: 'border-orange-300/20 bg-orange-300/10 text-orange-100',
  paid: 'border-teal-300/20 bg-teal-300/10 text-teal-100',
  failed: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
  expired: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
  cod: 'border-sky-300/20 bg-sky-300/10 text-sky-100',
};

const TABS = [
  { id: 'all', label: 'Tất cả', icon: ReceiptText },
  { id: 'buy', label: 'Đã mua', icon: ShoppingBag },
  { id: 'sell', label: 'Đã bán', icon: DollarSign },
];

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function PaymentStatusPill({ status }) {
  if (!status) return null;

  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black ${PAYMENT_STATUS_STYLES[status] || PAYMENT_STATUS_STYLES.unpaid}`}>
      {PAYMENT_STATUS_LABELS[status] || status}
    </span>
  );
}

function EmptyState({ activeTab }) {
  const description = activeTab === 'buy'
    ? 'Bạn chưa mua sản phẩm nào.'
    : activeTab === 'sell'
      ? 'Bạn chưa bán sản phẩm nào.'
      : 'Lịch sử giao dịch của bạn đang trống.';

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-10 text-center shadow-xl shadow-slate-950/30">
      <Package className="mx-auto text-slate-500" size={38} />
      <h3 className="mt-4 text-2xl font-black text-white">Chưa có giao dịch nào</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{description}</p>
      <Link
        to="/app"
        className="mt-6 inline-flex rounded-full bg-teal-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-200"
      >
        Xem sản phẩm
      </Link>
    </div>
  );
}

function TransactionHistoryPage() {
  const [activeTab, setActiveTab] = useState('buy');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadData = useCallback(async (type = 'all', page = 1) => {
    try {
      setIsLoading(true);
      setError('');

      const [statsResult, txResult] = await Promise.all([
        stats === null ? getTransactionStats() : Promise.resolve(stats),
        type === 'all'
          ? Promise.all([
              getTransactions({ type: 'buy', page, limit: 10 }),
              getTransactions({ type: 'sell', page, limit: 10 }),
            ]).then(([buyResult, sellResult]) => {
              const merged = [...(buyResult.transactions || []), ...(sellResult.transactions || [])];
              const uniqueMap = new Map();
              for (const item of merged) uniqueMap.set(item.id, item);

              const mergedUnique = Array.from(uniqueMap.values()).sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              );

              return {
                transactions: mergedUnique,
                page,
                totalPages: Math.max(buyResult.totalPages || 0, sellResult.totalPages || 0),
                total: (buyResult.total || 0) + (sellResult.total || 0),
              };
            })
          : getTransactions({ type, page, limit: 10 }),
      ]);

      setTransactions(txResult.transactions || []);
      setPagination({
        page: txResult.page,
        totalPages: txResult.totalPages,
        total: txResult.total,
      });

      if (stats === null) setStats(statsResult);
    } catch (err) {
      setError(err.message);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    loadData(activeTab, 1);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const statCards = useMemo(() => [
    {
      label: 'Đơn mua',
      value: stats?.totalBuy || 0,
      detail: `${stats?.completedBuy || 0} hoàn thành`,
      icon: ShoppingBag,
      tone: 'teal',
    },
    {
      label: 'Đơn bán',
      value: stats?.totalSell || 0,
      detail: `${stats?.completedSell || 0} hoàn thành`,
      icon: DollarSign,
      tone: 'violet',
    },
  ], [stats]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadData(activeTab, newPage);
    }
  };

  const handleViewTimeline = async (transaction) => {
    try {
      const fullTransaction = await getTransactionById(transaction.id);
      setSelectedTransaction(fullTransaction);
      setShowTimeline(true);
    } catch {
      setError('Không thể tải chi tiết giao dịch.');
    }
  };

  const handleConfirmReceipt = async (transactionId) => {
    try {
      await updateTransactionStatus(transactionId, 'completed');
      await loadData(activeTab, pagination.page);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (transactionId, status) => {
    try {
      let rejectionReason = '';
      if (status === 'cancelled') {
        const reason = window.prompt('Vui lòng nhập lý do từ chối đơn hàng:');
        if (reason === null) return;
        rejectionReason = reason;
      }

      await updateTransactionStatus(transactionId, status, rejectionReason);
      await loadData(activeTab, pagination.page);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const openReviewModal = (transaction) => {
    setReviewTarget(transaction);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewTarget) return;

    try {
      setIsSubmittingReview(true);
      await createReview({
        transaction_id: reviewTarget.id,
        rating: reviewRating,
        comment: reviewComment,
      });

      setShowReviewModal(false);
      setReviewTarget(null);
      setReviewComment('');
      await loadData(activeTab, pagination.page);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getTimelineEvents = (transaction) => {
    const events = [
      {
        status: 'pending',
        label: 'Đặt hàng',
        timestamp: transaction.created_at,
        completed: true,
      },
    ];

    if (transaction.confirmed_at) {
      events.push({
        status: 'confirmed',
        label: 'Xác nhận đơn hàng',
        timestamp: transaction.confirmed_at,
        completed: true,
      });
    }

    if (transaction.shipped_at) {
      events.push({
        status: 'shipped',
        label: 'Đang giao hàng',
        timestamp: transaction.shipped_at,
        completed: true,
      });
    }

    if (transaction.completed_at) {
      events.push({
        status: 'completed',
        label: 'Hoàn thành',
        timestamp: transaction.completed_at,
        completed: true,
      });
    }

    if (transaction.cancelled_at) {
      events.push({
        status: 'cancelled',
        label: 'Đã hủy',
        timestamp: transaction.cancelled_at,
        completed: true,
      });
    }

    return events;
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Link to="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-teal-200">
              <ArrowLeft size={17} />
              Quay lại
            </Link>
            <h1 className="mt-3 text-3xl font-black text-white">Đơn hàng</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Theo dõi đơn mua, đơn bán, trạng thái giao hàng và đánh giá sau giao dịch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadData(activeTab, pagination.page || 1)}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-slate-100 transition hover:border-teal-300/40 hover:bg-white/[0.08]"
          >
            <RefreshCcw size={17} />
            Tải lại
          </button>
        </header>

        {stats && (
          <section className="mb-5 grid gap-4 sm:grid-cols-2">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const iconTone = stat.tone === 'violet'
                ? 'border-violet-300/20 bg-violet-300/10 text-violet-200'
                : 'border-teal-300/20 bg-teal-300/10 text-teal-200';

              return (
                <article key={stat.label} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/25">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${iconTone}`}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-400">{stat.label}</p>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <strong className="text-3xl font-black leading-none text-white">{stat.value}</strong>
                        <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2.5 py-1 text-xs font-bold text-teal-100">
                          {stat.detail}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black transition ${
                  isActive
                    ? 'border-teal-300 bg-teal-300 text-slate-950 shadow-lg shadow-teal-950/25'
                    : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-teal-300/35 hover:text-teal-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-100">
            <XCircle size={18} />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-slate-950/70 text-slate-400">
            <Loader2 className="mr-2 animate-spin" size={20} />
            Đang tải đơn hàng...
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState activeTab={activeTab} />
        ) : (
          <section className="space-y-3">
            {transactions.map((tx) => (
              <article
                key={tx.id}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-slate-950/25 transition hover:-translate-y-0.5 hover:border-teal-300/25 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                      {tx.product_image ? (
                        <img src={tx.product_image} alt={tx.product_name || 'Sản phẩm'} className="h-full w-full object-cover" />
                      ) : (
                        <Package size={28} className="text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="line-clamp-1 text-lg font-black text-white">{tx.product_name || 'Sản phẩm'}</h2>
                        <StatusPill status={tx.status} />
                        <PaymentStatusPill status={tx.payment_status} />
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Clock3 size={14} />
                        {formatDate(tx.created_at)}
                      </p>
                      {tx.note && (
                        <p className="mt-2 line-clamp-2 text-sm italic text-slate-400">
                          &ldquo;{tx.note}&rdquo;
                        </p>
                      )}
                      {tx.my_review && (
                        <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs font-bold text-amber-100">
                          <Star size={13} fill="currentColor" />
                          {tx.my_review.rating}/5 Đã đánh giá
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-white/10 pt-4 lg:min-w-56 lg:items-end lg:border-t-0 lg:pt-0">
                    <strong className="text-2xl font-black text-teal-300">{formatCurrency(tx.amount)}</strong>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => handleViewTimeline(tx)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-100 transition hover:border-teal-300/35 hover:bg-white/[0.08]"
                      >
                        <ReceiptText size={15} />
                        Chi tiết
                      </button>

                      {activeTab === 'buy' && tx.status === 'shipped' && (
                        <button
                          type="button"
                          onClick={() => handleConfirmReceipt(tx.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-300/10 px-3 py-2 text-sm font-bold text-teal-100 transition hover:bg-teal-300/20"
                        >
                          <PackageCheck size={15} />
                          Đã nhận hàng
                        </button>
                      )}

                      {activeTab === 'buy' && tx.status === 'completed' && !tx.my_review && (
                        <button
                          type="button"
                          onClick={() => openReviewModal(tx)}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20"
                        >
                          <Star size={15} fill="currentColor" />
                          Đánh giá
                        </button>
                      )}

                      {activeTab === 'sell' && tx.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(tx.id, 'confirmed')}
                            className="inline-flex items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-300/10 px-3 py-2 text-sm font-bold text-teal-100 transition hover:bg-teal-300/20"
                          >
                            <Check size={15} />
                            Xác nhận
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(tx.id, 'cancelled')}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm font-bold text-rose-100 transition hover:bg-rose-300/20"
                          >
                            <X size={15} />
                            Từ chối
                          </button>
                        </>
                      )}

                      {activeTab === 'sell' && tx.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(tx.id, 'shipped')}
                          className="inline-flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/10 px-3 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-300/20"
                        >
                          <Truck size={15} />
                          Giao hàng
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-5">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 text-slate-400 transition hover:border-teal-300/35 hover:text-teal-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-bold text-slate-400">
                  Trang <span className="text-white">{pagination.page}</span> / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 text-slate-400 transition hover:border-teal-300/35 hover:text-teal-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            <p className="pt-1 text-center text-sm font-semibold text-slate-500">Tổng: {pagination.total} giao dịch</p>
          </section>
        )}

        {showTimeline && selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={() => setShowTimeline(false)}>
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0d1324] shadow-2xl shadow-slate-950/50" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <h3 className="text-lg font-black text-white">Chi tiết giao dịch</h3>
                <button
                  type="button"
                  onClick={() => setShowTimeline(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5">
                <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <h4 className="font-black text-white">{selectedTransaction.product_name || 'Sản phẩm'}</h4>
                  <p className="mt-1 text-xl font-black text-teal-300">{formatCurrency(selectedTransaction.amount)}</p>
                </div>

                <div className="relative space-y-5 before:absolute before:bottom-3 before:left-3 before:top-3 before:w-px before:bg-white/10">
                  {getTimelineEvents(selectedTransaction).map((event) => (
                    <div key={`${event.status}-${event.timestamp}`} className="relative z-10 flex gap-4">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 border-[#0d1324] bg-teal-300">
                        <span className="h-2 w-2 rounded-full bg-slate-950" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-white">{event.label}</h5>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(event.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTransaction.rejection_reason && (
                  <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4">
                    <h5 className="text-xs font-black uppercase text-rose-200">Lý do từ chối</h5>
                    <p className="mt-1 text-sm text-rose-100">{selectedTransaction.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showReviewModal && reviewTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={() => !isSubmittingReview && setShowReviewModal(false)}>
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0d1324] shadow-2xl shadow-slate-950/50" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <h3 className="text-lg font-black text-white">Đánh giá giao dịch</h3>
                <button
                  type="button"
                  onClick={() => !isSubmittingReview && setShowReviewModal(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm leading-6 text-slate-400">
                  Bạn đánh giá trải nghiệm mua sản phẩm <strong className="text-white">{reviewTarget.product_name}</strong> như thế nào?
                </p>

                <div className="my-7 flex items-center justify-center gap-2">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const starValue = index + 1;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setReviewRating(starValue)}
                        disabled={isSubmittingReview}
                        className="transition hover:scale-110 active:scale-95 disabled:opacity-60"
                      >
                        <Star size={36} className={starValue <= reviewRating ? 'fill-current text-amber-300' : 'text-slate-700'} />
                      </button>
                    );
                  })}
                </div>

                <label htmlFor="review-comment" className="text-sm font-bold text-slate-400">Nhận xét</label>
                <textarea
                  id="review-comment"
                  rows={4}
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  maxLength={500}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-300/60"
                />

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
                    onClick={() => setShowReviewModal(false)}
                    disabled={isSubmittingReview}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl bg-teal-300 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-200 disabled:opacity-60"
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                  >
                    {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default TransactionHistoryPage;
