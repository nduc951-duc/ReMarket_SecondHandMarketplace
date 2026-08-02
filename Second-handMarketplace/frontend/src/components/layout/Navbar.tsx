import {
  Bell,
  ChevronDown,
  ClipboardList,
  Heart,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  User,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import remarketLogo from '@/assets/remarket-logo.svg';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useRealtimeBadges } from '@/hooks/useRealtimeBadges';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { isAdminUser, isAgentUser } from '@/utils/adminAccess';

const primaryLinks = [
  { name: 'Khám phá', path: '/app', icon: Home },
  { name: 'Đơn hàng', path: '/transactions', icon: ClipboardList },
  { name: 'Tin đã lưu', path: '/wishlist', icon: Heart },
  { name: 'Tin của tôi', path: '/my-products', icon: Package },
];

function BadgeCount({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-background">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function Navbar() {
  const { user, logout } = useAuthStore();
  const { chatUnread, notificationUnread } = useRealtimeBadges();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng';
  const initials = String(displayName)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const isAdmin = isAdminUser(user);
  const canModerate = isAdmin || isAgentUser(user);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set('q', searchValue.trim());
    navigate(`/search${params.size ? `?${params.toString()}` : ''}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
          <Drawer>
            <DrawerTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu">
                  <Menu />
                </Button>
              }
            />
            <DrawerContent side="left" className="p-0">
              <div className="border-b border-border p-5">
                <Link to="/app" className="inline-flex items-center gap-2">
                  <img
                    src={remarketLogo}
                    alt=""
                    width="36"
                    height="36"
                    className="size-9 rounded-xl"
                  />
                  <span className="text-xl font-bold tracking-tight">ReMarket</span>
                </Link>
                <p className="mt-3 text-sm text-muted-foreground">
                  Mua bán đồ cũ an tâm, đơn giản và minh bạch.
                </p>
              </div>
              <nav className="space-y-1 p-3" aria-label="Menu di động">
                {primaryLinks.map(({ name, path, icon: Icon }) => (
                  <DrawerClose
                    key={path}
                    render={
                      <Link
                        to={path}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold',
                          location.pathname === path
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon className="size-5" />
                        {name}
                      </Link>
                    }
                  />
                ))}
                <DrawerClose
                  render={
                    <Link
                      to="/support-chat"
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold',
                        location.pathname === '/support-chat'
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <MessageCircle className="size-5" />
                      Trợ lý hỗ trợ
                    </Link>
                  }
                />
              </nav>
            </DrawerContent>
          </Drawer>

          <Link to="/app" className="flex shrink-0 items-center gap-2" aria-label="ReMarket">
            <img src={remarketLogo} alt="" width="36" height="36" className="size-9 rounded-xl" />
            <span className="hidden text-xl font-bold tracking-tight xl:inline">ReMarket</span>
          </Link>

          <form
            onSubmit={handleSearch}
            className="relative mx-auto hidden w-full max-w-xl md:block"
          >
            <Search
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Tìm sản phẩm, danh mục…"
              aria-label="Tìm kiếm toàn trang"
              className="h-10 w-full rounded-full border border-input bg-muted/55 pl-10 pr-4 text-sm outline-none transition focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/20"
            />
          </form>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">
            {primaryLinks.slice(0, 2).map(({ name, path }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  location.pathname === path
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {name}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link
              to="/products/new"
              className="hidden h-9 touch-manipulation items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 xl:inline-flex"
            >
              <Plus className="size-4" />
              Đăng tin
            </Link>
            <ThemeToggle />
            {user ? (
              <>
                <Link
                  to="/chat"
                  aria-label={`Tin nhắn, ${chatUnread} chưa đọc`}
                  className="relative grid size-10 place-items-center rounded-lg text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <MessageCircle />
                  <BadgeCount count={chatUnread} />
                </Link>
                <Link
                  to="/notifications"
                  aria-label={`Thông báo, ${notificationUnread} chưa đọc`}
                  className="relative grid size-10 place-items-center rounded-lg text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <Bell />
                  <BadgeCount count={notificationUnread} />
                </Link>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger className="ml-1 flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-2 outline-none transition hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30">
                    <Avatar
                      src={avatarUrl}
                      alt={displayName}
                      fallback={initials}
                      className="size-8"
                    />
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={6}
                      className="z-50 w-60 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl"
                    >
                      <div className="px-2 py-2">
                        <p className="truncate text-sm font-semibold">{displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-accent"
                        onSelect={() => navigate('/profile')}
                      >
                        <User /> Hồ sơ cá nhân
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-accent"
                        onSelect={() => navigate('/my-products')}
                      >
                        <ShoppingBag /> Tin đăng của tôi
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-accent"
                        onSelect={() => navigate('/change-password')}
                      >
                        <Settings /> Đổi mật khẩu
                      </DropdownMenu.Item>
                      {isAdmin && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-accent"
                          onSelect={() => navigate('/admin/dashboard')}
                        >
                          <ClipboardList /> Trang quản trị
                        </DropdownMenu.Item>
                      )}
                      {canModerate && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-accent"
                          onSelect={() => navigate('/moderation')}
                        >
                          <ClipboardList /> Hàng đợi kiểm duyệt
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive outline-none focus:bg-destructive/10"
                        onSelect={() => void handleLogout()}
                      >
                        <LogOut /> Đăng xuất
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  render={<Link to="/login" />}
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  Đăng nhập
                </Button>
                <Button render={<Link to="/register" />} size="sm">
                  Đăng ký
                </Button>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSearch} className="border-t border-border px-4 py-2 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Tìm sản phẩm…"
              aria-label="Tìm kiếm toàn trang"
              className="h-10 w-full rounded-full border border-input bg-muted/55 pl-9 pr-4 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            />
          </div>
        </form>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl md:hidden"
        aria-label="Điều hướng dưới"
      >
        {[
          primaryLinks[0],
          primaryLinks[1],
          { name: 'Đăng tin', path: '/products/new', icon: Plus },
          { name: 'Đã lưu', path: '/wishlist', icon: Heart },
          { name: 'Của tôi', path: '/my-products', icon: Package },
        ].map(({ name, path, icon: Icon }, index) => (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold',
              index === 2
                ? 'text-primary'
                : location.pathname === path
                  ? 'text-primary'
                  : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                index === 2 &&
                  'grid size-8 place-items-center rounded-full bg-primary text-primary-foreground',
              )}
            >
              <Icon className="size-5" />
            </span>
            {name}
          </Link>
        ))}
      </nav>
    </>
  );
}

export default Navbar;
