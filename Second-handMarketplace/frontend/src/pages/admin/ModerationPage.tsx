import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  EyeOff,
  Flag,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserX,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
  buttonVariants,
} from '@/components/ui';
import {
  getModerationReports,
  moderateReport,
  type ModerateReportInput,
  type ModerationAction,
} from '@/services/reportService';
import type { Report, ReportStatus } from '@/types/domain';

const statusOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'submitted', label: 'Mới gửi' },
  { value: 'in_review', label: 'Đang xem xét' },
  { value: 'resolved', label: 'Đã xử lý' },
  { value: 'dismissed', label: 'Đã bỏ qua' },
];

const actionLabels: Record<string, string> = {
  none: 'Không áp dụng biện pháp',
  warn: 'Cảnh báo người dùng',
  hide_listing: 'Ẩn sản phẩm',
  suspend_user: 'Khóa người dùng',
};

function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Chưa cập nhật';
}

function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<Report | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setReports(await getModerationReports(status));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải hàng chờ kiểm duyệt.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const perform = async (
    report: Report,
    nextStatus: Exclude<ReportStatus, 'submitted'>,
    action: ModerationAction,
  ) => {
    const input: ModerateReportInput = { status: nextStatus, action, note: note.trim() };
    try {
      setBusyId(report.id);
      setError('');
      await moderateReport(report.id, input);
      setSelected(null);
      setNote('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể xử lý báo cáo.');
      throw caught;
    } finally {
      setBusyId('');
    }
  };

  return (
    <MarketplaceLayout className="space-y-6">
      <header className="border-b border-border pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldAlert className="size-4" />
              Trust & Safety
            </p>
            <h1 className="mt-2 text-3xl font-bold">Hàng chờ kiểm duyệt</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Xem bằng chứng, ghi nhận quyết định và áp dụng biện pháp phù hợp cho từng báo cáo.
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="min-w-48"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Làm mới">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {error && <ErrorState title="Có lỗi khi tải báo cáo" description={error} onRetry={load} />}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Hàng chờ đang trống"
          description="Không có báo cáo nào phù hợp với bộ lọc hiện tại."
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-warning/10 text-warning">
                    <Flag className="size-5" />
                  </span>
                  <StatusBadge status={report.status} />
                </div>
                <h2 className="mt-4 font-semibold">
                  {report.target_type === 'product' ? 'Báo cáo sản phẩm' : 'Báo cáo người dùng'} ·{' '}
                  {report.reason}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {report.details || 'Người báo cáo không cung cấp mô tả bổ sung.'}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(report.created_at)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(report);
                      setNote(report.resolution_note || '');
                    }}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setNote('');
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết báo cáo</DialogTitle>
            <DialogDescription>
              Kiểm tra đầy đủ mục tiêu, bằng chứng và lịch sử trước khi ra quyết định.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
              <div className="space-y-5">
                <section className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selected.status} />
                    <span className="text-xs text-muted-foreground">
                      Mã: {selected.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold">{selected.reason}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {selected.details || 'Không có mô tả bổ sung.'}
                  </p>
                  {selected.product_id && (
                    <Link
                      to={`/products/${selected.product_id}`}
                      className={`${buttonVariants({ variant: 'outline', size: 'sm' })} mt-4`}
                    >
                      <ExternalLink className="size-4" />
                      Mở sản phẩm
                    </Link>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold">Bằng chứng</h3>
                  {selected.evidence_urls?.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {selected.evidence_urls.map((url, index) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-muted"
                        >
                          Bằng chứng {index + 1}
                          <ExternalLink className="size-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Báo cáo này không đính kèm bằng chứng.
                    </p>
                  )}
                </section>

                {!['resolved', 'dismissed'].includes(selected.status) && (
                  <section>
                    <label htmlFor="moderation-note" className="text-sm font-semibold">
                      Ghi chú xử lý
                    </label>
                    <Textarea
                      id="moderation-note"
                      rows={4}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Ghi rõ căn cứ quyết định, không nhập dữ liệu nhạy cảm…"
                      className="mt-2"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.status === 'submitted' && (
                        <Button
                          size="sm"
                          disabled={busyId === selected.id}
                          onClick={() => void perform(selected, 'in_review', 'none')}
                        >
                          {busyId === selected.id && <Loader2 className="size-4 animate-spin" />}
                          Nhận xử lý
                        </Button>
                      )}
                      <ModerationDecision
                        report={selected}
                        action="warn"
                        label="Cảnh báo"
                        note={note}
                        busy={busyId === selected.id}
                        onConfirm={() => perform(selected, 'resolved', 'warn')}
                      />
                      {selected.product_id && (
                        <ModerationDecision
                          report={selected}
                          action="hide_listing"
                          label="Ẩn listing"
                          note={note}
                          busy={busyId === selected.id}
                          onConfirm={() => perform(selected, 'resolved', 'hide_listing')}
                        />
                      )}
                      <ModerationDecision
                        report={selected}
                        action="suspend_user"
                        label="Khóa người dùng"
                        note={note}
                        busy={busyId === selected.id}
                        onConfirm={() => perform(selected, 'resolved', 'suspend_user')}
                      />
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="outline" disabled={busyId === selected.id}>
                            Bỏ qua
                          </Button>
                        }
                        title="Bỏ qua báo cáo?"
                        description="Báo cáo sẽ được đóng mà không áp dụng biện pháp."
                        confirmLabel="Bỏ qua báo cáo"
                        onConfirm={() => perform(selected, 'dismissed', 'none')}
                      />
                    </div>
                  </section>
                )}
              </div>

              <aside className="rounded-2xl bg-muted/60 p-4">
                <h3 className="text-sm font-semibold">Lịch sử xử lý</h3>
                <div className="mt-4 space-y-5">
                  <TimelineItem
                    icon={Flag}
                    title="Báo cáo được gửi"
                    description={formatDate(selected.created_at)}
                  />
                  {selected.status !== 'submitted' && (
                    <TimelineItem
                      icon={Clock3}
                      title="Đã tiếp nhận"
                      description="Nhân viên bắt đầu xem xét"
                    />
                  )}
                  {selected.status === 'resolved' && (
                    <TimelineItem
                      icon={CheckCircle2}
                      title={actionLabels[selected.resolution_action || 'none']}
                      description={selected.resolution_note || formatDate(selected.updated_at)}
                    />
                  )}
                  {selected.status === 'dismissed' && (
                    <TimelineItem
                      icon={XCircle}
                      title="Báo cáo bị bỏ qua"
                      description={selected.resolution_note || formatDate(selected.updated_at)}
                    />
                  )}
                </div>
              </aside>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MarketplaceLayout>
  );
}

function TimelineItem({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Flag;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ModerationDecision({
  action,
  label,
  note,
  busy,
  onConfirm,
}: {
  report: Report;
  action: Exclude<ModerationAction, 'none'>;
  label: string;
  note: string;
  busy: boolean;
  onConfirm: () => Promise<void>;
}) {
  const Icon = action === 'warn' ? ShieldAlert : action === 'hide_listing' ? EyeOff : UserX;
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="destructive" disabled={busy}>
          <Icon className="size-4" />
          {label}
        </Button>
      }
      title={`${label}?`}
      description={
        note.trim()
          ? `Ghi chú: ${note.trim()}`
          : 'Bạn chưa nhập ghi chú. Hãy chắc chắn quyết định có đủ căn cứ.'
      }
      confirmLabel={label}
      destructive
      onConfirm={onConfirm}
    />
  );
}

export default ModerationPage;
