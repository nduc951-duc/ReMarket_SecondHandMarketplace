import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTransactions, updateTransactionStatus } from '../../services/transactionService';
import { useAuthStore } from '../../store/authStore';

const statusLabels = {
  awaiting_payment: 'Chờ thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đã giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function SellerDashboard() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTransactions({
        type: 'sell',
        status: filterStatus === 'all' ? undefined : filterStatus,
        limit: 50,
      });
      setTransactions(result.transactions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleStatusUpdate = async (transactionId, newStatus, reason = '') => {
    try {
      await updateTransactionStatus(transactionId, newStatus, reason);
      await loadTransactions(); // Reload transactions
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedTransaction(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const openRejectModal = (transaction) => {
    setSelectedTransaction(transaction);
    setShowRejectModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const statusCounts = transactions.reduce((accumulator, transaction) => {
    const key = transaction.status || 'pending';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  if (!user) {
    return (
      <main className="page-shell">
        <section className="auth-required-card">
          <h2>
            Bạn cần đăng nhập
          </h2>
          <p>
            Vui lòng đăng nhập để xem dashboard người bán.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container page-container-wide seller-dashboard-page">
        <header className="seller-hero">
          <div>
            <Link to="/app" className="back-link">← Quay lại</Link>
            <h1>Dashboard Người Bán</h1>
            <p>Quản lý đơn đến, cập nhật trạng thái và giữ luồng xử lý rõ ràng.</p>
          </div>
          <div className="seller-hero-pill">
            <span>{transactions.length}</span>
            <small>đơn hàng hiển thị</small>
          </div>
        </header>

        <section className="seller-kpi-grid">
          <article className="seller-kpi-card">
            <p>Chờ xác nhận</p>
            <strong>{statusCounts.pending || 0}</strong>
          </article>
          <article className="seller-kpi-card">
            <p>Đã xác nhận</p>
            <strong>{statusCounts.confirmed || 0}</strong>
          </article>
          <article className="seller-kpi-card">
            <p>Đang giao</p>
            <strong>{statusCounts.shipped || 0}</strong>
          </article>
          <article className="seller-kpi-card">
            <p>Hoàn thành</p>
            <strong>{statusCounts.completed || 0}</strong>
          </article>
        </section>

        <section className="seller-filter-wrap">
          <div className="seller-filter-title">Lọc theo trạng thái</div>
          <div className="seller-filter-row">
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'awaiting_payment', label: 'Chờ thanh toán' },
              { value: 'pending', label: 'Chờ xác nhận' },
              { value: 'confirmed', label: 'Đã xác nhận' },
              { value: 'shipped', label: 'Đã giao' },
              { value: 'completed', label: 'Hoàn thành' },
              { value: 'cancelled', label: 'Đã hủy' },
            ].map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => setFilterStatus(status.value)}
                className={`seller-chip ${filterStatus === status.value ? 'active' : ''}`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p className="form-feedback error">{error}</p>
        )}

        {loading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
            <p>Đang tải danh sách đơn hàng...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>Chưa có đơn hàng nào</h3>
            <p>Không có dữ liệu khớp bộ lọc hiện tại.</p>
          </div>
        ) : (
          <section className="seller-order-list">
            {transactions.map((transaction) => (
              <article key={transaction.id} className="seller-order-card">
                <div className="seller-order-main">
                  <div className="seller-order-left">
                    <img
                      className="seller-order-image"
                      src={transaction.product_image || '/placeholder-product.jpg'}
                      alt={transaction.product_name}
                    />
                    <div className="seller-order-info">
                      <h3>{transaction.product_name}</h3>
                      <p>Người mua: {transaction.buyer?.full_name || transaction.buyer_id || 'N/A'}</p>
                      <span>{formatDate(transaction.created_at)}</span>
                    </div>
                  </div>
                  <div className="seller-order-right">
                    <strong>{formatCurrency(transaction.amount)}</strong>
                    <span className={`seller-status seller-status-${transaction.status || 'pending'}`}>
                      {statusLabels[transaction.status] || transaction.status}
                    </span>
                  </div>
                </div>

                <div className="seller-order-actions">
                  {transaction.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(transaction.id, 'confirmed')}
                        className="seller-btn seller-btn-confirm"
                      >
                        Xác nhận
                      </button>
                      <button
                        type="button"
                        onClick={() => openRejectModal(transaction)}
                        className="seller-btn seller-btn-reject"
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {transaction.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(transaction.id, 'shipped')}
                      className="seller-btn seller-btn-ship"
                    >
                      Đã giao hàng
                    </button>
                  )}
                </div>

                {transaction.rejection_reason && (
                  <div className="seller-rejection-box">
                    <strong>Lý do từ chối:</strong>
                    <p>{transaction.rejection_reason}</p>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {showRejectModal && selectedTransaction && (
          <div className="dialog-overlay" onClick={() => setShowRejectModal(false)}>
            <div className="dialog-panel" onClick={(event) => event.stopPropagation()}>
              <div className="dialog-header">
                <h3>Từ chối đơn hàng</h3>
                <button
                  type="button"
                  className="dialog-close"
                  onClick={() => setShowRejectModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="dialog-body">
                <label htmlFor="reject-reason" className="dialog-label">Lý do từ chối</label>
                <textarea
                  id="reject-reason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  className="dialog-textarea"
                  rows={4}
                  placeholder="Ví dụ: sản phẩm đã hết hàng hoặc thông tin người mua chưa rõ..."
                />
                <div className="dialog-actions">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="btn-outline"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedTransaction.id, 'cancelled', rejectionReason)}
                    className="btn-primary"
                    disabled={!rejectionReason.trim()}
                  >
                    Xác nhận từ chối
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

export default SellerDashboard;
