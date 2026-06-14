/**
 * 人员台账 - 筛选 + 数据表 + 详情抽屉
 */
import { useEffect, useState, useMemo } from 'react';
import {
  Users, Filter, RefreshCw, Phone, MapPin, Clock, UsersRound,
  Package, X, Search,
} from 'lucide-react';
import { InjuryBadge, StatusBadge, Loading, EmptyState } from '@/components/ui';
import { personnelApi, geoApi } from '@/lib/api';
import type { Personnel, Village, RescueTask } from '@/types';

export default function AdminPersonnel() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [list, setList] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 筛选
  const [fVillage, setFVillage] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fInjury, setFInjury] = useState('');
  const [keyword, setKeyword] = useState('');

  // 详情
  const [detail, setDetail] = useState<(Personnel & { tasks: RescueTask[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    geoApi.villages().then(setVillages).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await personnelApi.list({
        villageId: fVillage || undefined,
        status: fStatus || undefined,
        injuryLevel: fInjury || undefined,
      });
      setList(data);
    } catch (err: any) {
      setError(err?.message || '加载失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fVillage, fStatus, fInjury]);

  // 关键词前端过滤
  const filtered = useMemo(() => {
    if (!keyword.trim()) return list;
    const k = keyword.trim().toLowerCase();
    return list.filter(p =>
      p.name.toLowerCase().includes(k) ||
      (p.phone || '').includes(k) ||
      (p.village_name || '').toLowerCase().includes(k)
    );
  }, [list, keyword]);

  async function openDetail(p: Personnel) {
    setDetailLoading(true);
    setDetail({ ...p, tasks: p.tasks || [] });
    try {
      const full = await personnelApi.detail(p.id);
      setDetail(full);
    } catch {
      // 保留简化版
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* 筛选栏 */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-primary" />
          <span className="text-sm font-bold text-ink">筛选条件</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-ink-sub mb-1">村组</label>
            <select
              className="input-field"
              value={fVillage}
              onChange={e => setFVillage(e.target.value)}
            >
              <option value="">全部村组</option>
              {villages.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-sub mb-1">安全状态</label>
            <select
              className="input-field"
              value={fStatus}
              onChange={e => setFStatus(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="pending">待避险</option>
              <option value="sheltered">已安置</option>
              <option value="rescuing">救援中</option>
              <option value="safe">已安全</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-sub mb-1">伤情等级</label>
            <select
              className="input-field"
              value={fInjury}
              onChange={e => setFInjury(e.target.value)}
            >
              <option value="">全部伤情</option>
              <option value="none">无受伤</option>
              <option value="minor">轻微受伤</option>
              <option value="severe">重度受伤</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-sub mb-1">关键词搜索</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-sub" />
              <input
                className="input-field pl-8"
                placeholder="姓名/电话/村组"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-ink-sub">
            共 <span className="font-bold text-ink">{filtered.length}</span> 条记录
          </span>
          <button onClick={load} className="btn-secondary h-9 px-3 text-xs flex items-center gap-1.5">
            <RefreshCw size={14} />
            刷新
          </button>
        </div>
      </div>

      {/* 数据表 */}
      <div className="card p-4">
        {error ? (
          <div className="text-sm text-warn-red bg-warn-red/10 px-3 py-2 rounded-btn">{error}</div>
        ) : loading ? (
          <Loading text="加载人员台账..." />
        ) : filtered.length === 0 ? (
          <EmptyState text="暂无人员数据" icon={<Users size={32} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-sub border-b border-border">
                  <th className="py-2 px-2">姓名</th>
                  <th className="py-2 px-2">村组</th>
                  <th className="py-2 px-2">坐标</th>
                  <th className="py-2 px-2">同行人数</th>
                  <th className="py-2 px-2">伤情</th>
                  <th className="py-2 px-2">状态</th>
                  <th className="py-2 px-2">到达时间</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => openDetail(p)}
                    className="border-b border-border hover:bg-bg cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-2 font-medium text-ink">{p.name}</td>
                    <td className="py-2 px-2 text-ink-sub">{p.village_name || '-'}</td>
                    <td className="py-2 px-2 text-ink-sub text-xs font-mono">
                      {p.lng.toFixed(4)}, {p.lat.toFixed(4)}
                    </td>
                    <td className="py-2 px-2 text-ink">{p.companion_count}</td>
                    <td className="py-2 px-2"><InjuryBadge level={p.injury_level} /></td>
                    <td className="py-2 px-2"><StatusBadge status={p.safety_status} /></td>
                    <td className="py-2 px-2 text-ink-sub text-xs">
                      {p.shelter_arrive_time
                        ? new Date(p.shelter_arrive_time).toLocaleString('zh-CN')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 详情抽屉 */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/40 z-[2000] flex justify-end"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-md bg-white h-full overflow-y-auto animate-slide-up shadow-card-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-primary text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span className="font-bold">人员详情</span>
              </div>
              <button onClick={() => setDetail(null)} className="hover:opacity-70">
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <Loading text="加载详情..." />
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  {detail.avatar ? (
                    <img src={detail.avatar} alt={detail.name} className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
                      {detail.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-ink">{detail.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={detail.safety_status} />
                      <InjuryBadge level={detail.injury_level} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <InfoRow icon={<Phone size={14} />} label="联系电话" value={detail.phone || '-'} />
                  <InfoRow icon={<MapPin size={14} />} label="所属村组" value={`${detail.village_name || '-'}（${detail.township || '-'}）`} />
                  <InfoRow icon={<MapPin size={14} />} label="当前坐标" value={`${detail.lng.toFixed(5)}, ${detail.lat.toFixed(5)}`} />
                  <InfoRow icon={<UsersRound size={14} />} label="同行人数" value={`${detail.companion_count} 人`} />
                  <InfoRow icon={<Clock size={14} />} label="到达时间" value={detail.shelter_arrive_time ? new Date(detail.shelter_arrive_time).toLocaleString('zh-CN') : '未到达'} />
                  <InfoRow icon={<Package size={14} />} label="物资需求" value={detail.material_needs || '无'} />
                </div>

                {/* 救援任务 */}
                <div>
                  <h4 className="text-sm font-bold text-ink mb-2">关联救援任务</h4>
                  {detail.tasks && detail.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {detail.tasks.map(t => (
                        <div key={t.id} className="border border-border rounded-btn p-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-ink">{t.team_name || '救援队伍'}</span>
                            <span className="tag bg-accent/10 text-accent">{t.status}</span>
                          </div>
                          <div className="text-ink-sub">ETA: {t.eta_minutes != null ? Math.round(t.eta_minutes / 60) + ' 小时' : '-'}</div>
                          {t.hazard_note && <div className="text-warn-red mt-1">⚠ {t.hazard_note}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="暂无关联救援任务" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-ink-sub mt-0.5 shrink-0">{icon}</span>
      <span className="text-ink-sub w-20 shrink-0">{label}</span>
      <span className="text-ink flex-1 break-all">{value}</span>
    </div>
  );
}
