import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="error-page-card">
          <span className="error-code">404</span>
          <h1>Trang khong ton tai</h1>
          <p>Duong dan ban vua truy cap khong ton tai hoac da duoc thay doi.</p>
          <div className="error-page-actions">
            <Link to="/app" className="btn-primary" style={{ textDecoration: 'none' }}>
              Ve trang chu
            </Link>
            <Link to="/chat" className="btn-outline" style={{ textDecoration: 'none' }}>
              Mo chat
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default NotFoundPage;