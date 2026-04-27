import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminOverview,
  getAdminProducts,
  getAdminTransactions,
  getAdminUsers,
  updateAdminProductStatus,
} from '../../services/adminService';

const PRODUCT_STATUS_OPTIONS = ['active', 'sold', 'hidden', 'banned'];

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
}

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingProductId, setIsUpdatingProductId] = useState('');
  const [error, setError] = useState('');

  const loadAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const [overviewData, usersData, productsData, transactionsData] = await Promise.all([
        getAdminOverview(),
        getAdminUsers({ limit: 30 }),
        getAdminProducts({ limit: 30 }),
        getAdminTransactions({ limit: 30 }),
      ]);

      setOverview(overviewData);
      setUsers(usersData.items || []);
      setProducts(productsData.products || []);
      setTransactions(transactionsData.transactions || []);
    } catch (loadError) {
      setError(loadError.message);
      setOverview(null);
      setUsers([]);
      setProducts([]);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleUpdateStatus = async (productId, nextStatus) => {
    try {
      setIsUpdatingProductId(productId);
      await updateAdminProductStatus(productId, nextStatus);
      await loadAdminData();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setIsUpdatingProductId('');
    }
  };

  return (
    <main className="page-shell">
      <div className="page-container page-container-wide admin-page">
        <header className="admin-header">
          <div>
            <Link to="/app" className="back-link">← Quay lai</Link>
            <h1>Admin Dashboard</h1>
            <p>Quan ly users, san pham, don hang va theo doi thong ke co ban.</p>
          </div>
          <button type="button" className="btn-outline" onClick={loadAdminData}>
            Tai lai du lieu
          </button>
        </header>

        <div className="admin-tabs">
          {[
            { value: 'overview', label: 'Tong quan' },
            { value: 'users', label: 'Users' },
            { value: 'products', label: 'San pham' },
            { value: 'transactions', label: 'Don hang' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`admin-tab ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="form-feedback error">{error}</p>}

        {isLoading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
            <p>Dang tai du lieu admin...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && overview && (
              <section className="admin-overview-grid">
                <article className="admin-stat-card">
                  <p>Tong users</p>
                  <strong>{overview.users.total}</strong>
                  <small>{overview.users.emailConfirmed} email da xac nhan</small>
                </article>
                <article className="admin-stat-card">
                  <p>Tong san pham</p>
                  <strong>{overview.products.total}</strong>
                  <small>Active: {overview.products.byStatus.active || 0}</small>
                </article>
                <article className="admin-stat-card">
                  <p>Tong don hang</p>
                  <strong>{overview.transactions.total}</strong>
                  <small>Completed: {overview.transactions.byStatus.completed || 0}</small>
                </article>
                <article className="admin-stat-card admin-revenue">
                  <p>Tong doanh thu</p>
                  <strong>{formatCurrency(overview.transactions.totalRevenue)}</strong>
                  <small>Tu don hang da hoan thanh</small>
                </article>
              </section>
            )}

            {activeTab === 'users' && (
              <section className="admin-table-wrap">
                {users.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">👥</span>
                    <h3>Khong co user nao</h3>
                    <p>Du lieu user se hien thi tai day.</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Ho ten</th>
                        <th>Vai tro</th>
                        <th>Rating</th>
                        <th>Ngay tao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.email}</td>
                          <td>{entry.full_name || '—'}</td>
                          <td>{entry.role || 'user'}</td>
                          <td>{Number(entry.rating_avg || 0).toFixed(1)} ({entry.rating_count || 0})</td>
                          <td>{new Date(entry.created_at).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {activeTab === 'products' && (
              <section className="admin-table-wrap">
                {products.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">📦</span>
                    <h3>Khong co san pham</h3>
                    <p>Danh sach san pham se hien thi tai day.</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Tieu de</th>
                        <th>Nguoi ban</th>
                        <th>Gia</th>
                        <th>Trang thai</th>
                        <th>Cap nhat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.title}</td>
                          <td>{entry.profile?.full_name || '—'}</td>
                          <td>{formatCurrency(entry.price)}</td>
                          <td>
                            <select
                              className="admin-status-select"
                              value={entry.status}
                              onChange={(event) => handleUpdateStatus(entry.id, event.target.value)}
                              disabled={isUpdatingProductId === entry.id}
                            >
                              {PRODUCT_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                          <td>{new Date(entry.updated_at || entry.created_at).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {activeTab === 'transactions' && (
              <section className="admin-table-wrap">
                {transactions.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">🧾</span>
                    <h3>Khong co don hang</h3>
                    <p>Danh sach don hang se hien thi tai day.</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>San pham</th>
                        <th>Nguoi mua</th>
                        <th>Nguoi ban</th>
                        <th>Trang thai</th>
                        <th>Gia tri</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.product_name || 'San pham'}</td>
                          <td>{entry.buyer?.full_name || entry.buyer_id || '—'}</td>
                          <td>{entry.seller?.full_name || entry.seller_id || '—'}</td>
                          <td>{entry.status}</td>
                          <td>{formatCurrency(entry.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default AdminDashboardPage;