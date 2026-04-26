import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTransactions, getTransactionStats } from '../../services/profileService';

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  refunded: 'Hoàn tiền',
};

const STATUS_CLASSES = {
  pending: 'status-pending',
  processing: 'status-processing',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
  refunded: 'status-refunded',
};

function TransactionHistoryPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
                    </div>
                  </div>
                  <div className="tx-item-right">
                    <span className="tx-amount">{formatCurrency(tx.amount)}</span>
                    <span className={`tx-status ${STATUS_CLASSES[tx.status] || ''}`}>
                      {STATUS_LABELS[tx.status] || tx.status}
                    </span>
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
      </div>
    </main>
  );
}

export default TransactionHistoryPage;
