import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminOverview,
  getAdminUsers,
  createAdminUser,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '../../services/adminService';
const ROLE_OPTIONS = ['admin', 'agent', 'customer'];
const STATUS_OPTIONS = ['active', 'blocked'];

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
}

function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingUserId, setIsSavingUserId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'customer',
  });

  const loadAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const [overviewData, usersData] = await Promise.all([
        getAdminOverview(),
        getAdminUsers({ limit: 50 }),
      ]);

      setOverview(overviewData);
      setUsers(usersData.items || []);
    } catch (loadError) {
      setError(loadError.message);
      setOverview(null);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleCreateUser = async (event) => {
    event.preventDefault();

    try {
      setIsCreating(true);
      setError('');
      await createAdminUser(formValues);
      setFormValues({ email: '', password: '', full_name: '', role: 'customer' });
      await loadAdminData();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async (userId, nextRole) => {
    try {
      setIsSavingUserId(userId);
      await updateAdminUserRole(userId, nextRole);
      await loadAdminData();
    } catch (roleError) {
      setError(roleError.message);
    } finally {
      setIsSavingUserId('');
    }
  };

  const handleUpdateStatus = async (userId, nextStatus) => {
    try {
      setIsSavingUserId(userId);
      await updateAdminUserStatus(userId, nextStatus);
      await loadAdminData();
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setIsSavingUserId('');
    }
  };

  return (
    <main className="page-shell">
      <div className="page-container page-container-wide admin-page">
        <header className="admin-header">
          <div>
            <Link to="/app" className="back-link">← Quay lai</Link>
            <h1>Admin Dashboard</h1>
            <p>Quan ly users va phan quyen tam thoi.</p>
          </div>
          <button type="button" className="btn-outline" onClick={loadAdminData}>
            Tai lai du lieu
          </button>
        </header>

        {error && <p className="form-feedback error">{error}</p>}

        {isLoading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
            <p>Dang tai du lieu admin...</p>
          </div>
        ) : (
          <>
            {overview && (
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

            <section className="admin-table-wrap" style={{ marginTop: 16 }}>
              <div className="admin-toolbar">
                <div>
                  <h2>Quan ly user</h2>
                  <p>Tao nhanh tai khoan test va cap nhat role.</p>
                </div>
              </div>

              <form className="admin-create-form" onSubmit={handleCreateUser}>
                <input
                  type="email"
                  placeholder="Email"
                  value={formValues.email}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
                <input
                  type="text"
                  placeholder="Ho ten"
                  value={formValues.full_name}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, full_name: event.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Mat khau"
                  value={formValues.password}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, password: event.target.value }))}
                  required
                />
                <select
                  value={formValues.role}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, role: event.target.value }))}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <button type="submit" className="btn-primary" disabled={isCreating}>
                  {isCreating ? 'Dang tao...' : 'Tao user'}
                </button>
              </form>

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
                      <th>Trang thai</th>
                      <th>Rating</th>
                      <th>Ngay tao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.email}</td>
                        <td>{entry.full_name || '—'}</td>
                        <td>
                          <select
                            className="admin-status-select"
                            value={entry.role || 'customer'}
                            onChange={(event) => handleUpdateRole(entry.id, event.target.value)}
                            disabled={isSavingUserId === entry.id}
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="admin-status-select"
                            value={entry.status || 'active'}
                            onChange={(event) => handleUpdateStatus(entry.id, event.target.value)}
                            disabled={isSavingUserId === entry.id}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                        <td>{Number(entry.rating_avg || 0).toFixed(1)} ({entry.rating_count || 0})</td>
                        <td>{new Date(entry.created_at).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default AdminDashboardPage;