import { Link } from 'react-router-dom';

function ForbiddenPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <div className="error-page-card">
          <span className="error-code">403</span>
          <h1>Khong co quyen truy cap</h1>
          <p>Ban khong co quyen de xem trang nay.</p>
          <div className="error-page-actions">
            <Link to="/app" className="btn-primary">Ve trang chu</Link>
            <Link to="/login" className="btn-outline">Dang nhap lai</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ForbiddenPage;
