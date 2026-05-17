import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Boxes,
  CheckCircle2,
  ClipboardList,
  FolderTree,
  Loader2,
  PackageSearch,
  RefreshCcw,
  Search,
  Shield,
  Star,
  Store,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  createAdminUser,
  getAdminOverview,
  getAdminProducts,
  getAdminTransactions,
  getAdminUsers,
  updateAdminProductStatus,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '../../services/adminService';

const ROLE_OPTIONS = ['admin', 'agent', 'customer'];
const USER_STATUS_OPTIONS = ['active', 'blocked'];
const PRODUCT_STATUS_OPTIONS = ['active', 'sold', 'hidden', 'banned'];
const TRANSACTION_STATUS_OPTIONS = ['all', 'awaiting_payment', 'pending', 'confirmed', 'shipped', 'completed', 'cancelled'];

const PRODUCT_STATUS_LABELS = {
  active: 'Đang bán',
  sold: 'Đã bán',
  hidden: 'Đã ẩn',
  banned: 'Đã chặn',
};

const TRANSACTION_STATUS_LABELS = {
  awaiting_payment: 'Chờ thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipped: 'Đã giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const TABS = [
  { value: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'products', label: 'Sản phẩm', icon: Store },
  { value: 'transactions', label: 'Đơn hàng', icon: ClipboardList },
  { value: 'broadcast', label: 'Broadcast', icon: BellRing },
  { value: 'categories', label: 'Danh mục', icon: FolderTree },
  { value: 'reviews', label: 'Reviews', icon: Star },
];

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getCount(map, key) {
  return Number(map?.[key] || 0);
}

function StatusPill({ children, tone = 'slate' }) {
  const tones = {
    teal: 'border-teal-300/20 bg-teal-300/10 text-teal-100',
    amber: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
    rose: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
    violet: 'border-violet-300/20 bg-violet-300/10 text-violet-100',
    slate: 'border-white/10 bg-white/[0.04] text-slate-300',
  };

  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function SectionShell({ title, description, action, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 shadow-xl shadow-slate-950/30">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <label className="flex h-11 min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-slate-500 focus-within:border-teal-300/60">
      <Search size={16} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-600"
      />
    </label>
  );
}

function EmptyPanel({ icon: Icon = Boxes, title, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <Icon className="mx-auto text-slate-500" size={34} />
      <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{description}</p>
    </div>
  );
}

function ComingSoonPanel({ icon: Icon, title, description, items }) {
  return (
    <SectionShell title={title} description={description}>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-teal-300/20 bg-teal-300/10 p-5">
          <Icon className="text-teal-200" size={32} />
          <h3 className="mt-4 text-xl font-black text-white">Đã chốt scope</h3>
          <p className="mt-2 text-sm leading-6 text-teal-50/80">
            Giao diện đã dành chỗ cho module này. Bước tiếp theo là thêm API admin tương ứng.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-slate-300">
              <CheckCircle2 className="mb-3 text-teal-300" size={18} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productStatus, setProductStatus] = useState('all');
  const [transactionStatus, setTransactionStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingUserId, setIsSavingUserId] = useState('');
  const [isSavingProductId, setIsSavingProductId] = useState('');
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

      const [overviewData, usersData, productsData, transactionsData] = await Promise.all([
        getAdminOverview(),
        getAdminUsers({ limit: 80, search: userSearch }),
        getAdminProducts({
          limit: 80,
          search: productSearch,
          status: productStatus === 'all' ? '' : productStatus,
        }),
        getAdminTransactions({
          limit: 80,
          status: transactionStatus === 'all' ? '' : transactionStatus,
        }),
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
  }, [productSearch, productStatus, transactionStatus, userSearch]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const overviewStats = useMemo(() => {
    const productStatuses = overview?.products?.byStatus || {};
    const transactionStatuses = overview?.transactions?.byStatus || {};

    return [
      {
        label: 'Tổng users',
        value: overview?.users?.total || 0,
        detail: `${overview?.users?.emailConfirmed || 0} email đã xác nhận`,
        icon: Users,
        tone: 'teal',
      },
      {
        label: 'Sản phẩm đang bán',
        value: getCount(productStatuses, 'active'),
        detail: `${overview?.products?.total || 0} sản phẩm tổng cộng`,
        icon: Store,
        tone: 'violet',
      },
      {
        label: 'Đơn hàng hoàn tất',
        value: getCount(transactionStatuses, 'completed'),
        detail: `${overview?.transactions?.total || 0} giao dịch tổng cộng`,
        icon: ClipboardList,
        tone: 'amber',
      },
      {
        label: 'Doanh thu',
        value: formatCurrency(overview?.transactions?.totalRevenue),
        detail: 'Từ đơn hàng đã hoàn thành',
        icon: BarChart3,
        tone: 'teal',
      },
    ];
  }, [overview]);

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
      setError('');
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
      setError('');
      await updateAdminUserStatus(userId, nextStatus);
      await loadAdminData();
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setIsSavingUserId('');
    }
  };

  const handleUpdateProductStatus = async (productId, nextStatus) => {
    try {
      setIsSavingProductId(productId);
      setError('');
      await updateAdminProductStatus(productId, nextStatus);
      await loadAdminData();
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setIsSavingProductId('');
    }
  };

  return (
    <main className="min-h-screen bg-transparent text-slate-200">
      <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-6 sm:px-6">
        <header className="mb-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link to="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-teal-200">
                <ArrowLeft size={17} />
                Quay lại
              </Link>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/10 text-teal-200">
                  <Shield size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white">Admin Dashboard</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Quản lý users, sản phẩm, đơn hàng, thông báo hệ thống, danh mục, reviews và báo cáo.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-slate-100 transition hover:border-teal-300/40 hover:bg-white/[0.08]"
              onClick={loadAdminData}
            >
              <RefreshCcw size={17} />
              Tải lại dữ liệu
            </button>
          </div>
        </header>

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black transition ${
                  isActive
                    ? 'border-teal-300 bg-teal-300 text-slate-950 shadow-lg shadow-teal-950/25'
                    : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-teal-300/35 hover:text-teal-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {error && (
          <div className="mb-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-100">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-white/10 bg-slate-950/70 text-slate-400">
            <Loader2 className="mr-2 animate-spin" size={20} />
            Đang tải dữ liệu admin...
          </div>
        ) : (
          <div className="space-y-5">
            {activeTab === 'overview' && (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {overviewStats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                      <article key={stat.label} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/25">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-400">{stat.label}</p>
                            <strong className="mt-2 block text-2xl font-black text-white">{stat.value}</strong>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{stat.detail}</p>
                          </div>
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/10 text-teal-200">
                            <Icon size={21} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>

                <SectionShell
                  title="Thống kê & báo cáo"
                  description="Tổng hợp nhanh theo trạng thái sản phẩm và đơn hàng."
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <h3 className="font-black text-white">Sản phẩm theo trạng thái</h3>
                      <div className="mt-4 space-y-3">
                        {PRODUCT_STATUS_OPTIONS.map((status) => {
                          const count = getCount(overview?.products?.byStatus, status);
                          const total = Math.max(1, Number(overview?.products?.total || 0));

                          return (
                            <div key={status}>
                              <div className="mb-1 flex justify-between text-xs font-bold text-slate-400">
                                <span>{PRODUCT_STATUS_LABELS[status]}</span>
                                <span>{count}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-teal-300" style={{ width: `${Math.min(100, (count / total) * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <h3 className="font-black text-white">Đơn hàng theo trạng thái</h3>
                      <div className="mt-4 space-y-3">
                        {TRANSACTION_STATUS_OPTIONS.filter((status) => status !== 'all').map((status) => {
                          const count = getCount(overview?.transactions?.byStatus, status);
                          const total = Math.max(1, Number(overview?.transactions?.total || 0));

                          return (
                            <div key={status}>
                              <div className="mb-1 flex justify-between text-xs font-bold text-slate-400">
                                <span>{TRANSACTION_STATUS_LABELS[status]}</span>
                                <span>{count}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-violet-300" style={{ width: `${Math.min(100, (count / total) * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </SectionShell>
              </>
            )}

            {activeTab === 'users' && (
              <SectionShell
                title="Quản lý users"
                description="Tạo tài khoản, đổi role và khóa/mở trạng thái người dùng."
                action={<SearchInput value={userSearch} onChange={setUserSearch} placeholder="Tìm email hoặc họ tên..." />}
              >
                <form className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-5" onSubmit={handleCreateUser}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={formValues.email}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-teal-300/60"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Họ tên"
                    value={formValues.full_name}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, full_name: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-teal-300/60"
                  />
                  <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={formValues.password}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, password: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-teal-300/60"
                    required
                  />
                  <select
                    value={formValues.role}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, role: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-teal-300/60"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-teal-200 disabled:opacity-60"
                    disabled={isCreating}
                  >
                    {isCreating ? <Loader2 size={17} className="animate-spin" /> : <UserPlus size={17} />}
                    {isCreating ? 'Đang tạo...' : 'Tạo user'}
                  </button>
                </form>

                {users.length === 0 ? (
                  <EmptyPanel icon={Users} title="Không có user nào" description="Dữ liệu user sẽ hiển thị tại đây." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs uppercase text-slate-500">
                          <th className="py-3 pr-4">Email</th>
                          <th className="py-3 pr-4">Họ tên</th>
                          <th className="py-3 pr-4">Vai trò</th>
                          <th className="py-3 pr-4">Trạng thái</th>
                          <th className="py-3 pr-4">Rating</th>
                          <th className="py-3 pr-4">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((entry) => (
                          <tr key={entry.id} className="border-b border-white/10 text-sm text-slate-300">
                            <td className="py-3 pr-4 font-bold text-white">{entry.email}</td>
                            <td className="py-3 pr-4">{entry.full_name || '-'}</td>
                            <td className="py-3 pr-4">
                              <select
                                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none"
                                value={entry.role || 'customer'}
                                onChange={(event) => handleUpdateRole(entry.id, event.target.value)}
                                disabled={isSavingUserId === entry.id}
                              >
                                {ROLE_OPTIONS.map((role) => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 pr-4">
                              <select
                                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none"
                                value={entry.status || 'active'}
                                onChange={(event) => handleUpdateStatus(entry.id, event.target.value)}
                                disabled={isSavingUserId === entry.id}
                              >
                                {USER_STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 pr-4">{Number(entry.rating_avg || 0).toFixed(1)} ({entry.rating_count || 0})</td>
                            <td className="py-3 pr-4">{formatDate(entry.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionShell>
            )}

            {activeTab === 'products' && (
              <SectionShell
                title="Quản lý sản phẩm"
                description="Duyệt, ẩn, đánh dấu đã bán hoặc ban sản phẩm vi phạm."
                action={(
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <SearchInput value={productSearch} onChange={setProductSearch} placeholder="Tìm sản phẩm..." />
                    <select
                      value={productStatus}
                      onChange={(event) => setProductStatus(event.target.value)}
                      className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white outline-none"
                    >
                      <option value="all">Tất cả</option>
                      {PRODUCT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{PRODUCT_STATUS_LABELS[status]}</option>
                      ))}
                    </select>
                  </div>
                )}
              >
                {products.length === 0 ? (
                  <EmptyPanel icon={PackageSearch} title="Không có sản phẩm" description="Thử đổi bộ lọc hoặc tải lại dữ liệu." />
                ) : (
                  <div className="grid gap-3">
                    {products.map((product) => (
                      <article key={product.id} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-white">{product.title}</h3>
                            <StatusPill tone={product.status === 'active' ? 'teal' : product.status === 'banned' ? 'rose' : product.status === 'hidden' ? 'amber' : 'slate'}>
                              {PRODUCT_STATUS_LABELS[product.status] || product.status}
                            </StatusPill>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">
                            {formatCurrency(product.price)} · {product.category || 'Chưa phân loại'} · Người bán: {product.profile?.full_name || product.profile?.email || 'Không rõ'}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{product.description || 'Không có mô tả'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Link
                            to={`/products/${product.id}`}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-100 transition hover:border-teal-300/35"
                          >
                            Xem
                          </Link>
                          <select
                            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none"
                            value={product.status || 'active'}
                            onChange={(event) => handleUpdateProductStatus(product.id, event.target.value)}
                            disabled={isSavingProductId === product.id}
                          >
                            {PRODUCT_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>{PRODUCT_STATUS_LABELS[status]}</option>
                            ))}
                          </select>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </SectionShell>
            )}

            {activeTab === 'transactions' && (
              <SectionShell
                title="Đơn hàng / Transactions"
                description="Theo dõi luồng giao dịch, doanh thu và trạng thái xử lý."
                action={(
                  <select
                    value={transactionStatus}
                    onChange={(event) => setTransactionStatus(event.target.value)}
                    className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white outline-none"
                  >
                    {TRANSACTION_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status === 'all' ? 'Tất cả' : TRANSACTION_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                )}
              >
                {transactions.length === 0 ? (
                  <EmptyPanel icon={ClipboardList} title="Không có giao dịch" description="Dữ liệu đơn hàng sẽ hiển thị tại đây." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs uppercase text-slate-500">
                          <th className="py-3 pr-4">Sản phẩm</th>
                          <th className="py-3 pr-4">Người mua</th>
                          <th className="py-3 pr-4">Người bán</th>
                          <th className="py-3 pr-4">Giá trị</th>
                          <th className="py-3 pr-4">Trạng thái</th>
                          <th className="py-3 pr-4">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b border-white/10 text-sm text-slate-300">
                            <td className="py-3 pr-4 font-bold text-white">{transaction.product_name || transaction.product_id || '-'}</td>
                            <td className="py-3 pr-4">{transaction.buyer?.full_name || transaction.buyer?.email || '-'}</td>
                            <td className="py-3 pr-4">{transaction.seller?.full_name || transaction.seller?.email || '-'}</td>
                            <td className="py-3 pr-4 font-black text-teal-200">{formatCurrency(transaction.amount)}</td>
                            <td className="py-3 pr-4">
                              <StatusPill tone={transaction.status === 'completed' ? 'teal' : transaction.status === 'cancelled' ? 'rose' : 'amber'}>
                                {TRANSACTION_STATUS_LABELS[transaction.status] || transaction.status}
                              </StatusPill>
                            </td>
                            <td className="py-3 pr-4">{formatDate(transaction.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionShell>
            )}

            {activeTab === 'broadcast' && (
              <ComingSoonPanel
                icon={BellRing}
                title="Thông báo hệ thống / Broadcast"
                description="Gửi thông báo đến toàn bộ users hoặc nhóm theo role/trạng thái."
                items={[
                  'Form tạo broadcast: tiêu đề, nội dung, target segment',
                  'Preview trước khi gửi để tránh spam nhầm',
                  'API cần thêm: POST /api/admin/notifications/broadcast',
                  'Log lịch sử gửi và số người nhận',
                ]}
              />
            )}

            {activeTab === 'categories' && (
              <ComingSoonPanel
                icon={FolderTree}
                title="Danh mục"
                description="Thêm, sửa, xóa và sắp xếp danh mục hiển thị trên marketplace."
                items={[
                  'CRUD category name, slug, icon, trạng thái hiển thị',
                  'Chặn xóa danh mục đang có sản phẩm',
                  'API cần thêm: admin category create/update/delete',
                  'Tự đồng bộ lại sidebar/category filter phía client',
                ]}
              />
            )}

            {activeTab === 'reviews' && (
              <ComingSoonPanel
                icon={Star}
                title="Đánh giá / Reviews"
                description="Kiểm duyệt review, ẩn review vi phạm và xem rating theo người bán."
                items={[
                  'Danh sách reviews có filter rating và keyword',
                  'Ẩn/khôi phục review vi phạm',
                  'API cần thêm: GET/PATCH /api/admin/reviews',
                  'Báo cáo người bán có tỷ lệ review thấp',
                ]}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminDashboardPage;
