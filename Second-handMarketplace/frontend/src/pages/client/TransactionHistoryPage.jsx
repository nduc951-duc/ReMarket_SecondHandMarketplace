import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createReview } from '../../services/reviewService';
import {
  getTransactionById,
  getTransactions,
  getTransactionStats,
  updateTransactionStatus,
} from '../../services/transactionService';
import { cn } from '../../lib/utils';
import { ShoppingCart, DollarSign, Package, Clock, CheckCircle, XCircle, Star, X, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đã giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const STATUS_CLASSES = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  shipped: 'status-shipped',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
};

function TransactionHistoryPage() {
  const [activeTab, setActiveTab] = useState('buy'); // Default to buy for buyers
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
              for (const item of merged) {
                uniqueMap.set(item.id, item);
              }

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

      if (stats === null) {
        setStats(statsResult);
      }
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

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

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
    } catch (err) {
      setError('Không thể tải chi tiết giao dịch');
    }
  };

  const handleConfirmReceipt = async (transactionId) => {
    try {
      await updateTransactionStatus(transactionId, 'completed');
      await loadData(activeTab, pagination.page); // Reload current page
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (transactionId, status) => {
    try {
      let rejectionReason = '';
      // Nếu người bán từ chối đơn hàng (Huỷ đơn), hiển thị prompt yêu cầu nhập lý do
      if (status === 'cancelled') {
        const reason = window.prompt('Vui lòng nhập lý do từ chối đơn hàng:');
        if (reason === null) return; // Huỷ bỏ thao tác nếu bấm Cancel
        rejectionReason = reason;
      }

      await updateTransactionStatus(transactionId, status, rejectionReason);
      await loadData(activeTab, pagination.page); // Tải lại dữ liệu trang hiện tại
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
    if (!reviewTarget) {
      return;
    }

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
        label: 'Đã giao hàng',
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <div className="max-w-5xl mx-auto px-4 pb-16 pt-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors font-medium">
            ← Quay lại
          </Link>
          <h1 className="text-2xl font-display font-bold text-white">Lịch sử giao dịch</h1>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-[#111827] p-6 rounded-2xl border border-white/5 shadow-lg flex items-center gap-5 relative overflow-hidden group hover:border-teal-500/30 transition-colors">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/10 rounded-full blur-[30px] group-hover:bg-teal-500/20 transition-colors pointer-events-none" />
              <div className="w-14 h-14 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                <ShoppingCart size={24} />
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-white leading-none">{stats.totalBuy}</span>
                  <span className="text-slate-400 font-medium">Đơn mua</span>
                </div>
                <span className="text-sm font-medium text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full">{stats.completedBuy} hoàn thành</span>
              </div>
            </div>
            
            <div className="bg-[#111827] p-6 rounded-2xl border border-white/5 shadow-lg flex items-center gap-5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-[30px] group-hover:bg-purple-500/20 transition-colors pointer-events-none" />
              <div className="w-14 h-14 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <DollarSign size={24} />
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-white leading-none">{stats.totalSell}</span>
                  <span className="text-slate-400 font-medium">Đơn bán</span>
                </div>
                <span className="text-sm font-medium text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full">{stats.completedSell} hoàn thành</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex p-1 bg-[#111827] rounded-xl border border-white/5 mb-8 w-fit mx-auto md:mx-0">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'buy', label: '🛒 Đã mua' },
            { id: 'sell', label: '💰 Đã bán' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-gradient-to-r from-teal-500 to-teal-400 text-slate-950 shadow-[0_2px_10px_rgba(0,212,180,0.3)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {error && (
          <div className="p-4 rounded-xl mb-6 text-sm font-medium border bg-rose-500/10 text-rose-400 border-rose-500/20 flex items-center gap-2">
            <XCircle size={18} /> {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            <p className="text-slate-400 font-medium">Đang tải giao dịch...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#111827] rounded-3xl border border-white/5 text-center">
            <div className="w-20 h-20 bg-[#0d1117] rounded-full flex items-center justify-center mb-4 border border-white/5">
              <Package size={32} className="text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Chưa có giao dịch nào</h3>
            <p className="text-slate-400">
              {activeTab === 'buy' ? 'Bạn chưa mua sản phẩm nào.' : activeTab === 'sell' ? 'Bạn chưa bán sản phẩm nào.' : 'Lịch sử giao dịch trống.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-[#111827] rounded-2xl border border-white/5 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:border-teal-500/20 hover:shadow-lg">
                  <div className="flex gap-4 items-center">
                    {tx.product_image ? (
                      <img src={tx.product_image} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/5 bg-[#0d1117]" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-[#0d1117] border border-white/5 flex items-center justify-center text-2xl">📦</div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-slate-200 text-lg leading-tight line-clamp-1">{tx.product_name || 'Sản phẩm'}</span>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock size={14} /> {formatDate(tx.created_at)}
                      </div>
                      {tx.note && <span className="text-sm text-slate-500 italic">" {tx.note} "</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:items-end gap-3 min-w-[200px] border-t border-white/5 md:border-0 pt-4 md:pt-0">
                    <div className="flex items-center justify-between md:flex-col md:items-end w-full">
                      <span className="font-bold text-teal-400 text-xl">{formatCurrency(tx.amount)}</span>
                      <span className={cn(
                        "text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mt-1",
                        tx.status === 'completed' ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" :
                        tx.status === 'pending' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        tx.status === 'cancelled' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      )}>
                        {STATUS_LABELS[tx.status] || tx.status}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2 w-full md:justify-end">
                      <button type="button" onClick={() => handleViewTimeline(tx)} className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 font-medium text-sm hover:bg-white/10 transition-colors">
                        Chi tiết
                      </button>
                      
                      {activeTab === 'buy' && tx.status === 'shipped' && (
                        <button type="button" onClick={() => handleConfirmReceipt(tx.id)} className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold text-sm hover:bg-teal-500/20 transition-colors">
                          Đã nhận hàng
                        </button>
                      )}
                      {activeTab === 'buy' && tx.status === 'completed' && !tx.my_review && (
                        <button type="button" onClick={() => openReviewModal(tx)} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-sm hover:bg-amber-500/20 transition-colors flex items-center gap-1">
                          <Star size={14} fill="currentColor" /> Đánh giá
                        </button>
                      )}
                      
                      {activeTab === 'sell' && tx.status === 'pending' && (
                        <>
                          <button type="button" onClick={() => handleUpdateStatus(tx.id, 'confirmed')} className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold text-sm hover:bg-teal-500/20 transition-colors">
                            Xác nhận
                          </button>
                          <button type="button" onClick={() => handleUpdateStatus(tx.id, 'cancelled')} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-sm hover:bg-rose-500/20 transition-colors">
                            Từ chối
                          </button>
                        </>
                      )}
                      {activeTab === 'sell' && tx.status === 'confirmed' && (
                        <button type="button" onClick={() => handleUpdateStatus(tx.id, 'shipped')} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-sm hover:bg-blue-500/20 transition-colors">
                          Giao hàng
                        </button>
                      )}
                    </div>
                    {tx.my_review && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                        <Star size={12} fill="currentColor" /> {tx.my_review.rating}/5 Đã đánh giá
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg bg-[#111827] text-slate-400 hover:text-white border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-slate-300">
                  Trang <span className="text-white">{pagination.page}</span> / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg bg-[#111827] text-slate-400 hover:text-white border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
            
            <p className="text-center text-sm text-slate-500 font-medium">Tổng: {pagination.total} giao dịch</p>
          </div>
        )}

        {/* Timeline Modal */}
        {showTimeline && selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTimeline(false)}>
            <div className="bg-[#111827] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#0a0f1e]/50">
                <h3 className="font-bold text-lg text-white">Chi tiết giao dịch</h3>
                <button type="button" onClick={() => setShowTimeline(false)} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6 pb-4 border-b border-white/5">
                  <h4 className="font-bold text-slate-200 mb-1">{selectedTransaction.product_name}</h4>
                  <p className="font-bold text-teal-400 text-xl">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                
                <div className="flex flex-col gap-6 relative before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-white/10">
                  {getTimelineEvents(selectedTransaction).map((event, index) => (
                    <div key={index} className="flex gap-4 relative z-10">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-4 border-[#111827]", event.completed ? "bg-teal-500" : "bg-slate-700")}>
                        {event.completed && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex flex-col pt-0.5">
                        <h5 className={cn("font-bold text-sm", event.completed ? "text-slate-200" : "text-slate-500")}>{event.label}</h5>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(event.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedTransaction.rejection_reason && (
                  <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1">Lý do từ chối:</h5>
                    <p className="text-sm text-rose-300">{selectedTransaction.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && reviewTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmittingReview && setShowReviewModal(false)}>
            <div className="bg-[#111827] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#0a0f1e]/50">
                <h3 className="font-bold text-lg text-white">Đánh giá giao dịch</h3>
                <button type="button" onClick={() => !isSubmittingReview && setShowReviewModal(false)} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  Bạn đánh giá trải nghiệm mua sản phẩm <strong className="text-white">{reviewTarget.product_name}</strong> như thế nào?
                </p>

                <div className="flex items-center justify-center gap-2 mb-8">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const starValue = index + 1;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setReviewRating(starValue)}
                        disabled={isSubmittingReview}
                        className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star size={36} className={starValue <= reviewRating ? "text-amber-400 fill-current" : "text-slate-700"} />
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 mb-8">
                  <label htmlFor="review-comment" className="text-sm font-medium text-slate-400">Nhận xét (tùy chọn)</label>
                  <textarea
                    id="review-comment"
                    rows={4}
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    maxLength={500}
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-xl font-bold bg-white/5 text-white hover:bg-white/10 transition-colors"
                    onClick={() => setShowReviewModal(false)}
                    disabled={isSubmittingReview}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-teal-400 text-slate-950 hover:shadow-[0_0_15px_rgba(0,212,180,0.4)] transition-all"
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
