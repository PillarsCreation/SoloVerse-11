/**
 * 村民端 - 移动端整体布局
 * 顶部栏 + 预警横幅 + 内容区 + 底部导航
 */
import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, AlertTriangle, ClipboardList, LifeBuoy, User, LogOut, X, MapPin, Phone } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { warningApi } from '@/lib/api';
import { WARNING_CONFIG } from '@/types';
import type { Warning, WarningLevel } from '@/types';
import { cn } from '@/lib/utils';

const LEVEL_ORDER: Record<WarningLevel, number> = { red: 4, orange: 3, yellow: 2, blue: 1 };

const ROLE_LABELS: Record<string, string> = {
  villager: '村民',
  admin: '管理员',
  rescue: '救援队',
  agriculture: '统计员',
};

export default function VillagerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeWarning, setActiveWarning] = useState<Warning | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const villageId = user?.villageId;
  const villageName = user?.village?.name;

  const fetchWarning = () => {
    if (!villageId) return;
    warningApi
      .list({ villageId, status: 'active' })
      .then((list) => {
        if (!list || list.length === 0) {
          setActiveWarning(null);
          return;
        }
        const sorted = [...list].sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]);
        setActiveWarning(sorted[0]);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchWarning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [villageId]);

  // 每分钟刷新一次预警状态
  useEffect(() => {
    if (!villageId) return;
    const timer = setInterval(fetchWarning, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [villageId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cfg = activeWarning ? WARNING_CONFIG[activeWarning.level] : null;

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="relative w-full max-w-[480px] min-h-screen bg-bg flex flex-col">
        {/* 顶部栏 56px */}
        <header className="sticky top-0 z-30 h-14 bg-primary text-white flex items-center justify-between px-4">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-base truncate">{user?.name || '村民'}</span>
            {villageName && (
              <span className="text-xs text-white/80 truncate">· {villageName}</span>
            )}
          </div>
          <button
            onClick={handleLogout}
            aria-label="退出登录"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/15 active:bg-white/25 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* 预警横幅 48px（仅有活跃预警时显示） */}
        {activeWarning && cfg && (
          <div className={cn('h-12 px-3 flex items-center gap-2 animate-pulse-warn', cfg.bg, cfg.text)}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-xs flex items-center gap-1.5 truncate">
              <span className="font-bold">{cfg.label}</span>
              <span className="opacity-90 truncate">
                {activeWarning.village_name || villageName || ''} · 请立即避险撤离
              </span>
            </div>
          </div>
        )}

        {/* 内容区 */}
        <main className="flex-1 px-3 pt-3 pb-24">
          <Outlet />
        </main>

        {/* 底部导航 56px */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 h-14 bg-white border-t border-border flex">
          <NavLink
            to="/villager"
            end
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5',
                isActive ? 'text-primary' : 'text-ink-sub'
              )
            }
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">首页</span>
          </NavLink>
          <NavLink
            to="/villager/warning"
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5',
                isActive ? 'text-primary' : 'text-ink-sub'
              )
            }
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="text-[10px]">预警</span>
          </NavLink>
          <NavLink
            to="/villager/register"
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5',
                isActive ? 'text-primary' : 'text-ink-sub'
              )
            }
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px]">登记</span>
          </NavLink>
          <NavLink
            to="/villager/rescue"
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5',
                isActive ? 'text-primary' : 'text-ink-sub'
              )
            }
          >
            <LifeBuoy className="w-5 h-5" />
            <span className="text-[10px]">救援</span>
          </NavLink>
          <button
            onClick={() => setProfileOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5',
              profileOpen ? 'text-primary' : 'text-ink-sub'
            )}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">我的</span>
          </button>
        </nav>

        {/* 我的 - 底部弹出面板 */}
        {profileOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setProfileOpen(false)}
          >
            <div className="absolute inset-0 bg-black/40 animate-fade-in" />
            <div
              className="relative w-full max-w-[480px] bg-white rounded-t-card animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 h-12 border-b border-border">
                <span className="text-sm font-bold text-ink">我的信息</span>
                <button
                  onClick={() => setProfileOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg"
                >
                  <X className="w-4 h-4 text-ink-sub" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-bold text-ink truncate">{user?.name || '村民'}</div>
                    <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {ROLE_LABELS[user?.role || 'villager']}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-ink-sub">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>村组：{villageName || user?.village?.township || '未绑定'}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center gap-2 text-ink-sub">
                      <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>电话：{user.phone}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full h-11 rounded-btn bg-warn-red text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <LogOut className="w-4 h-4" /> 退出登录
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
