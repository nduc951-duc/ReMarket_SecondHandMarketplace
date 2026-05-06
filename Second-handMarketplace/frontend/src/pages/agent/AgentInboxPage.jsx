import { Link } from 'react-router-dom';

function AgentInboxPage() {
  return (
    <main className="page-shell">
      <div className="page-container page-container-wide">
        <header className="admin-header">
          <div>
            <Link to="/app" className="back-link">← Quay lai</Link>
            <h1>Ho tro khach hang</h1>
            <p>Inbox CSKH se duoc trien khai o phase sau.</p>
          </div>
        </header>

        <div className="empty-state">
          <span className="empty-icon">💬</span>
          <h3>Inbox dang duoc phat trien</h3>
          <p>Vui long quay lai sau khi he thong ticket hoan tat.</p>
        </div>
      </div>
    </main>
  );
}

export default AgentInboxPage;
