/**
 * 灾情汇总 - 顶部统计 + 按村损失柱状图 + 物资需求 + 农业记录表
 */
import { useEffect, useState } from 'react';
import {
  ClipboardList, TrendingDown, Home, Sprout, Beef, RefreshCw,
  Package, MapPin, BarChart3,
} from 'lucide-react';
import { StatCard, Loading, EmptyState } from '@/components/ui';
import { agricultureApi, dashboardApi } from '@/lib/api';
import type { AgricultureRecord, DashboardStats } from '@/types';

interface SummaryRow {
  village_name: string;
  township?: string;
  records: number;
  crop_area?: number;
  crop_loss?: number;
  livestock_loss?: number;
  total_loss?: number;
}

export default function AdminDisaster() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [byVillage, setByVillage] = useState<SummaryRow[]>([]);
  const [records, setRecords] = useState<AgricultureRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sum, rec, st] = await Promise.all([
        agricultureApi.summary(),
        agricultureApi.records({ pageSize: 20 }),
        dashboardApi.stats().catch(() => null),
      ]);
      setSummary(sum.summary);
      setByVillage(sum.byVillage || []);
      setRecords(rec || []);
      if (st) setStats(st);
    } catch (err: any) {
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 数值安全转换
  const num = (v: any) => (typeof v === 'number' && !isNaN(v) ? v : 0);
  const money = (v: any) => num(v).toLocaleString('zh-CN', { maximumFractionDigits: 0 });

  const totalLoss = num(summary?.total_loss);
  const households = num(summary?.affected_households);
  const cropLoss = num(summary?.total_crop_loss);
  const livestockLoss = num(summary?.total_livestock_loss);

  // 柱状图最大值
  const maxVillageLoss = byVillage.length
    ? Math.max(...byVillage.map(v => num(v.total_loss)), 1)
    : 1;

  // 物资需求 Top
  const materialEntries = stats
    ? Object.entries(stats.materialNeeds).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];
  const maxMaterial = materialEntries.length ? materialEntries[0][1] : 1;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <ClipboardList size={20} className="text-primary" />
          灾情汇总统计
        </h2>
        <button onClick={load} className="btn-secondary h-9 px-3 text-sm flex items-center gap-1.5">
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      {error && (
        <div className="text-sm text-warn-red bg-warn-red/10 px-3 py-2 rounded-btn">{error}</div>
      )}

      {loading ? (
        <Loading text="加载灾情数据..." />
      ) : (
        <>
          {/* 顶部统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="总损失金额"
              value={money(totalLoss)}
              unit="元"
              color="#E62020"
              icon={<TrendingDown size={24} />}
            />
            <StatCard
              title="受灾户数"
              value={households}
              unit="户"
              color="#F57C00"
              icon={<Home size={24} />}
            />
            <StatCard
              title="种植业损失"
              value={money(cropLoss)}
              unit="元"
              color="#1976D2"
              icon={<Sprout size={24} />}
            />
            <StatCard
              title="养殖业损失"
              value={money(livestockLoss)}
              unit="元"
              color="#27AE60"
              icon={<Beef size={24} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 按村损失柱状图 */}
            <div className="card p-4 lg:col-span-2">
              <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-accent" />
                各村组损失分布
              </h3>
              {byVillage.length === 0 ? (
                <EmptyState text="暂无各村损失数据" icon={<BarChart3 size={32} />} />
              ) : (
                <div className="space-y-3">
                  {byVillage.map((v, i) => {
                    const loss = num(v.total_loss);
                    const pct = (loss / maxVillageLoss) * 100;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-ink font-medium flex items-center gap-1">
                            <MapPin size={11} className="text-ink-sub" />
                            {v.village_name}
                            <span className="text-ink-sub">（{v.records} 条记录）</span>
                          </span>
                          <span className="text-warn-red font-bold">{money(loss)} 元</span>
                        </div>
                        <div className="h-5 rounded-btn bg-bg overflow-hidden flex">
                          {/* 种植业部分 */}
                          <div
                            className="h-full bg-accent transition-all"
                            style={{ width: `${(num(v.crop_loss) / maxVillageLoss) * 100}%` }}
                            title={`种植业: ${money(num(v.crop_loss))} 元`}
                          />
                          {/* 养殖业部分 */}
                          <div
                            className="h-full bg-safe transition-all"
                            style={{ width: `${(num(v.livestock_loss) / maxVillageLoss) * 100}%` }}
                            title={`养殖业: ${money(num(v.livestock_loss))} 元`}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 text-xs text-ink-sub pt-1 border-t border-border">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-accent inline-block" /> 种植业
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-safe inline-block" /> 养殖业
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 物资需求汇总 */}
            <div className="card p-4">
              <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                <Package size={16} className="text-warn-orange" />
                物资需求汇总
              </h3>
              {materialEntries.length === 0 ? (
                <EmptyState text="暂无物资需求数据" icon={<Package size={32} />} />
              ) : (
                <div className="space-y-2.5">
                  {materialEntries.map(([name, count]) => (
                    <div key={name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-ink">{name}</span>
                        <span className="text-ink-sub font-medium">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-bg overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warn-orange"
                          style={{ width: `${(count / maxMaterial) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 农业灾情记录表 */}
          <div className="card p-4">
            <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
              <Sprout size={16} className="text-safe" />
              近期农业灾情记录
            </h3>
            {records.length === 0 ? (
              <EmptyState text="暂无农业灾情记录" icon={<Sprout size={32} />} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-sub border-b border-border">
                      <th className="py-2 px-2">户主</th>
                      <th className="py-2 px-2">村组</th>
                      <th className="py-2 px-2">种植业</th>
                      <th className="py-2 px-2">养殖业</th>
                      <th className="py-2 px-2">损失(元)</th>
                      <th className="py-2 px-2">登记时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} className="border-b border-border hover:bg-bg">
                        <td className="py-2 px-2 font-medium text-ink">{r.villager_name}</td>
                        <td className="py-2 px-2 text-ink-sub">{r.village_name || '-'}</td>
                        <td className="py-2 px-2 text-ink-sub text-xs">
                          {r.crop_type ? (
                            <>
                              {r.crop_type}
                              {r.crop_area ? ` ${r.crop_area}亩` : ''}
                              {r.crop_damage ? ` · ${r.crop_damage}` : ''}
                            </>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-2 text-ink-sub text-xs">
                          {r.livestock_type ? (
                            <>
                              {r.livestock_type}
                              {r.livestock_dead != null ? ` 死亡${r.livestock_dead}` : ''}
                            </>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-2 text-warn-red font-medium">
                          {money(num(r.crop_loss) + num(r.livestock_loss))}
                        </td>
                        <td className="py-2 px-2 text-ink-sub text-xs">
                          {r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
