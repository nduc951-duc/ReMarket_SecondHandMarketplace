import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Bell, User, LogOut, Settings, ChevronDown, ShoppingBag, ClipboardList, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRealtimeBadges } from '@/hooks/useRealtimeBadges';
import { cn } from '@/lib/utils';
import { isAdminUser } from '@/utils/adminAccess';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const { chatUnread, notificationUnread } = useRealtimeBadges();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Danh sách sản phẩm', path: '/app', icon: ShoppingBag },
    { name: 'Đơn hàng', path: '/transactions', icon: ClipboardList },
    { name: 'Yêu thích', path: '/wishlist', icon: Heart },
    { name: 'Sản phẩm của tôi', path: '/my-products', icon: Heart },  
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng';
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const isAdmin = isAdminUser(user);

  return (
    <div className="w-full flex justify-center px-4 pt-4">
      <nav className="w-full max-w-6xl rounded-2xl border border-slate-200/70 bg-slate-50/80 px-5 py-3.5 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-4">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-6">
          <Link to="/app" className="flex items-center gap-2 group">
            <span className="text-2xl">🏪</span>
            <span className="font-semibold text-lg tracking-tight text-slate-900">ReMarket</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200',
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          {/* Chat Icon */}
          <Link to="/chat" className="relative rounded-full p-2 text-slate-500 transition-all duration-200 hover:bg-white/80 hover:text-slate-900">
            <MessageSquare size={22} />
            {chatUnread > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-50">
                {chatUnread > 99 ? '99+' : chatUnread}
              </span>
            )}
          </Link>

          {/* Bell Icon */}
          <Link to="/notifications" className="relative rounded-full p-2 text-slate-500 transition-all duration-200 hover:bg-white/80 hover:text-slate-900">
            <Bell size={22} />
            {notificationUnread > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-50">
                {notificationUnread > 99 ? '99+' : notificationUnread}
              </span>
            )}
          </Link>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/70 p-1.5 pr-3 transition-all duration-200 focus:outline-none hover:shadow-sm">
              <div className="h-8 w-8 rounded-full bg-slate-900/5 flex items-center justify-center text-slate-900 font-semibold text-sm">
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-semibold text-slate-700">{displayName}</span>
              <ChevronDown size={16} className="text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border border-slate-200/70 bg-white/95 p-2 shadow-lg">
              <DropdownMenuItem 
                className="flex items-center gap-2 rounded-lg p-3 text-sm cursor-pointer"
                onClick={() => navigate('/profile')}
              >
                <User size={18} className="text-slate-500" />
                <span>Thông tin cá nhân</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-2 rounded-lg p-3 text-sm cursor-pointer"
                onClick={() => navigate('/change-password')}
              >
                <Settings size={18} className="text-slate-500" />
                <span>Đổi mật khẩu</span>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  className="flex items-center gap-2 rounded-lg p-3 text-sm cursor-pointer"
                  onClick={() => navigate('/admin/dashboard')}
                >
                  <ClipboardList size={18} className="text-slate-500" />
                  <span>Vào trang admin</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-2 bg-slate-100" />
              <DropdownMenuItem 
                className="flex items-center gap-2 rounded-lg p-3 text-sm cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span className="font-medium">Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
