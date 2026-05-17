import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Bell, User, LogOut, Settings, ChevronDown, ShoppingBag, ClipboardList, Heart, Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRealtimeBadges } from '@/hooks/useRealtimeBadges';
import { cn } from '@/lib/utils';
import { isAdminUser } from '@/utils/adminAccess';
import remarketLogo from '@/assets/remarket-logo.svg';
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
  const [searchValue, setSearchValue] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavbarSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set('q', searchValue.trim());
    navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`);
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
    <div className="w-full bg-[#0a0f1e]/95 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
      {/* ROW 1 - Top Navbar */}
      <div className="w-full bg-[#0d1117] border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/app" className="flex items-center gap-2 group flex-shrink-0">
            <img
              src={remarketLogo}
              alt="ReMarket"
              className="h-9 w-9 rounded-xl shadow-[0_0_18px_rgba(45,212,191,0.16)] transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">ReMarket</span>
          </Link>

          {/* Centered Search Bar */}
          <form onSubmit={handleNavbarSearch} className="hidden md:flex flex-1 max-w-xl mx-4 relative group">
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm..." 
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="w-full bg-[#111827] border border-teal-500/20 rounded-full py-2 px-4 pl-10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-400/10 transition-all shadow-sm"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-400 transition-colors">
              <Search size={18} />
            </span>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link to="/chat" className="relative rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white">
              <MessageSquare size={20} />
              {chatUnread > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-[#0d1117]">
                  {chatUnread > 99 ? '99+' : chatUnread}
                </span>
              )}
            </Link>

            <Link to="/notifications" className="relative rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white">
              <Bell size={20} />
              {notificationUnread > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-[#0d1117]">
                  {notificationUnread > 99 ? '99+' : notificationUnread}
                </span>
              )}
            </Link>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-white/10 bg-[#111827] p-1.5 pr-3 transition-all duration-200 hover:border-teal-500/40 focus:outline-none">
                <div className="h-7 w-7 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xs">
                  {initials}
                </div>
                <span className="hidden sm:block text-sm font-medium text-slate-200">{displayName}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border border-white/10 bg-[#111827] p-2 shadow-xl text-slate-200">
                <DropdownMenuItem className="flex items-center gap-2 rounded-lg p-2.5 text-sm cursor-pointer hover:bg-white/5 focus:bg-white/5" onClick={() => navigate('/profile')}>
                  <User size={16} className="text-slate-400" />
                  <span>Thông tin cá nhân</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 rounded-lg p-2.5 text-sm cursor-pointer hover:bg-white/5 focus:bg-white/5" onClick={() => navigate('/change-password')}>
                  <Settings size={16} className="text-slate-400" />
                  <span>Đổi mật khẩu</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem className="flex items-center gap-2 rounded-lg p-2.5 text-sm cursor-pointer hover:bg-white/5 focus:bg-white/5" onClick={() => navigate('/admin/dashboard')}>
                    <ClipboardList size={16} className="text-slate-400" />
                    <span>Vào trang admin</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1.5 bg-white/10" />
                <DropdownMenuItem className="flex items-center gap-2 rounded-lg p-2.5 text-sm cursor-pointer text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-rose-400" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span className="font-medium">Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ROW 2 - Navigation Links */}
      <div className="mx-auto max-w-6xl px-4 h-12 flex items-center gap-6 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
        <div className="flex items-center gap-5">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  isActive 
                    ? "text-teal-400" 
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
