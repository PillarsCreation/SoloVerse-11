/**
 * 村民端 - 救援进度追踪（外卖式）
 * 查询本人救援任务 -> 展示队伍位置地图 + 进度时间线 + ETA 倒计时
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LifeBuoy, Clock, MapPin, Phone, Navigation, CheckCircle2, Loader2,
  ShieldAlert, Mountain, Waves,
} from 'lucide-react';
import { rescueApi, personnelApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { RescueTask, TrackPoint } from '@/types';
import { Loading, EmptyState, StatusBadge } from '@/components/ui';
import GisMap from '@/components/GisMap';
import { cn } from '@/lib/utils';

type TrackedTask = RescueTask & {
  team_lng?: number;
  team_lat?: number;
  team_status?: string;
};

const STEPS = [
  { key: 'pending', label: '已接单' },
  { key: 'enroute', label: '已出发' },
  { key: 'arrived', label: '抵达现场' },
  { key: 'completed', label: '救援完成' },
];

function currentStepIndex(status: string): number {
  if (status === 'completed') return 3;
  if (status === 'arrived') return 2;
  if (status === 'enroute' || status === 'dispatched') return 1;
  return 0;
}

export default function VillagerRescue() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<TrackedTask | null>(null);
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [teamPos, setTeamPos] = useState<{ lng: number; lat: number } | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const loadTrack = useCallback(async (id: string) => {
    try {
      const res = await rescueApi.track(id);
      if (!mountedRef.current) return;
      setTask(res.task);
      setTrack(res.track || []);
      if (res.task.team_lng && res.task.team_lat) {
        setTeamPos({ lng: res.task.team_lng, lat: res.task.team_lat });
      }
    } catch {
      /* 单次刷新失败忽略 */
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id || !user?.villageId) {
      setLoading(false);
      return;
    }
    try {
      // 1. 通过村组找到本人人员记录
      const list = await personnelApi.list({ villageId: user.villageId });
      const me = list.find((p) => p.user_id === user.id);
      if (!me) {
        setLoading(false);
        return;
      }
      // 2. 查询该人员的救援任务
      const tasks = await rescueApi.tasks({ personnelId: me.id });
      const active = (tasks || []).find((t) => t.status !== 'completed' && t.status !== 'cancelled') || null;
      if (!active) {
        setTask(null);
        setTaskId(null);
        setLoading(false);
        return;
      }
      setTaskId(active.id);
      await loadTrack(active.id);
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : '加载失败');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user, loadTrack]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  // 每 180 秒自动刷新轨迹（测试用例3-4统一间隔为180秒）
  useEffect(() => {
    if (!taskId) return;
    const timer = setInterval(() => {
      loadTrack(taskId);
    }, 180000);
    return () => clearInterval(timer);
  }, [taskId, loadTrack]);

  // ETA 倒计时
  useEffect(() => {
    if (!task?.created_at || !task.eta_minutes) {
      setRemaining(null);
      return;
    }
    const target = new Date(task.created_at).getTime() + task.eta_minutes * 60000;
    const tick = () => {
      const r = Math.max(0, Math.ceil((target - Date.now()) / 60000));
      setRemaining(r);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [task?.created_at, task?.eta_minutes]);

  if (loading) return <Loading text="加载救援信息..." />;

  if (!task) {
    return (
      <div className="space-y-3 animate-fade-in">
        <EmptyState icon={<LifeBuoy className="w-10 h-10" />} text="暂无救援任务" />
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-warn-orange" />
            <span className="text-sm font-bold text-ink">避险须知</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <Waves className="w-4 h-4 text-warn-blue flex-shrink-0 mt-0.5" />
              <div className="text-xs text-ink-sub leading-relaxed">
                <span className="font-bold text-ink">山洪避险：</span>
                向沟道两侧高地撤离，严禁顺着河道方向奔跑。若被洪水围困，可利用门板、泡沫、床板等漂浮物资自救，并及时对外求救。
              </div>
            </div>
            <div className="flex gap-2">
              <Mountain className="w-4 h-4 text-warn-orange flex-shrink-0 mt-0.5" />
              <div className="text-xs text-ink-sub leading-relaxed">
                <span className="font-bold text-ink">山体滑坡：</span>
                向滑坡滑移方向的左右两侧高地撤离，绝对禁止顺着滑坡方向逃跑。无法撤离时抱紧固定大树、躲避在坚固障碍物后方。
              </div>
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-ink-sub px-4">
          如需紧急救援，请拨打
          <a href="tel:119" className="text-warn-red font-bold mx-1">119</a>
          或在首页进行伤情/物资上报。
        </div>
      </div>
    );
  }

  const stepIndex = currentStepIndex(task.status);

  return (
    <div className="space-y-3 animate-fade-in">
      {error && (
        <div className="text-sm text-warn-red bg-warn-red/10 rounded-btn px-3 py-2">{error}</div>
      )}

      {/* 顶部信息卡 */}
      <div className="card p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-bold text-ink truncate">
              {task.team_name || '救援队伍'}
            </div>
            {task.leader_name && (
              <div className="text-xs text-ink-sub mt-0.5">队长：{task.leader_name}</div>
            )}
          </div>
          <StatusBadge status={task.status === 'completed' ? 'safe' : 'rescuing'} />
        </div>

        <div className="flex items-center gap-4 mt-3">
          {/* ETA 倒计时 */}
          <div className="flex-1 bg-bg rounded-btn p-2.5">
            <div className="text-xs text-ink-sub flex items-center gap-1">
              <Clock className="w-3 h-3" /> 预计到达
            </div>
            <div className="text-lg font-bold text-warn-orange">
              {task.status === 'completed'
                ? '已完成'
                : remaining !== null
                ? `${remaining} 分钟`
                : task.eta_minutes
                ? `${task.eta_minutes} 分钟`
                : '测算中'}
            </div>
          </div>
          {/* 拨打电话 */}
          {task.target_phone && (
            <a
              href={`tel:${task.target_phone}`}
              className="w-12 h-12 rounded-btn bg-safe text-white flex items-center justify-center active:scale-95 transition-transform"
            >
              <Phone className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>

      {/* 地图：救援队 -> 目标 */}
      <div className="card overflow-hidden">
        <div className="h-56 w-full">
          <GisMap
            center={[task.target_lat, task.target_lng]}
            zoom={14}
            tasks={[task]}
            tracks={track.length > 1 ? { [task.id]: track } : {}}
            teamPosition={teamPos || undefined}
          />
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs">
          <span className="text-warn-orange flex items-center gap-1">
            <Navigation className="w-3 h-3" /> 救援队位置
          </span>
          <span className="text-warn-red flex items-center gap-1">
            <MapPin className="w-3 h-3" /> 您的位置
          </span>
        </div>
      </div>

      {/* 进度时间线 */}
      <div className="card p-3">
        <div className="text-sm font-bold text-ink mb-3">救援进度</div>
        <div className="relative">
          {/* 连接线 */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
          <div
            className="absolute top-4 left-4 h-0.5 bg-safe transition-all"
            style={{ width: `calc((100% - 32px) * ${Math.min(stepIndex, 3) / 3})` }}
          />
          <div className="relative flex justify-between">
            {STEPS.map((s, i) => {
              const done = i <= stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div
                  key={s.key}
                  className="flex flex-col items-center gap-1.5 w-1/4"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                      done ? 'bg-safe text-white' : 'bg-bg text-ink-sub',
                      isCurrent && 'ring-4 ring-safe/20'
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Loader2 className={cn('w-4 h-4', isCurrent && 'animate-spin text-warn-orange')} />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] text-center',
                      done ? 'text-ink font-medium' : 'text-ink-sub'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 任务详情 */}
      <div className="card p-3 space-y-1.5">
        <div className="text-sm font-bold text-ink mb-1">任务详情</div>
        {task.target_name && (
          <DetailRow label="救援对象" value={task.target_name} />
        )}
        {task.village_name && (
          <DetailRow label="所在村组" value={task.village_name} />
        )}
        {task.terrain_risk && (
          <DetailRow label="地质风险" value={task.terrain_risk} />
        )}
        {task.hazard_note && (
          <DetailRow label="危险提示" value={task.hazard_note} />
        )}
        {task.optimal_route && (
          <DetailRow label="推荐路线" value={task.optimal_route} />
        )}
        {task.forbidden_routes && (
          <DetailRow label="禁行路线" value={task.forbidden_routes} />
        )}
      </div>

      <div className="text-center text-[10px] text-ink-sub px-4">
        数据每 30 秒自动刷新
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-ink-sub flex-shrink-0 w-16">{label}</span>
      <span className="text-ink flex-1">{value}</span>
    </div>
  );
}
