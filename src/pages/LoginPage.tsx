/**
 * 统一登录页 - 四角色选择 + 登录表单
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Home, LifeBuoy, Sprout, LogIn, Lock, User as UserIcon,
  Droplets, AlertCircle,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { UserRole } from '@/types';

interface RoleOption {
  role: UserRole;
  name: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  demoUser: string;
  demoPwd: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'admin',
    name: '防汛抗旱指挥部',
    desc: '指挥调度、预警发布、全局监控',
    icon: <ShieldCheck size={26} />,
    color: '#005288',
    gradient: 'linear-gradient(135deg, #003D66 0%, #0070B8 100%)',
    demoUser: 'admin',
    demoPwd: 'admin123',
  },
  {
    role: 'villager',
    name: '辖区村民',
    desc: '避险登记、灾情上报、救援请求',
    icon: <Home size={26} />,
    color: '#27AE60',
    gradient: 'linear-gradient(135deg, #1B7A3F 0%, #2ECC71 100%)',
    demoUser: 'villager1',
    demoPwd: '123456',
  },
  {
    role: 'rescue',
    name: '应急救援队伍',
    desc: '接收任务、导航救援、轨迹上报',
    icon: <LifeBuoy size={26} />,
    color: '#F57C00',
    gradient: 'linear-gradient(135deg, #E65100 0%, #FB8C00 100%)',
    demoUser: 'rescue1',
    demoPwd: '123456',
  },
  {
    role: 'agriculture',
    name: '农业灾情统计员',
    desc: '农业灾情登记、损失汇总统计',
    icon: <Sprout size={26} />,
    color: '#1976D2',
    gradient: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)',
    demoUser: 'agriculture',
    demoPwd: 'agri123',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function pickRole(r: RoleOption) {
    setSelectedRole(r.role);
    setUsername(r.demoUser);
    setPassword(r.demoPwd);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) {
      setError('请先选择登录角色');
      return;
    }
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user, token } = await authApi.login(username, password, selectedRole);
      setAuth(user, token);
      navigate(`/${user.role}`, { replace: true });
    } catch (err: any) {
      setError(err?.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#002B4A] via-[#003D66] to-[#005288] p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[10%] right-[5%] w-96 h-96 rounded-full bg-cyan-400/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 animate-slide-up">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#003D66] to-[#0070B8] flex items-center justify-center text-white shadow-lg">
            <Droplets size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">洪水安防地理智能系统</h1>
            <p className="text-sm text-ink-sub">山洪与山体滑坡灾害智能预警调度平台</p>
          </div>
        </div>

        {/* 角色选择卡片 */}
        <div className="mb-6">
          <p className="text-sm font-medium text-ink-sub mb-3">请选择登录角色</p>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(r => {
              const active = selectedRole === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => pickRole(r)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                    active
                      ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]'
                      : 'border-border bg-white hover:border-primary/30 hover:shadow-md'
                  }`}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
                    style={{ background: r.gradient }}
                  >
                    {r.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink text-sm">{r.name}</div>
                    <div className="text-xs text-ink-sub mt-0.5">{r.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-sub mb-1">用户名</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-sub" />
              <input
                className="input-field pl-9"
                placeholder="请输入用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-sub mb-1">密码</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-sub" />
              <input
                type="password"
                className="input-field pl-9"
                placeholder="请输入密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-warn-red bg-warn-red/10 px-3 py-2 rounded-btn">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                登录中...
              </>
            ) : (
              <>
                <LogIn size={18} />
                登 录
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-ink-sub mt-6">
          洪水安防地理智能系统
        </p>
      </div>
    </div>
  );
}
