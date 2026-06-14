/**
 * 农业灾情登记 - PC端
 * 顶部汇总统计 + 左侧表单(60%) + 右侧近期记录
 */
import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  DollarSign, Users, Sprout, Beef, Save, Loader2, CheckCircle2, AlertCircle, FileText,
} from 'lucide-react';
import { agricultureApi, geoApi } from '@/lib/api';
import type { AgricultureRecord, Village } from '@/types';
import { StatCard, Loading } from '@/components/ui';

const DAMAGE_DEGREES = ['轻度', '中度', '重度', '全部损毁'];

interface FormState {
  villager_name: string;
  village_id: string;
  crop_type: string;
  crop_area: string;
  crop_degree: string;
  crop_loss: string;
  facility_note: string;
  livestock_type: string;
  livestock_original: string;
  livestock_dead: string;
  barn_damage: string;
  livestock_loss: string;
}

const EMPTY_FORM: FormState = {
  villager_name: '',
  village_id: '',
  crop_type: '',
  crop_area: '',
  crop_degree: '',
  crop_loss: '',
  facility_note: '',
  livestock_type: '',
  livestock_original: '',
  livestock_dead: '',
  barn_damage: '',
  livestock_loss: '',
};

interface Summary {
  totalLoss?: number;
  affectedHouseholds?: number;
  cropLoss?: number;
  livestockLoss?: number;
  totalRecords?: number;
  [key: string]: unknown;
}

function formatTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function num(v: string): number | undefined {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export default function AgricultureForm() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<AgricultureRecord[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const loadMeta = useCallback(() => {
    setLoadingMeta(true);
    Promise.all([
      geoApi.villages().catch(() => [] as Village[]),
      agricultureApi.summary().catch(() => ({ summary: {} as Record<string, number>, byVillage: [] })),
      agricultureApi.records({ page: 1, pageSize: 5 }).catch(() => [] as AgricultureRecord[]),
    ]).then(([v, s, r]) => {
      setVillages(v);
      setSummary(s.summary as unknown as Summary);
      setRecent(r);
    }).finally(() => setLoadingMeta(false));
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = (): string | null => {
    if (!form.villager_name.trim()) return '请填写村民姓名';
    if (!form.village_id) return '请选择村组';
    const hasCrop = form.crop_type.trim() || form.crop_area || form.crop_loss;
    const hasLivestock = form.livestock_type.trim() || form.livestock_original || form.livestock_dead || form.livestock_loss;
    if (!hasCrop && !hasLivestock) return '请至少填写一项种植业或养殖业损失';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setToast({ type: 'err', msg: err });
      return;
    }
    setSubmitting(true);
    setToast(null);
    try {
      const cropDamage = [form.crop_degree, form.facility_note.trim()]
        .filter(Boolean)
        .join('；');
      const payload: Record<string, unknown> = {
        villagerName: form.villager_name.trim(),
        villageId: form.village_id,
        cropType: form.crop_type.trim() || undefined,
        cropArea: num(form.crop_area),
        cropDamage: cropDamage || undefined,
        cropLoss: num(form.crop_loss),
        livestockType: form.livestock_type.trim() || undefined,
        livestockOriginal: num(form.livestock_original),
        livestockDead: num(form.livestock_dead),
        barnDamage: form.barn_damage.trim() || undefined,
        livestockLoss: num(form.livestock_loss),
      };
      await agricultureApi.create(payload);
      setToast({ type: 'ok', msg: '灾情登记成功' });
      setForm(EMPTY_FORM);
      loadMeta();
    } catch (e) {
      setToast({ type: 'err', msg: e instanceof Error ? e.message : '提交失败' });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const totalLoss = (summary?.total_loss as number) ?? (summary?.totalLoss as number) ?? 0;
  const households = (summary?.affected_households as number) ?? (summary?.affectedHouseholds as number) ?? (summary?.total_records as number) ?? 0;
  const cropLoss = (summary?.total_crop_loss as number) ?? (summary?.cropLoss as number) ?? 0;
  const livestockLoss = (summary?.total_livestock_loss as number) ?? (summary?.livestockLoss as number) ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* 顶部汇总 */}
      <div>
        <h1 className="text-lg font-bold text-ink mb-3">灾情登记</h1>
        {loadingMeta ? (
          <Loading text="加载统计数据..." />
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              title="总损失金额"
              value={totalLoss.toLocaleString()}
              unit="元"
              color="#E62020"
              icon={<DollarSign size={28} />}
            />
            <StatCard
              title="受灾户数"
              value={households}
              unit="户"
              color="#005288"
              icon={<Users size={28} />}
            />
            <StatCard
              title="种植业损失"
              value={cropLoss.toLocaleString()}
              unit="元"
              color="#F57C00"
              icon={<Sprout size={28} />}
            />
            <StatCard
              title="养殖业损失"
              value={livestockLoss.toLocaleString()}
              unit="元"
              color="#1976D2"
              icon={<Beef size={28} />}
            />
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* 左侧表单 60% */}
        <div className="w-3/5 space-y-4">
          {/* 村民信息 */}
          <div className="card p-5">
            <SectionHeader index={1} title="村民信息" />
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Field label="姓名" required>
                <input
                  className="input-field"
                  placeholder="请输入村民姓名"
                  value={form.villager_name}
                  onChange={(e) => set('villager_name', e.target.value)}
                />
              </Field>
              <Field label="村组" required>
                <select
                  className="input-field"
                  value={form.village_id}
                  onChange={(e) => set('village_id', e.target.value)}
                >
                  <option value="">请选择村组</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}（{v.township}）
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* 种植业损失 */}
          <div className="card p-5">
            <SectionHeader index={2} title="种植业损失" color="#F57C00" />
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Field label="作物类型">
                <input
                  className="input-field"
                  placeholder="如：水稻、玉米"
                  value={form.crop_type}
                  onChange={(e) => set('crop_type', e.target.value)}
                />
              </Field>
              <Field label="受灾亩数（亩）">
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="0"
                  value={form.crop_area}
                  onChange={(e) => set('crop_area', e.target.value)}
                />
              </Field>
              <Field label="损毁程度">
                <select
                  className="input-field"
                  value={form.crop_degree}
                  onChange={(e) => set('crop_degree', e.target.value)}
                >
                  <option value="">请选择</option>
                  {DAMAGE_DEGREES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="预估经济损失（元）">
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="0"
                  value={form.crop_loss}
                  onChange={(e) => set('crop_loss', e.target.value)}
                />
              </Field>
              <div className="col-span-2">
                <Field label="设施损毁说明">
                  <textarea
                    className="input-field min-h-[72px] py-2 resize-y"
                    placeholder="大棚、灌溉设施等损毁情况"
                    value={form.facility_note}
                    onChange={(e) => set('facility_note', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* 养殖业损失 */}
          <div className="card p-5">
            <SectionHeader index={3} title="养殖业损失" color="#1976D2" />
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Field label="养殖品类">
                <input
                  className="input-field"
                  placeholder="如：生猪、家禽"
                  value={form.livestock_type}
                  onChange={(e) => set('livestock_type', e.target.value)}
                />
              </Field>
              <Field label="原有存栏量（头/只）">
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="0"
                  value={form.livestock_original}
                  onChange={(e) => set('livestock_original', e.target.value)}
                />
              </Field>
              <Field label="死亡走失数量（头/只）">
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="0"
                  value={form.livestock_dead}
                  onChange={(e) => set('livestock_dead', e.target.value)}
                />
              </Field>
              <Field label="预估经济损失（元）">
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="0"
                  value={form.livestock_loss}
                  onChange={(e) => set('livestock_loss', e.target.value)}
                />
              </Field>
              <div className="col-span-2">
                <Field label="圈舍损毁说明">
                  <textarea
                    className="input-field min-h-[72px] py-2 resize-y"
                    placeholder="圈舍倒塌、损毁面积等"
                    value={form.barn_damage}
                    onChange={(e) => set('barn_damage', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              提交登记
            </button>
            <button
              onClick={() => { setForm(EMPTY_FORM); setToast(null); }}
              className="btn-secondary"
            >
              重置
            </button>
          </div>
        </div>

        {/* 右侧近期记录 */}
        <div className="w-2/5">
          <div className="card p-5 sticky top-20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileText size={16} className="text-primary" />
                近期登记记录
              </div>
              <span className="tag bg-bg text-ink-sub">最新 5 条</span>
            </div>
            {recent.length === 0 ? (
              <div className="text-center text-ink-sub text-sm py-8">暂无登记记录</div>
            ) : (
              <ul className="space-y-2">
                {recent.map((r) => {
                  const total = (r.crop_loss || 0) + (r.livestock_loss || 0);
                  return (
                    <li key={r.id} className="border border-border rounded-btn p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{r.villager_name}</span>
                        <span className="text-warn-red font-bold">{total.toLocaleString()} 元</span>
                      </div>
                      <div className="text-xs text-ink-sub mt-1 space-y-0.5">
                        <div>{r.village_name || '-'} · {formatTime(r.created_at)}</div>
                        {r.crop_type && <div>种植：{r.crop_type} {r.crop_area ? `· ${r.crop_area}亩` : ''}</div>}
                        {r.livestock_type && <div>养殖：{r.livestock_type} {r.livestock_dead != null ? `· 亡${r.livestock_dead}` : ''}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 card px-4 py-3 flex items-center gap-2 shadow-card-lg ${
            toast.type === 'ok' ? 'text-safe' : 'text-warn-red'
          }`}
        >
          {toast.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ index, title, color = '#005288' }: { index: number; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
        style={{ backgroundColor: color }}
      >
        {index}
      </span>
      <span className="font-bold text-sm" style={{ color }}>{title}</span>
    </div>
  );
}

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-ink-sub mb-1">
        {label}
        {required && <span className="text-warn-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
