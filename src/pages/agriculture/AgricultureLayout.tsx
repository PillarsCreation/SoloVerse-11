/**
 * 农业灾情统计端布局 - PC桌面端
 * 顶部主色栏 + 左侧导航(200px) + 右侧内容区
 */
import type { ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Sprout, FileText, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  match: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/agriculture',
    label: '灾情登记',
    icon: <FileText size={18} />,
    match: (p) => p === '/agriculture',
  },
  {
    to: '/agriculture/ledger',
    label: '灾情台账',
    icon: <BookOpen size={18} />,
    match: (p) => p.startsWith('/agriculture/ledger'),
  },
];

export default function AgricultureLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* 顶部栏 56px 主色 */}
      <header className="h-14 bg-primary text-white flex items-center justify-between px-6 shadow-card sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Sprout size={22} />
          <span className="font-bold text-base">农业灾情统计系统</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="opacity-90">{user?.name || '统计员'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded-btn transition-colors"
          >
            <LogOut size={16} /> 退出
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 左侧导航 200px */}
        <aside className="w-[200px] shrink-0 bg-white border-r border-border flex flex-col">
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = item.match(location.pathname);
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={cn(
                    'w-full h-11 px-3 rounded-btn flex items-center gap-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-ink-sub hover:bg-bg hover:text-ink'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border text-[11px] text-ink-sub">
            洪涝灾害农业损失登记与统计
          </div>
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
