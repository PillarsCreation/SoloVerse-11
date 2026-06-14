/**
 * 救援任务列表 - 移动端
 * 筛选标签 + 任务卡片
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ClipboardList, MapPin, Clock, Package, ChevronRight, AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { rescueApi } from '@/lib/api';
import type { RescueTask, TaskStatus } from '@/types';
import { InjuryBadge, Loading, EmptyState } from '@/components/ui';

interface SummaryCtx {
  refreshSummary: () => void;
}

// 任务状态配置
const STATUS_CONFIG: Record<TaskStatus, { label: string; cls: string }> = {
  pending: { label: '待分配', cls: 'bg-bg text-ink-sub' },
  dispatched: { label: '待出发', cls: 'bg-warn-orange/10 text-warn-orange' },
  enroute: { label: '执行中', cls: 'bg-accent/10 text-accent' },
  arrived: { label: '执行中', cls: 'bg-accent/10 text-accent' },
  completed: { label: '已完成', cls: 'bg-safe/10 text-safe' },
  cancelled: { label: '已撤销', cls: 'bg-bg text-ink-sub' },
};

type TabKey = 'all' | 'dispatched' | 'progress' | 'completed';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'dispatched', label: '待出发' },
  { key: 'progress', label: '执行中' },
  { key: 'completed', label: '已完成' },
];

function formatTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RescueTaskList() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { refreshSummary } = useOutletContext<SummaryCtx>();

  const [tasks, setTasks] = useState<RescueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('all');

  const fetchTasks = () => {
    if (!user?.teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    rescueApi
      .tasks({ teamId: user.teamId })
      .then((data) => {
        setTasks(data);
        refreshSummary();
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.teamId]);

  const filtered = useMemo(() => {
    switch (tab) {
      case 'dispatched':
        return tasks.filter((t) => t.status === 'dispatched');
      case 'progress':
        return tasks.filter((t) => t.status === 'enroute' || t.status === 'arrived');
      case 'completed':
        return tasks.filter((t) => t.status === 'completed');
      default:
        return tasks;
    }
  }, [tasks, tab]);

  // 待出发任务优先排序
  const sorted = useMemo(() => {
    const weight: Record<TaskStatus, number> = {
      dispatched: 0, enroute: 1, arrived: 2, pending: 3, completed: 4, cancelled: 5,
    };
    return [...filtered].sort((a, b) => weight[a.status] - weight[b.status]);
  }, [filtered]);

  const counts = useMemo(() => ({
    all: tasks.length,
    dispatched: tasks.filter((t) => t.status === 'dispatched').length,
    progress: tasks.filter((t) => t.status === 'enroute' || t.status === 'arrived').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }), [tasks]);

  return (
    <div className="pb-6">
      {/* 筛选标签 */}
      <div className="sticky top-0 z-10 bg-bg px-3 py-2 flex gap-2 overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key === 'progress' ? 'progress' : t.key === 'all' ? 'all' : t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 h-8 px-3 rounded-btn text-xs font-medium transition-colors flex items-center gap-1 ${
                active
                  ? 'bg-warn-orange text-white'
                  : 'bg-white text-ink-sub border border-border'
              }`}
            >
              {t.label}
              <span className={`text-[10px] ${active ? 'opacity-90' : 'text-ink-sub'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 列表 */}
      <div className="px-3 mt-1 space-y-3">
        {loading ? (
          <Loading text="加载任务中..." />
        ) : error ? (
          <div className="card p-6 text-center text-warn-red text-sm flex flex-col items-center gap-2">
            <AlertCircle size={28} />
            <span>{error}</span>
            <button onClick={fetchTasks} className="btn-secondary h-9 mt-2">重试</button>
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState text="暂无救援任务" icon={<ClipboardList size={40} />} />
        ) : (
          sorted.map((task) => {
            const cfg = STATUS_CONFIG[task.status];
            return (
              <button
                key={task.id}
                onClick={() => navigate(`/rescue/task/${task.id}`)}
                className="card w-full text-left p-3 active:scale-[0.99] transition-transform"
              >
                {/* 头部 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {task.avatar ? (
                      <img
                        src={task.avatar}
                        alt={task.target_name}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-border"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-warn-orange/10 text-warn-orange flex items-center justify-center shrink-0 font-bold">
                        {task.target_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{task.target_name}</div>
                      {task.target_phone && (
                        <div className="text-[11px] text-ink-sub">{task.target_phone}</div>
                      )}
                    </div>
                  </div>
                  <InjuryBadge level={task.injury_level} />
                </div>

                {/* 信息行 */}
                <div className="mt-2 space-y-1 text-xs text-ink-sub">
                  {task.village_name && (
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{task.village_name}</span>
                    </div>
                  )}
                  {task.material_needs && (
                    <div className="flex items-center gap-1">
                      <Package size={12} className="shrink-0" />
                      <span className="truncate">物资需求：{task.material_needs}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="shrink-0" />
                    <span>派发：{formatTime(task.created_at)}</span>
                    {task.eta_minutes != null && (
                      <span className="ml-2 text-accent font-medium">预计 {Math.round(task.eta_minutes / 60)} 小时</span>
                    )}
                  </div>
                </div>

                {/* 底部状态 */}
                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                  <span className={`tag font-bold ${cfg.cls}`}>{cfg.label}</span>
                  <span className="text-[11px] text-ink-sub flex items-center gap-0.5">
                    查看 <ChevronRight size={14} />
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
