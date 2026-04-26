import { Link } from 'react-router-dom';

function AuthLayout({ title, subtitle, alternateLabel, alternateAction, alternatePath, children }) {
  return (
    <main className="auth-shell">
      <div className="auth-gradient auth-gradient-left" />
      <div className="auth-gradient auth-gradient-right" />

      <section className="auth-panel">
        <aside className="auth-aside">
          <p className="brand-label">ReMarket</p>
          <h1>Mua bán đồ cũ theo cách hiện đại, an toàn hơn.</h1>
          <p>
            Nền tảng kết nối người mua và người bán trong cộng đồng, giúp giao dịch nhanh và đáng
            tin cậy.
          </p>
          <ul>
            <li>Xác thực tài khoản rõ ràng</li>
            <li>Chat trực tiếp với người bán</li>
            <li>Theo dõi trạng thái đơn hàng minh bạch</li>
          </ul>
        </aside>

        <section className="auth-card" aria-label={title}>
          <h2>{title}</h2>
          <p className="auth-subtitle">{subtitle}</p>

          {children}

          <p className="auth-switch">
            {alternateLabel}{' '}
            <Link to={alternatePath} className="auth-link">
              {alternateAction}
            </Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default AuthLayout;
