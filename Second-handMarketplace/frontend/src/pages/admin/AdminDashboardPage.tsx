import {
  BarChart3,
  ClipboardList,
  Loader2,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Store,
  UserRound,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Select,
  Skeleton,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  buttonVariants,
} from '@/components/ui';
import {
  createAdminUser,
  getAdminOverview,
  getAdminProducts,
  getAdminTransactions,
  getAdminUsers,
  updateAdminProductStatus,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '@/services/adminService';
import type { AdminOverview, AdminUser, Product, Transaction, UserRole } from '@/types/domain';

type AdminTab = 'overview' | 'users' | 'products' | 'transactions';

const productLabels: Record<string, string> = {
  active: 'Đang bán',
  sold: 'Đã bán',
  hidden: 'Đã ẩn',
  banned: 'Đã chặn',
};

const transactionStatuses = [
  'all',
  'awaiting_payment',
  'pending',
  'confirmed',
  'shipped',
  'completed',
  'cancelled',
];

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
    : '—';
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block min-w-56">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </label>
  );
}

function AdminDashboardPage() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productStatus, setProductStatus] = useState('all');
  const [transactionStatus, setTransactionStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'customer' as UserRole,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [overviewResult, userResult, productResult, transactionResult] = await Promise.all([
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
      setOverview(overviewResult);
      setUsers(userResult.items || []);
      setProducts(productResult.products || []);
      setTransactions(transactionResult.transactions || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  }, [productSearch, productStatus, transactionStatus, userSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => [
      {
        label: 'Người dùng',
        value: overview?.users?.total || 0,
        detail: `${overview?.users?.emailConfirmed || 0} email đã xác nhận`,
        icon: Users,
      },
      {
        label: 'Sản phẩm đang bán',
        value: overview?.products?.byStatus?.active || 0,
        detail: `${overview?.products?.total || 0} sản phẩm`,
        icon: Store,
      },
      {
        label: 'Đơn hoàn tất',
        value: overview?.transactions?.byStatus?.completed || 0,
        detail: `${overview?.transactions?.total || 0} giao dịch`,
        icon: ClipboardList,
      },
      {
        label: 'Doanh thu hoàn tất',
        value: formatCurrency(overview?.transactions?.totalRevenue),
        detail: 'Tổng giá trị giao dịch',
        icon: BarChart3,
      },
    ],
    [overview],
  );

  const perform = async (id: string, operation: () => Promise<unknown>) => {
    try {
      setBusyId(id);
      setError('');
      await operation();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật dữ liệu.');
      throw caught;
    } finally {
      setBusyId('');
    }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setCreating(true);
      setError('');
      await createAdminUser(newUser);
      setNewUser({ email: '', password: '', full_name: '', role: 'customer' });
      setCreateOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tạo tài khoản.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MarketplaceLayout className="space-y-6">
      <header className="border-b border-border pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Shield className="size-4" />
              Trung tâm quản trị
            </p>
            <h1 className="mt-2 text-3xl font-bold">Vận hành ReMarket</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Theo dõi sức khỏe marketplace, quản lý người dùng, sản phẩm và giao dịch.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/moderation" className={buttonVariants({ variant: 'outline' })}>
              Hàng chờ kiểm duyệt
            </Link>
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>
      </header>

      {error && <ErrorState title="Có lỗi khi tải dữ liệu" description={error} onRetry={load} />}

      <Tabs value={tab} onValueChange={(value) => setTab(value as AdminTab)}>
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto sm:grid-cols-none">
          {[
            ['overview', 'Tổng quan'],
            ['users', 'Người dùng'],
            ['products', 'Sản phẩm'],
            ['transactions', 'Giao dịch'],
          ].map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map(({ label, value, detail, icon: Icon }) => (
                  <Card key={label}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{label}</p>
                          <strong className="mt-2 block text-2xl">{value}</strong>
                          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                        </div>
                        <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </section>
              <section className="grid gap-4 lg:grid-cols-2">
                <StatusOverview
                  title="Sản phẩm theo trạng thái"
                  total={overview?.products?.total || 0}
                  data={overview?.products?.byStatus || {}}
                  labels={productLabels}
                />
                <StatusOverview
                  title="Giao dịch theo trạng thái"
                  total={overview?.transactions?.total || 0}
                  data={overview?.transactions?.byStatus || {}}
                />
              </section>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardContent className="pt-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Người dùng</h2>
                  <p className="text-sm text-muted-foreground">
                    Quản lý role và trạng thái tài khoản.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <SearchField
                    value={userSearch}
                    onChange={setUserSearch}
                    placeholder="Tìm người dùng…"
                  />
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    Tạo tài khoản
                  </Button>
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-72 rounded-2xl" />
              ) : users.length === 0 ? (
                <EmptyState
                  icon={UserRound}
                  title="Không có người dùng"
                  description="Thử thay đổi từ khóa tìm kiếm."
                />
              ) : (
                <>
                  <div className="grid gap-3 md:hidden">
                    {users.map((entry) => (
                      <UserCard
                        key={entry.id}
                        entry={entry}
                        busy={busyId === entry.id}
                        onRole={(role) =>
                          perform(entry.id, () => updateAdminUserRole(entry.id, role))
                        }
                        onStatus={(status) =>
                          perform(entry.id, () => updateAdminUserStatus(entry.id, status))
                        }
                      />
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[820px] text-left text-sm">
                      <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-3">Tài khoản</th>
                          <th className="px-3 py-3">Role</th>
                          <th className="px-3 py-3">Trạng thái</th>
                          <th className="px-3 py-3">Uy tín</th>
                          <th className="px-3 py-3">Ngày tạo</th>
                          <th className="px-3 py-3 text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((entry) => (
                          <UserRow
                            key={entry.id}
                            entry={entry}
                            busy={busyId === entry.id}
                            onRole={(role) =>
                              perform(entry.id, () => updateAdminUserRole(entry.id, role))
                            }
                            onStatus={(status) =>
                              perform(entry.id, () => updateAdminUserStatus(entry.id, status))
                            }
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardContent className="pt-5">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Sản phẩm</h2>
                  <p className="text-sm text-muted-foreground">Ẩn hoặc chặn listing vi phạm.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <SearchField
                    value={productSearch}
                    onChange={setProductSearch}
                    placeholder="Tìm sản phẩm…"
                  />
                  <Select
                    value={productStatus}
                    onChange={(event) => setProductStatus(event.target.value)}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    {Object.entries(productLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-72 rounded-2xl" />
              ) : products.length === 0 ? (
                <EmptyState
                  icon={PackageSearch}
                  title="Không có sản phẩm"
                  description="Thử thay đổi bộ lọc hoặc từ khóa."
                />
              ) : (
                <div className="grid gap-3">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className="grid gap-4 rounded-2xl border border-border p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold">{product.title}</h3>
                          <StatusBadge status={product.status} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatCurrency(product.price)} ·{' '}
                          {typeof product.category === 'string'
                            ? product.category
                            : product.category?.name || 'Chưa phân loại'}{' '}
                          · {product.profiles?.full_name || product.profiles?.email || 'Người bán'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/products/${product.id}`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Xem
                        </Link>
                        {['hidden', 'banned'].includes(product.status) ? (
                          <ConfirmDialog
                            trigger={
                              <Button size="sm" disabled={busyId === product.id}>
                                Khôi phục
                              </Button>
                            }
                            title="Khôi phục sản phẩm?"
                            description="Listing sẽ xuất hiện trở lại trên marketplace."
                            onConfirm={() =>
                              perform(product.id, () =>
                                updateAdminProductStatus(product.id, 'active'),
                              )
                            }
                          />
                        ) : (
                          <>
                            <ConfirmDialog
                              trigger={
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busyId === product.id}
                                >
                                  Ẩn listing
                                </Button>
                              }
                              title="Ẩn sản phẩm?"
                              description="Người dùng sẽ không còn thấy listing này cho đến khi được khôi phục."
                              confirmLabel="Ẩn sản phẩm"
                              destructive
                              onConfirm={() =>
                                perform(product.id, () =>
                                  updateAdminProductStatus(product.id, 'hidden'),
                                )
                              }
                            />
                            <ConfirmDialog
                              trigger={
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={busyId === product.id}
                                >
                                  Chặn
                                </Button>
                              }
                              title="Chặn sản phẩm?"
                              description="Chỉ dùng khi listing vi phạm chính sách marketplace."
                              confirmLabel="Chặn sản phẩm"
                              destructive
                              onConfirm={() =>
                                perform(product.id, () =>
                                  updateAdminProductStatus(product.id, 'banned'),
                                )
                              }
                            />
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="pt-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Giao dịch</h2>
                  <p className="text-sm text-muted-foreground">
                    Theo dõi trạng thái và giá trị đơn hàng.
                  </p>
                </div>
                <Select
                  value={transactionStatus}
                  onChange={(event) => setTransactionStatus(event.target.value)}
                  className="sm:w-52"
                >
                  {transactionStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status === 'all' ? 'Tất cả trạng thái' : status}
                    </option>
                  ))}
                </Select>
              </div>
              {loading ? (
                <Skeleton className="h-72 rounded-2xl" />
              ) : transactions.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Không có giao dịch"
                  description="Các đơn hàng phù hợp bộ lọc sẽ xuất hiện tại đây."
                />
              ) : (
                <>
                  <div className="grid gap-3 md:hidden">
                    {transactions.map((transaction) => (
                      <Card key={transaction.id}>
                        <CardContent className="space-y-3 pt-5">
                          <div className="flex items-start justify-between gap-3">
                            <strong>{transaction.product_name || 'Sản phẩm'}</strong>
                            <StatusBadge status={transaction.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.buyer?.full_name ||
                              transaction.buyer?.email ||
                              'Người mua'}{' '}
                            →{' '}
                            {transaction.seller?.full_name ||
                              transaction.seller?.email ||
                              'Người bán'}
                          </p>
                          <div className="flex justify-between text-sm">
                            <strong className="text-primary">
                              {formatCurrency(transaction.amount)}
                            </strong>
                            <span className="text-muted-foreground">
                              {formatDate(transaction.created_at)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-3">Sản phẩm</th>
                          <th className="px-3 py-3">Người mua</th>
                          <th className="px-3 py-3">Người bán</th>
                          <th className="px-3 py-3">Giá trị</th>
                          <th className="px-3 py-3">Trạng thái</th>
                          <th className="px-3 py-3">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b border-border">
                            <td className="px-3 py-4 font-semibold">
                              {transaction.product_name || '—'}
                            </td>
                            <td className="px-3 py-4">
                              {transaction.buyer?.full_name || transaction.buyer?.email || '—'}
                            </td>
                            <td className="px-3 py-4">
                              {transaction.seller?.full_name || transaction.seller?.email || '—'}
                            </td>
                            <td className="px-3 py-4 font-semibold text-primary">
                              {formatCurrency(transaction.amount)}
                            </td>
                            <td className="px-3 py-4">
                              <StatusBadge status={transaction.status} />
                            </td>
                            <td className="px-3 py-4 text-muted-foreground">
                              {formatDate(transaction.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo tài khoản nội bộ</DialogTitle>
            <DialogDescription>
              Chỉ tạo tài khoản khi đã xác minh người nhận và role cần cấp.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createUser}>
            <FormField label="Email" htmlFor="admin-email" required>
              <Input
                type="email"
                value={newUser.email}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </FormField>
            <FormField label="Họ tên" htmlFor="admin-name">
              <Input
                value={newUser.full_name}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, full_name: event.target.value }))
                }
              />
            </FormField>
            <FormField label="Mật khẩu ban đầu" htmlFor="admin-password" required>
              <Input
                type="password"
                minLength={8}
                value={newUser.password}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, password: event.target.value }))
                }
                required
              />
            </FormField>
            <FormField label="Role" htmlFor="admin-role" required>
              <Select
                value={newUser.role}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, role: event.target.value as UserRole }))
                }
              >
                <option value="customer">Khách hàng</option>
                <option value="agent">Nhân viên</option>
                <option value="admin">Quản trị viên</option>
              </Select>
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="size-4 animate-spin" />}
                Tạo tài khoản
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MarketplaceLayout>
  );
}

function StatusOverview({
  title,
  total,
  data,
  labels = {},
}: {
  title: string;
  total: number;
  data: Record<string, number>;
  labels?: Record<string, string>;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="font-bold">{title}</h2>
        <div className="mt-5 space-y-4">
          {Object.entries(data).map(([status, count]) => (
            <div key={status}>
              <div className="mb-1.5 flex justify-between text-xs">
                <StatusBadge status={status} label={labels[status]} />
                <span className="font-semibold">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (count / Math.max(1, total)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface UserItemProps {
  entry: AdminUser;
  busy: boolean;
  onRole: (role: UserRole) => Promise<void>;
  onStatus: (status: string) => Promise<void>;
}

function UserRoleSelect({ entry, busy, onRole }: Pick<UserItemProps, 'entry' | 'busy' | 'onRole'>) {
  return (
    <Select
      value={entry.role}
      disabled={busy}
      onChange={(event) => void onRole(event.target.value as UserRole)}
      className="min-w-32"
      aria-label={`Role của ${entry.email}`}
    >
      <option value="customer">Khách hàng</option>
      <option value="seller">Người bán</option>
      <option value="agent">Nhân viên</option>
      <option value="admin">Quản trị viên</option>
    </Select>
  );
}

function UserStatusAction({
  entry,
  busy,
  onStatus,
}: Pick<UserItemProps, 'entry' | 'busy' | 'onStatus'>) {
  const blocked = entry.status === 'blocked';
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant={blocked ? 'outline' : 'destructive'} disabled={busy}>
          {blocked ? 'Mở khóa' : 'Khóa'}
        </Button>
      }
      title={blocked ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}
      description={
        blocked
          ? 'Người dùng sẽ có thể truy cập lại các chức năng theo role.'
          : 'Người dùng sẽ mất quyền truy cập cho đến khi quản trị viên mở khóa.'
      }
      confirmLabel={blocked ? 'Mở khóa' : 'Khóa tài khoản'}
      destructive={!blocked}
      onConfirm={() => onStatus(blocked ? 'active' : 'blocked')}
    />
  );
}

function UserCard(props: UserItemProps) {
  const { entry } = props;
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <strong className="block truncate">{entry.full_name || 'Chưa cập nhật tên'}</strong>
            <p className="truncate text-sm text-muted-foreground">{entry.email}</p>
          </div>
          <StatusBadge status={entry.status} />
        </div>
        <UserRoleSelect {...props} />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
          <UserStatusAction {...props} />
        </div>
      </CardContent>
    </Card>
  );
}

function UserRow(props: UserItemProps) {
  const { entry } = props;
  return (
    <tr className="border-b border-border">
      <td className="px-3 py-4">
        <strong className="block">{entry.full_name || 'Chưa cập nhật'}</strong>
        <span className="text-xs text-muted-foreground">{entry.email}</span>
      </td>
      <td className="px-3 py-4">
        <UserRoleSelect {...props} />
      </td>
      <td className="px-3 py-4">
        <StatusBadge status={entry.status} />
      </td>
      <td className="px-3 py-4">
        {Number(entry.rating_avg || 0).toFixed(1)} ({entry.rating_count || 0})
      </td>
      <td className="px-3 py-4 text-muted-foreground">{formatDate(entry.created_at)}</td>
      <td className="px-3 py-4 text-right">
        <UserStatusAction {...props} />
      </td>
    </tr>
  );
}

export default AdminDashboardPage;
