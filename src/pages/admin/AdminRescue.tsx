/**
 * 救援调度 - 左侧待救援人员 + 右侧进行中任务 + 指派/撤销面板
 */
import { useEffect, useState, useMemo } from 'react';
import {
  LifeBuoy, Users, AlertTriangle, RefreshCw, Send, X, Clock,
  MapPin, Phone, Package, Navigation, CheckCircle2, Truck, Ban,
} from 'lucide-react';
import { InjuryBadge, StatusBadge, Loading, EmptyState } from '@/components/ui';
import { rescueApi, personnelApi } from '@/lib/api';
import type { Personnel, RescueTask, RescueTeam } from '@/types';

const TASK_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: '待派单', color: '#E62020' },
  dispatched: { label: '待出发', color: '#1976D2' },
  enroute: { label: '执行中', color: '#F57C00' },
  arrived: { label: '执行中', color: '#F57C00' },
  completed: { label: '已完成', color: '#27AE60' },
  cancelled: { label: '已撤销', color: '#86909C' },
};

type TeamWithTask = RescueTeam & {
  current_task_id?: string | null;
  current_target?: string | null;
};

export default function AdminRescue() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [tasks, setTasks] = useState<RescueTask[]>([]);
  const [teams, setTeams] = useState<TeamWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 创建任务表单
  const [creating, setCreating] = useState<Personnel | null>(null);
  const [teamId, setTeamId] = useState('');
  const [hazardNote, setHazardNote] = useState('');
  const [forbiddenRoutes, setForbiddenRoutes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 撤销任务
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [p, t, tm] = await Promise.all([
        personnelApi.list(),
        rescueApi.tasks(),
        rescueApi.teams(),
      ]);
      setPersonnel(p);
      setTasks(t);
      setTeams(tm);
    } catch (err: any) {
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 待救援人员：状态为 pending
  const pendingList = useMemo(
    () => personnel.filter(p => p.safety_status === 'pending'),
    [personnel]
  );

  // 进行中任务（排除已完成和已撤销）
  const activeTasks = useMemo(
    () => tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled'),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter(t => t.status === 'completed' || t.status === 'cancelled'),
    [tasks]
  );

  function openCreate(p: Personnel) {
    setCreating(p);
    // 默认选择第一支空闲队伍
    const standby = teams.find(t => t.status === 'standby');
    setTeamId(standby?.id || teams[0]?.id || '');
    setHazardNote('');
    setForbiddenRoutes('');
  }

  async function handleAssign() {
    if (!creating || !teamId) {
      setError('请选择救援队伍');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await rescueApi.assign({
        personnelId: creating.id,
        teamId,
        hazardNote: hazardNote || undefined,
        forbiddenRoutes: forbiddenRoutes || undefined,
      });
      setCreating(null);
      await load();
    } catch (err: any) {
      setError(err?.message || '指派失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(taskId: string) {
    if (!window.confirm('确认撤销此救援任务？撤销后人员将回到待救援状态，可重新指派。')) return;
    setCancelingId(taskId);
    setError('');
    try {
      await rescueApi.cancel(taskId);
      await load();
    } catch (err: any) {
      setError(err?.message || '撤销失败');
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <LifeBuoy size={20} className="text-warn-orange" />
          救援调度面板
        </h2>
        <button onClick={load} className="btn-secondary h-9 px-3 text-sm flex items-center gap-1.5">
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      {error && (
        <div className="text-sm text-warn-red bg-warn-red/10 px-3 py-2 rounded-btn flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* 救援队伍状态概览 */}
      {!loading && teams.length > 0 && (
        <div className="card p-3">
          <div className="text-xs font-bold text-ink-sub mb-2 flex items-center gap-1">
            <Truck size={14} /> 救援队伍状态
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {teams.map(t => (
              <div
                key={t.id}
                className={`border rounded-btn px-3 py-2 text-xs ${
                  t.status === 'standby'
                    ? 'border-safe/30 bg-safe/5'
                    : 'border-warn-orange/30 bg-warn-orange/5'
                }`}
              >
                <div className="font-bold text-ink truncate">{t.name}</div>
                <div className="text-ink-sub mt-0.5">
                  队长：{t.leader_name} · {t.member_count}人
                </div>
                <div className={`mt-0.5 font-medium ${
                  t.status === 'standby' ? 'text-safe' : 'text-warn-orange'
                }`}>
                  {t.status === 'standby' ? '● 空闲待命' : `● 执行中${t.current_target ? `：${t.current_target}` : ''}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <Loading text="加载救援数据..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 左侧：待救援人员 */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <AlertTriangle size={16} className="text-warn-red" />
                待救援人员 ({pendingList.length})
              </h3>
            </div>
            {pendingList.length === 0 ? (
              <EmptyState text="暂无待救援人员" icon={<Users size={32} />} />
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
                {pendingList.map(p => (
                  <div key={p.id} className="border border-border rounded-btn p-3 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {p.avatar ? (
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-10 h-10 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">{p.name}</span>
                            <StatusBadge status={p.safety_status} />
                            <InjuryBadge level={p.injury_level} />
                          </div>
                          <div className="text-xs text-ink-sub mt-1 flex items-center gap-1.5">
                            <MapPin size={11} /> {p.village_name || '-'} · {p.lng.toFixed(3)}, {p.lat.toFixed(3)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-sub mb-2">
                      <div className="flex items-center gap-1"><Phone size={11} /> {p.phone || '-'}</div>
                      <div className="flex items-center gap-1"><Users size={11} /> 同行 {p.companion_count} 人</div>
                      {p.material_needs && (
                        <div className="flex items-center gap-1 col-span-2"><Package size={11} /> {p.material_needs}</div>
                      )}
                    </div>
                    <button
                      onClick={() => openCreate(p)}
                      className="btn-accent h-9 w-full text-sm flex items-center justify-center gap-1.5"
                    >
                      <Send size={14} />
                      指派救援队伍
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：进行中任务 */}
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="text-base font-bold text-ink flex items-center gap-2 mb-3">
                <Navigation size={16} className="text-accent" />
                进行中任务 ({activeTasks.length})
              </h3>
              {activeTasks.length === 0 ? (
                <EmptyState text="暂无进行中任务" icon={<Navigation size={32} />} />
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {activeTasks.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onCancel={handleCancel}
                      canceling={cancelingId === t.id}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4">
              <h3 className="text-base font-bold text-ink flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-safe" />
                已完成/撤销 ({completedTasks.length})
              </h3>
              {completedTasks.length === 0 ? (
                <EmptyState text="暂无历史任务" />
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {completedTasks.map(t => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 指派任务弹窗 */}
      {creating && (
        <div
          className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-4"
          onClick={() => setCreating(null)}
        >
          <div
            className="bg-white rounded-card w-full max-w-md shadow-card-lg animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-primary text-white px-5 py-3 flex items-center justify-between rounded-t-card">
              <div className="flex items-center gap-2">
                <LifeBuoy size={18} />
                <span className="font-bold">指派救援任务</span>
              </div>
              <button onClick={() => setCreating(null)} className="hover:opacity-70">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* 目标信息 */}
              <div className="border border-border rounded-btn p-3 bg-bg/50">
                <div className="text-xs text-ink-sub mb-1">救援目标</div>
                <div className="flex items-center gap-2">
                  {creating.avatar ? (
                    <img
                      src={creating.avatar}
                      alt={creating.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : null}
                  <span className="font-bold text-ink">{creating.name}</span>
                  <InjuryBadge level={creating.injury_level} />
                </div>
                <div className="text-xs text-ink-sub mt-1">
                  {creating.village_name || '-'} · {creating.lng.toFixed(4)}, {creating.lat.toFixed(4)}
                </div>
                {creating.material_needs && (
                  <div className="text-xs text-ink-sub mt-1 flex items-center gap-1">
                    <Package size={11} /> {creating.material_needs}
                  </div>
                )}
              </div>

              {/* 选择队伍 */}
              <div>
                <label className="block text-xs text-ink-sub mb-1">派遣救援队伍</label>
                <select
                  className="input-field"
                  value={teamId}
                  onChange={e => setTeamId(e.target.value)}
                >
                  <option value="">请选择救援队伍</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.leader_name} · {t.member_count}人
                      {t.status === 'on_mission' ? '（执行任务中）' : '（空闲）'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-ink-sub mb-1">危险提示（可选）</label>
                <textarea
                  className="input-field min-h-[60px] py-2"
                  placeholder="如：山路湿滑、塌方风险等"
                  value={hazardNote}
                  onChange={e => setHazardNote(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-ink-sub mb-1">禁行路线（可选）</label>
                <input
                  className="input-field"
                  placeholder="如：老路 3km 段"
                  value={forbiddenRoutes}
                  onChange={e => setForbiddenRoutes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setCreating(null)}
                  className="btn-secondary flex-1 h-10"
                >
                  取消
                </button>
                <button
                  onClick={handleAssign}
                  disabled={submitting || !teamId}
                  className="btn-accent flex-1 h-10 flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      指派中...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      确认指派
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task, onCancel, canceling,
}: {
  task: RescueTask;
  onCancel?: (taskId: string) => void;
  canceling?: boolean;
}) {
  const cfg = TASK_STATUS_LABEL[task.status] || { label: task.status, color: '#86909C' };
  const canCancel = onCancel && (task.status === 'dispatched' || task.status === 'enroute');
  return (
    <div className="border border-border rounded-btn p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink text-sm">{task.target_name}</span>
          <InjuryBadge level={task.injury_level} />
        </div>
        <span className="tag text-white" style={{ backgroundColor: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-ink-sub">
        <div className="flex items-center gap-1"><Truck size={11} /> {task.team_name || '-'}</div>
        <div className="flex items-center gap-1"><Clock size={11} /> ETA {task.eta_minutes ?? '-'} 分钟</div>
        <div className="flex items-center gap-1"><MapPin size={11} /> {task.village_name || '-'}</div>
        {task.leader_name && (
          <div className="flex items-center gap-1"><Users size={11} /> {task.leader_name}</div>
        )}
      </div>
      {task.hazard_note && (
        <div className="text-xs text-warn-red mt-1.5 flex items-center gap-1">
          <AlertTriangle size={11} /> {task.hazard_note}
        </div>
      )}
      {task.optimal_route && (
        <div className="text-xs text-safe mt-1.5 flex items-center gap-1">
          <Navigation size={11} /> 推荐路线: {task.optimal_route}
        </div>
      )}
      {canCancel && (
        <button
          onClick={() => onCancel!(task.id)}
          disabled={canceling}
          className="mt-2 w-full h-8 rounded-btn border border-warn-red/30 text-warn-red text-xs font-medium flex items-center justify-center gap-1 hover:bg-warn-red/5 disabled:opacity-60"
        >
          {canceling ? (
            <>
              <div className="w-3 h-3 border-2 border-warn-red border-t-transparent rounded-full animate-spin" />
              撤销中...
            </>
          ) : (
            <>
              <Ban size={12} />
              撤销任务
            </>
          )}
        </button>
      )}
    </div>
  );
}
