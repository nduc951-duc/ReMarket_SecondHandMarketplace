import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getTransactionById,
  getTransactions,
  getTransactionStats,
  updateTransactionStatus,
} from '../../services/transactionService';

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

  const loadData = useCallback(async (type = 'all', page = 1) => {
    try {
      setIsLoading(true);
      setError('');

      const [txResult, statsResult] = await Promise.all([
        getTransactions({ type, page, limit: 10 }),
        stats === null ? getTransactionStats() : Promise.resolve(stats),
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
    <main className="page-shell">
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <Link to="/app" className="back-link">← Quay lại</Link>
            <h1>Lịch sử giao dịch</h1>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card stat-buy">
              <span className="stat-icon">🛒</span>
              <div className="stat-info">
                <span className="stat-number">{stats.totalBuy}</span>
                <span className="stat-label">Đơn mua</span>
              </div>
              <span className="stat-sub">{stats.completedBuy} hoàn thành</span>
            </div>
            <div className="stat-card stat-sell">
              <span className="stat-icon">💰</span>
              <div className="stat-info">
                <span className="stat-number">{stats.totalSell}</span>
                <span className="stat-label">Đơn bán</span>
              </div>
              <span className="stat-sub">{stats.completedSell} hoàn thành</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tx-tabs">
          <button
            type="button"
            className={`tx-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`tx-tab ${activeTab === 'buy' ? 'active' : ''}`}
            onClick={() => handleTabChange('buy')}
          >
            🛒 Đã mua
          </button>
          <button
            type="button"
            className={`tx-tab ${activeTab === 'sell' ? 'active' : ''}`}
            onClick={() => handleTabChange('sell')}
          >
            💰 Đã bán
          </button>
        </div>

        {/* Content */}
        {error && <p className="form-feedback error">{error}</p>}

        {isLoading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
            <p>Đang tải giao dịch...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <h3>Chưa có giao dịch nào</h3>
            <p>
              {activeTab === 'buy'
                ? 'Bạn chưa mua sản phẩm nào.'
                : activeTab === 'sell'
                  ? 'Bạn chưa bán sản phẩm nào.'
                  : 'Lịch sử giao dịch trống.'}
            </p>
          </div>
        ) : (
          <>
            {/* Transaction List */}
            <div className="tx-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="tx-item">
                  <div className="tx-item-left">
                    {tx.product_image ? (
                      <img src={tx.product_image} alt="" className="tx-product-img" />
                    ) : (
                      <div className="tx-product-placeholder">📦</div>
                    )}
                    <div className="tx-item-info">
                      <span className="tx-product-name">{tx.product_name || 'Sản phẩm'}</span>
                      <span className="tx-date">{formatDate(tx.created_at)}</span>
                      {tx.payment_method && (
                        <span className="tx-payment">{tx.payment_method}</span>
                      )}
                      {tx.note && (
                        <span className="tx-note">Ghi chú: {tx.note}</span>
                      )}
                    </div>
                  </div>
                  <div className="tx-item-right">
                    <span className="tx-amount">{formatCurrency(tx.amount)}</span>
                    <span className={`tx-status ${STATUS_CLASSES[tx.status] || ''}`}>
                      {STATUS_LABELS[tx.status] || tx.status}
                    </span>
                    <div className="tx-actions">
                      <button
                        type="button"
                        className="tx-action-btn"
                        onClick={() => handleViewTimeline(tx)}
                      >
                        📋 Chi tiết
                      </button>
                      {activeTab === 'buy' && tx.status === 'shipped' && (
                        <button
                          type="button"
                          className="tx-action-btn confirm-btn"
                          onClick={() => handleConfirmReceipt(tx.id)}
                        >
                          ✅ Xác nhận nhận hàng
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  ‹ Trước
                </button>
                <span className="page-info">
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Sau ›
                </button>
              </div>
            )}

            <p className="tx-total-info">Tổng: {pagination.total} giao dịch</p>
          </>
        )}

        {/* Timeline Modal */}
        {showTimeline && selectedTransaction && (
          <div className="modal-overlay" onClick={() => setShowTimeline(false)}>
            <div className="modal-content timeline-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chi tiết giao dịch</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowTimeline(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="timeline-container">
                  <div className="timeline-header">
                    <h4>{selectedTransaction.product_name}</h4>
                    <p className="timeline-amount">{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                  <div className="timeline">
                    {getTimelineEvents(selectedTransaction).map((event, index) => (
                      <div key={index} className={`timeline-item ${event.completed ? 'completed' : 'pending'}`}>
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <h5>{event.label}</h5>
                          <p className="timeline-timestamp">{formatDate(event.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedTransaction.rejection_reason && (
                    <div className="rejection-reason">
                      <h5>Lý do từ chối:</h5>
                      <p>{selectedTransaction.rejection_reason}</p>
                    </div>
                  )}
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
