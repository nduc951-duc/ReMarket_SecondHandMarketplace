import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

function ClientHomePage() {
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setErrorMessage('');

    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email || 'Người dùng';

  return (
    <main className="page-shell">
      <div className="page-container">
        {/* Top Bar */}
        <div className="home-topbar">
          <p className="brand-label">ReMarket</p>
          <button
            type="button"
            className="btn-logout-sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? '⏳' : '🚪'} Đăng xuất
          </button>
        </div>

        {/* Welcome Section */}
        <section className="welcome-section">
          <h1>Xin chào, {displayName}!</h1>
          <p className="welcome-desc">
            Chào mừng bạn đến với ReMarket — nền tảng mua bán đồ cũ an toàn và tiện lợi.
          </p>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <Link to="/profile" className="action-card" id="nav-profile">
            <span className="action-icon">👤</span>
            <div className="action-text">
              <span className="action-title">Hồ sơ cá nhân</span>
              <span className="action-desc">Xem & chỉnh sửa thông tin của bạn</span>
            </div>
            <span className="action-arrow">→</span>
          </Link>

          <Link to="/transactions" className="action-card" id="nav-transactions">
            <span className="action-icon">📋</span>
            <div className="action-text">
              <span className="action-title">Lịch sử giao dịch</span>
              <span className="action-desc">Xem lịch sử mua và bán</span>
            </div>
            <span className="action-arrow">→</span>
          </Link>

          <Link to="/change-password" className="action-card" id="nav-change-password">
            <span className="action-icon">🔑</span>
            <div className="action-text">
              <span className="action-title">Đổi mật khẩu</span>
              <span className="action-desc">Cập nhật mật khẩu tài khoản</span>
            </div>
            <span className="action-arrow">→</span>
          </Link>
        </section>

        {/* User Info */}
        <section className="info-card">
          <div className="user-meta">
            <span className="meta-label">Tài khoản</span>
            <strong>{user?.email || 'Không xác định'}</strong>
          </div>
        </section>

        {errorMessage && <p className="form-feedback error">{errorMessage}</p>}
      </div>
    </main>
  );
}

export default ClientHomePage;
