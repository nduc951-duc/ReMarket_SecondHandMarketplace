import { Link } from 'react-router-dom';

function ServerErrorPage() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="error-page-card">
          <span className="error-code">500</span>
          <h1>He thong dang gap su co</h1>
          <p>
            Server tam thoi khong the xu ly yeu cau. Ban thu tai lai sau it phut.
          </p>
          <div className="error-page-actions">
            <Link to="/app" className="btn-primary" style={{ textDecoration: 'none' }}>
              Thu lai
            </Link>
            <Link to="/profile" className="btn-outline" style={{ textDecoration: 'none' }}>
              Ve ho so
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ServerErrorPage;