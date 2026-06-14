/**
 * 救援任务执行详情 - 移动端
 * 上半屏GIS路线地图 + 下半屏任务详情 + 底部固定操作栏
 * 30秒自动上报位置
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Package, AlertTriangle, Ban, Route,
  Navigation, CheckCircle2, Loader2, Target, Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { rescueApi } from '@/lib/api';
import type { RescueTask, TrackPoint, TaskStatus } from '@/types';
import { InjuryBadge, Loading } from '@/components/ui';
import GisMap from '@/components/GisMap';

type TaskDetail = RescueTask & { track: TrackPoint[] };

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待分配',
  dispatched: '待出发',
  enroute: '执行中',
  arrived: '执行中',
  completed: '已完成',
  cancelled: '已撤销',
};

function formatTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCoord(v?: number): string {
  if (v == null || Number.isNaN(v)) return '-';
  return v.toFixed(6);
}

export default function RescueTaskDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [lastReport, setLastReport] = useState<string | null>(null);

  const fetchDetail = (silent = false) => {
    if (!id) return;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    rescueApi
      .taskDetail(id)
      .then((data) => setTask(data))
      .catch((e) => !silent && setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => !silent && setLoading(false));
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 当前救援队位置：优先最新轨迹点，否则使用队伍驻地坐标
  const teamPosition = useMemo(() => {
    if (task?.track && task.track.length > 0) {
      const last = task.track[task.track.length - 1];
      return { lng: last.lng, lat: last.lat };
    }
    if (user?.team) return { lng: user.team.lng, lat: user.team.lat };
    return undefined;
  }, [task, user]);

  // 计算用于绘制的路线点：队伍位置 -> 轨迹 -> 目标点
  const routePoints = useMemo<TrackPoint[]>(() => {
    if (!task) return [];
    const pts: TrackPoint[] = [];
    if (teamPosition) {
      pts.push({ lng: teamPosition.lng, lat: teamPosition.lat, timestamp: '' });
    }
    if (task.track?.length) pts.push(...task.track);
    pts.push({
      lng: task.target_lng,
      lat: task.target_lat,
      timestamp: new Date().toISOString(),
    });
    return pts;
  }, [task, teamPosition]);

  // 地图中心：目标点
  const mapCenter = useMemo<[number, number]>(() => {
    if (task) return [task.target_lat, task.target_lng];
    return [29.555, 103.79];
  }, [task]);

  // 180秒自动上报位置（测试用例4-3统一间隔为180秒）
  const taskRef = useRef<TaskDetail | null>(null);
  taskRef.current = task;
  useEffect(() => {
    if (!id || !user?.teamId) return;
    // 任务已完成则停止上报
    const shouldReport = () => taskRef.current?.status !== 'completed';
    if (!shouldReport()) return;

    const report = () => {
      if (!shouldReport()) return;
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          rescueApi
            .reportLocation({
              taskId: id,
              teamId: user.teamId!,
              lng: pos.coords.longitude,
              lat: pos.coords.latitude,
            })
            .then(() => {
              setLastReport(new Date().toLocaleTimeString());
              // 上报后静默刷新轨迹
              fetchDetail(true);
            })
            .catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    };

    report();
    const timer = setInterval(report, 180000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.teamId]);

  // 状态流转操作
  const handleAction = async (next: TaskStatus, label: string) => {
    if (!task || acting) return;
    if (!window.confirm(`确认执行「${label}」操作？`)) return;
    setActing(true);
    try {
      await rescueApi.updateTask(task.id, next);
      fetchDetail(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActing(false);
    }
  };

  const renderActionButton = () => {
    if (!task) return null;
    switch (task.status) {
      case 'dispatched':
        return (
          <button
            disabled={acting}
            onClick={() => handleAction('enroute', '出发')}
            className="flex-1 btn-accent flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {acting ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
            出发
          </button>
        );
      case 'enroute':
        return (
          <button
            disabled={acting}
            onClick={() => handleAction('arrived', '抵达签到')}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {acting ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
            抵达签到
          </button>
        );
      case 'arrived':
        return (
          <button
            disabled={acting}
            onClick={() => handleAction('completed', '完成任务')}
            className="flex-1 btn-safe flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {acting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            完成任务
          </button>
        );
      default:
        return (
          <div className="flex-1 h-11 rounded-btn bg-safe/10 text-safe font-bold flex items-center justify-center gap-2">
            <CheckCircle2 size={18} /> 任务已完成
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[60vh]">
        <BackBar onBack={() => navigate('/rescue')} />
        <Loading text="加载任务详情..." />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col min-h-[60vh]">
        <BackBar onBack={() => navigate('/rescue')} />
        <div className="card m-3 p-6 text-center text-warn-red text-sm">
          {error || '任务不存在'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] min-h-[520px]">
      <BackBar onBack={() => navigate('/rescue')} title={`任务详情 · ${STATUS_LABEL[task.status]}`} />

      {/* 上半屏 地图 */}
      <div className="relative h-[42vh] min-h-[240px] bg-white border-b border-border">
        <GisMap
          center={mapCenter}
          zoom={15}
          teamPosition={teamPosition}
          tasks={[task]}
          tracks={{ [task.id]: routePoints }}
        />
        {lastReport && (
          <div className="absolute bottom-2 left-2 z-[400] tag bg-black/60 text-white text-[10px]">
            位置上报 {lastReport}
          </div>
        )}
      </div>

      {/* 下半屏 详情 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-24">
        {/* 目标信息 */}
        <div className="card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {task.avatar ? (
                <img src={task.avatar} alt={task.target_name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-warn-red/10 text-warn-red flex items-center justify-center shrink-0">
                  <Target size={20} />
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{task.target_name}</div>
                {task.target_phone && (
                  <div className="text-[11px] text-accent flex items-center gap-1">
                    <Phone size={11} /> {task.target_phone}
                  </div>
                )}
              </div>
            </div>
            <InjuryBadge level={task.injury_level} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-bg rounded-btn px-2 py-1.5">
              <div className="text-ink-sub text-[10px]">经度</div>
              <div className="font-mono">{formatCoord(task.target_lng)}</div>
            </div>
            <div className="bg-bg rounded-btn px-2 py-1.5">
              <div className="text-ink-sub text-[10px]">纬度</div>
              <div className="font-mono">{formatCoord(task.target_lat)}</div>
            </div>
          </div>
          {task.village_name && (
            <div className="mt-2 text-xs text-ink-sub flex items-center gap-1">
              <MapPin size={12} />
              {task.village_name}
              {task.terrain_risk ? ` · ${task.terrain_risk}` : ''}
            </div>
          )}
        </div>

        {/* 物资需求 */}
        {task.material_needs && (
          <div className="card p-3">
            <SectionTitle icon={<Package size={14} />} title="物资需求" />
            <p className="mt-1 text-sm">{task.material_needs}</p>
          </div>
        )}

        {/* 危险提示 */}
        {task.hazard_note && (
          <div className="rounded-card border border-warn-red/30 bg-warn-red/5 p-3">
            <SectionTitle icon={<AlertTriangle size={14} />} title="危险提示" color="#E62020" />
            <p className="mt-1 text-sm text-warn-red">{task.hazard_note}</p>
          </div>
        )}

        {/* 禁止通行路线 */}
        {task.forbidden_routes && (
          <div className="card p-3">
            <SectionTitle icon={<Ban size={14} />} title="禁止通行路线" color="#F57C00" />
            <p className="mt-1 text-sm">{task.forbidden_routes}</p>
          </div>
        )}

        {/* 最优路线 */}
        {task.optimal_route && (
          <div className="card p-3">
            <SectionTitle icon={<Route size={14} />} title="推荐最优路线" color="#2E7DFF" />
            <p className="mt-1 text-sm">{task.optimal_route}</p>
          </div>
        )}

        {/* 时间信息 */}
        <div className="card p-3 text-xs text-ink-sub space-y-1">
          <div className="flex items-center gap-1">
            <Clock size={12} /> 派发时间：{formatTime(task.created_at)}
          </div>
          {task.completed_at && (
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} /> 完成时间：{formatTime(task.completed_at)}
            </div>
          )}
          {task.eta_minutes != null && (
            <div className="flex items-center gap-1">
              <Navigation size={12} /> 预计耗时：{Math.round(task.eta_minutes / 60)} 小时
            </div>
          )}
        </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-border p-3 flex gap-2 z-50">
        {renderActionButton()}
      </div>
    </div>
  );
}

function BackBar({ onBack, title = '任务详情' }: { onBack: () => void; title?: string }) {
  return (
    <div className="h-12 bg-white border-b border-border flex items-center px-2 gap-2 sticky top-0 z-50">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-sub hover:text-primary">
        <ArrowLeft size={18} /> 返回
      </button>
      <div className="font-bold text-sm flex-1 text-center pr-12 truncate">{title}</div>
    </div>
  );
}

function SectionTitle({
  icon, title, color = '#1D2129',
}: { icon: ReactNode; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color }}>
      {icon}
      <span>{title}</span>
    </div>
  );
}
