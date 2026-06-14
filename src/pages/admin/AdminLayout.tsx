/**
 * 管理端布局 - 左侧菜单 + 顶部栏 + 内容区
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Users, LifeBuoy,
  Droplets, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

interface MenuItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const MENUS: MenuItem[] = [
  { to: '/admin', label: '预警发布', icon: <AlertTriangle size={20} />, end: true },
  { to: '/admin/dashboard', label: '指挥调度大屏', icon: <LayoutDashboard size={20} /> },
  { to: '/admin/personnel', label: '人员台账', icon: <Users size={20} /> },
  { to: '/admin/rescue', label: '救援调度', icon: <LifeBuoy size={20} /> },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="h-screen w-full flex bg-bg overflow-hidden">
      {/* 左侧菜单 */}
      <aside className="w-[240px] shrink-0 bg-primary text-white flex flex-col">
        <div className="h-16 flex items-center gap-2 px-4 border-b border-white/10">
          <Droplets size={24} className="shrink-0" />
          <span className="font-bold text-base truncate">洪水安防系统</span>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {MENUS.map(m => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-light text-white font-medium border-l-[3px] border-white'
                    : 'text-white/80 hover:bg-primary-dark hover:text-white border-l-[3px] border-transparent'
                }`
              }
            >
              <span className="shrink-0">{m.icon}</span>
              <span>{m.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 text-xs text-white/60">
          <div className="truncate">{user?.name || '管理员'}</div>
          <div className="truncate opacity-70">{user?.username}</div>
        </div>
      </aside>

      {/* 右侧主体 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-16 shrink-0 bg-white border-b border-border flex items-center justify-between px-6 shadow-card">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-ink">
              洪水安防地理智能系统
            </h1>
            <span className="tag bg-primary/10 text-primary">指挥调度中心</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-sub">
              {user?.name || '管理员'}
            </span>
            <button
              onClick={handleLogout}
              className="btn-secondary h-9 px-4 flex items-center gap-1.5 text-sm"
            >
              <LogOut size={16} />
              退出
            </button>
          </div>
        </header>

        {/* 内容区 */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
