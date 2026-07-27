import { useCallback, useEffect, useState } from 'react';
import { Flag, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getModerationReports, moderateReport } from '../../services/reportService';

const STATUS_LABELS = {
  submitted: 'Mới',
  in_review: 'Đang xem xét',
  resolved: 'Đã xử lý',
  dismissed: 'Bỏ qua',
};

function ModerationPage() {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setReports(await getModerationReports(status));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleAction = async (report, nextStatus, action = 'none') => {
    const note = window.prompt('Ghi chú moderation (không nhập dữ liệu nhạy cảm):', '') ?? '';
    try {
      setSavingId(report.id);
      setError('');
      await moderateReport(report.id, { status: nextStatus, action, note });
      await loadReports();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setSavingId('');
    }
  };

  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-teal-400">
              <ShieldCheck size={17} /> TRUST & SAFETY
            </p>
            <h1 className="text-3xl font-bold text-white">Moderation queue</h1>
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#111827] px-4 py-2"
            >
              <option value="all">Tất cả</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadReports}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 hover:bg-white/10"
              aria-label="Tải lại"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {error && (
          <p className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-slate-400">Đang tải moderation queue...</p>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-10 text-center">
            Không có báo cáo phù hợp.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const closed = ['resolved', 'dismissed'].includes(report.status);
              return (
                <article
                  key={report.id}
                  className="rounded-2xl border border-white/5 bg-[#111827] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 font-bold text-white">
                        <Flag size={17} className="text-amber-400" />
                        {report.target_type} · {report.reason}
                      </h2>
                      <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-slate-400">
                        {report.details || 'Không có mô tả bổ sung.'}
                      </p>
                      {report.product_id && (
                        <Link
                          to={`/products/${report.product_id}`}
                          className="mt-2 inline-block text-sm font-bold text-teal-400 hover:underline"
                        >
                          Mở sản phẩm bị báo cáo
                        </Link>
                      )}
                      {Array.isArray(report.evidence_urls) && report.evidence_urls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {report.evidence_urls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-sky-300 hover:underline"
                            >
                              Bằng chứng
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold">
                      {STATUS_LABELS[report.status] || report.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!closed && (
                      <>
                        <button
                          type="button"
                          disabled={savingId === report.id}
                          onClick={() => handleAction(report, 'in_review')}
                          className="rounded-lg bg-sky-500/15 px-3 py-2 text-sm text-sky-300"
                        >
                          Nhận xử lý
                        </button>
                        <button
                          type="button"
                          disabled={savingId === report.id}
                          onClick={() => handleAction(report, 'resolved', 'warn')}
                          className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-300"
                        >
                          Cảnh báo
                        </button>
                        {report.product_id && (
                          <button
                            type="button"
                            disabled={savingId === report.id}
                            onClick={() => handleAction(report, 'resolved', 'hide_listing')}
                            className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300"
                          >
                            Ẩn tin
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={savingId === report.id}
                          onClick={() => handleAction(report, 'resolved', 'suspend_user')}
                          className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300"
                        >
                          Khóa user
                        </button>
                        <button
                          type="button"
                          disabled={savingId === report.id}
                          onClick={() => handleAction(report, 'dismissed')}
                          className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300"
                        >
                          Bỏ qua
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default ModerationPage;
