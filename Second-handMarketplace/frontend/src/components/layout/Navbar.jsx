import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Bell, User, LogOut, Settings, ChevronDown, ShoppingBag, ClipboardList, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRealtimeBadges } from '@/hooks/useRealtimeBadges';
import { cn } from '@/lib/utils';
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
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng';
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="w-full flex justify-center p-4">
      <nav className="w-full max-w-6xl bg-white rounded-[12px] border border-gray-100 shadow-sm px-6 py-3 flex items-center justify-between">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-8">
          <Link to="/app" className="flex items-center gap-2 group">
            <span className="text-2xl">🏪</span>
            <span className="font-bold text-xl tracking-tight text-[#0D9488]">ReMarket</span>
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
                      ? "bg-[#0D9488]/10 text-[#0D9488]" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                      ? 'bg-[#0D9488]/10 text-[#0D9488]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">
          {/* Chat Icon */}
          <Link to="/chat" className="relative p-2 text-gray-500 hover:text-[#0D9488] transition-colors">
            <MessageSquare size={24} />
            {chatUnread > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {chatUnread > 99 ? '99+' : chatUnread}
              </span>
            )}
          </Link>

          {/* Bell Icon */}
          <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-[#0D9488] transition-colors">
            <Bell size={24} />
            {notificationUnread > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {notificationUnread > 99 ? '99+' : notificationUnread}
              </span>
            )}
          </Link>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 p-1 rounded-full hover:bg-gray-50 transition-all focus:outline-none group">
              <div className="h-8 w-8 rounded-full bg-[#0D9488]/10 flex items-center justify-center text-[#0D9488] font-bold text-sm border border-[#0D9488]/20">
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-semibold text-gray-700">{displayName}</span>
              <ChevronDown size={16} className="text-gray-400 group-data-[state=open]:rotate-180 transition-transform" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-[12px] shadow-xl border-gray-100 mt-2">
              <DropdownMenuItem 
                className="flex items-center gap-2 p-3 rounded-[8px] cursor-pointer"
                onClick={() => navigate('/profile')}
              >
                <User size={18} className="text-gray-500" />
                <span>Thông tin cá nhân</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-2 p-3 rounded-[8px] cursor-pointer"
                onClick={() => navigate('/profile?edit=true')}
              >
                <Settings size={18} className="text-gray-500" />
                <span>Chỉnh sửa hồ sơ</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-gray-100" />
              <DropdownMenuItem 
                className="flex items-center gap-2 p-3 rounded-[8px] cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span className="font-medium">Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
