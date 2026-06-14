/**
 * 指挥调度大屏 - 三栏布局：左侧菜单(布局) + 中部GIS地图 + 右侧数据面板
 */
import { useEffect, useState } from 'react';
import {
  Users, ShieldCheck, Clock, HeartPulse, Activity, CheckCircle2,
  Package, AlertTriangle, MapPin, RefreshCw,
} from 'lucide-react';
import GisMap from '@/components/GisMap';
import { StatCard, Loading, EmptyState, WarningBadge } from '@/components/ui';
import { dashboardApi, geoApi, warningApi, personnelApi } from '@/lib/api';
import type {
  DashboardStats, Village, Warning, Personnel, WarningLevel,
} from '@/types';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [villages, setVillages] = useState<Village[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [s, v, w, p] = await Promise.all([
        dashboardApi.stats(),
        geoApi.villages(),
        warningApi.list({ status: 'active' }).catch(() => [] as Warning[]),
        personnelApi.list().catch(() => [] as Personnel[]),
      ]);
      setStats(s);
      setVillages(v);
      setWarnings(w);
      setPersonnel(p);
    } catch (err: any) {
      setError(err?.message || '数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // 每 30s 自动刷新一次
    const timer = setInterval(() => loadAll(true), 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <div className="h-full"><Loading text="正在加载大屏数据..." /></div>;
  }

  // 物资需求 Top 列表
  const materialEntries = stats
    ? Object.entries(stats.materialNeeds).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];
  const maxMaterial = materialEntries.length ? materialEntries[0][1] : 1;

  return (
    <div className="h-full flex">
      {/* 中部 GIS 地图 */}
      <div className="flex-1 min-w-0 relative">
        <GisMap
          villages={villages}
          warnings={warnings}
          personnel={personnel}
          shelters={stats?.shelters || []}
          showFitBounds
          className="h-full w-full"
        />
        {/* 地图左上角标题 */}
        <div className="absolute top-3 left-3 card px-3 py-2 z-[1000] shadow-card">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <MapPin size={16} className="text-primary" />
            指挥调度 GIS 大屏
          </div>
          <div className="text-[11px] text-ink-sub mt-0.5">
            村组 {villages.length} · 预警 {warnings.length} · 人员 {personnel.length}
          </div>
        </div>
        {/* 右上角刷新 */}
        <button
          onClick={() => loadAll(true)}
          className="absolute top-3 right-3 card px-3 py-2 z-[1000] shadow-card text-sm text-ink-sub hover:text-primary flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          刷新
        </button>
        {error && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-warn-red text-white text-xs px-3 py-2 rounded-btn shadow-card">
            {error}
          </div>
        )}
      </div>

      {/* 右侧数据面板 */}
      <aside className="w-[320px] shrink-0 border-l border-border bg-bg overflow-y-auto p-3 space-y-3">
        {/* 人员统计 */}
        <div>
          <div className="text-xs font-bold text-ink-sub mb-2 flex items-center gap-1.5">
            <Users size={14} /> 人员统计
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard title="总人数" value={stats?.personnel.total ?? 0} color="#005288" icon={<Users size={22} />} />
            <StatCard title="已安全" value={stats?.personnel.safe ?? 0} color="#27AE60" icon={<ShieldCheck size={22} />} />
            <StatCard title="待避险" value={stats?.personnel.pending ?? 0} color="#E62020" icon={<Clock size={22} />} />
            <StatCard title="受伤人数" value={(stats?.personnel.severe_injury ?? 0) + (stats?.personnel.minor_injury ?? 0)} color="#F57C00" icon={<HeartPulse size={22} />} />
          </div>
        </div>

        {/* 救援任务统计 */}
        <div>
          <div className="text-xs font-bold text-ink-sub mb-2 flex items-center gap-1.5">
            <Activity size={14} /> 救援任务统计
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard title="进行中" value={stats?.rescue.in_progress ?? 0} color="#F57C00" icon={<Activity size={22} />} />
            <StatCard title="已完成" value={stats?.rescue.completed ?? 0} color="#27AE60" icon={<CheckCircle2 size={22} />} />
          </div>
        </div>

        {/* 物资需求 */}
        <div className="card p-3">
          <div className="text-xs font-bold text-ink-sub mb-2 flex items-center gap-1.5">
            <Package size={14} /> 物资需求 TOP
          </div>
          {materialEntries.length === 0 ? (
            <EmptyState text="暂无物资需求" />
          ) : (
            <div className="space-y-2">
              {materialEntries.map(([name, count]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink">{name}</span>
                    <span className="text-ink-sub font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(count / maxMaterial) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 活跃预警列表 */}
        <div className="card p-3">
          <div className="text-xs font-bold text-ink-sub mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} /> 活跃预警 ({warnings.length})
          </div>
          {warnings.length === 0 ? (
            <EmptyState text="当前无活跃预警" icon={<AlertTriangle size={28} />} />
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {warnings.map(w => (
                <div key={w.id} className="border border-border rounded-btn p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <WarningBadge level={w.level as WarningLevel} size="sm" />
                    <span className="text-ink-sub text-[10px]">{w.village_name || '-'}</span>
                  </div>
                  <div className="font-medium text-ink truncate">{w.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
