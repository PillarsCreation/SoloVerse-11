/**
 * 预警发布中心 - 八步模型链推演逐步显现 + 预警发布 + 可编辑文案
 */
import { useEffect, useState } from 'react';
import {
  CloudRain, Waves, GitBranch, Droplets, ShieldAlert, Siren,
  UserCheck, RefreshCw, Play, Send, AlertTriangle, MapPin, Edit3,
} from 'lucide-react';
import {
  WarningBadge, RiskBar, Loading, EmptyState,
} from '@/components/ui';
import { warningApi, geoApi } from '@/lib/api';
import type {
  Village, Warning, ModelDerivation, WarningLevel,
} from '@/types';

interface SimResult {
  derivation: ModelDerivation;
  publicText: string;
  professionalText: string;
  level: string;
  village: Village;
}

interface SimParams {
  villageId: string;
  rainfallIntensity: number;
  cumulativeRainfall: number;
  forecastRainfall: number;
  population: number;
}

const DEFAULT_PARAMS: SimParams = {
  villageId: '',
  rainfallIntensity: 35,
  cumulativeRainfall: 80,
  forecastRainfall: 120,
  population: 200,
};

export default function AdminWarning() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 可编辑的村民版文案
  const [publicTextEdit, setPublicTextEdit] = useState('');
  const [editing, setEditing] = useState(false);

  // 八步逐步显现控制
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [animating, setAnimating] = useState(false);

  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    geoApi.villages().then(v => {
      setVillages(v);
      if (v.length && !params.villageId) {
        setParams(p => ({ ...p, villageId: v[0].id }));
      }
    }).catch(() => {});
    loadWarnings();
  }, []);

  async function loadWarnings() {
    setListLoading(true);
    try {
      const list = await warningApi.list();
      setWarnings(list);
    } catch {
      setWarnings([]);
    } finally {
      setListLoading(false);
    }
  }

  function updateParam<K extends keyof SimParams>(key: K, value: SimParams[K]) {
    setParams(p => ({ ...p, [key]: value }));
  }

  async function handleSimulate() {
    if (!params.villageId) {
      setError('请先选择村组');
      return;
    }
    setSimLoading(true);
    setError('');
    setSuccess('');
    setSimResult(null);
    setVisibleSteps(0);
    try {
      const result = await warningApi.simulate(params);
      setSimResult(result);
      setPublicTextEdit(result.publicText);
      // 启动逐步显现动画
      setAnimating(true);
      animateSteps();
    } catch (err: any) {
      setError(err?.message || '推演失败');
    } finally {
      setSimLoading(false);
    }
  }

  // 八步逐步显现：每步间隔500ms
  function animateSteps() {
    setVisibleSteps(0);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setVisibleSteps(step);
      if (step >= 8) {
        clearInterval(timer);
        setAnimating(false);
      }
    }, 500);
  }

  async function handlePublish() {
    if (!params.villageId) {
      setError('请先选择村组');
      return;
    }
    setPublishLoading(true);
    setError('');
    try {
      // 使用可能被编辑后的文案
      await warningApi.publish({ ...params, customPublicText: editing ? publicTextEdit : undefined });
      setSuccess('预警已发布，村民端将实时收到通知');
      setEditing(false);
      await loadWarnings();
    } catch (err: any) {
      setError(err?.message || '发布失败');
    } finally {
      setPublishLoading(false);
    }
  }

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-12 gap-4">
        {/* 左侧：推演参数表单 */}
        <div className="col-span-12 lg:col-span-4">
          <div className="card p-5">
            <h2 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
              <CloudRain size={20} className="text-primary" />
              模型链推演参数
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-ink-sub mb-1.5">目标村组</label>
                <select
                  className="input-field"
                  value={params.villageId}
                  onChange={e => updateParam('villageId', e.target.value)}
                >
                  <option value="">请选择村组</option>
                  {villages.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}（{v.township}）
                    </option>
                  ))}
                </select>
              </div>
              <NumberInput
                label="降雨强度 (mm/h)"
                value={params.rainfallIntensity}
                onChange={v => updateParam('rainfallIntensity', v)}
              />
              <NumberInput
                label="累计降雨量 (mm)"
                value={params.cumulativeRainfall}
                onChange={v => updateParam('cumulativeRainfall', v)}
              />
              <NumberInput
                label="预报降雨量 (mm)"
                value={params.forecastRainfall}
                onChange={v => updateParam('forecastRainfall', v)}
              />
              <NumberInput
                label="影响人口 (人)"
                value={params.population}
                onChange={v => updateParam('population', v)}
              />

              <button
                onClick={handleSimulate}
                disabled={simLoading}
                className="btn-accent w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {simLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    推演中...
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    推演预览
                  </>
                )}
              </button>

              {(error || success) && (
                <div className={`text-sm px-3 py-2.5 rounded-btn flex items-center gap-1.5 ${
                  error ? 'bg-warn-red/10 text-warn-red' : 'bg-safe/10 text-safe'
                }`}>
                  <AlertTriangle size={16} />
                  {error || success}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：推演结果 */}
        <div className="col-span-12 lg:col-span-8">
          {simLoading ? (
            <div className="card p-5"><Loading text="正在进行八步模型链推演..." /></div>
          ) : !simResult ? (
            <div className="card p-5">
              <EmptyState
                text="填写降雨参数并点击「推演预览」查看模型链结果"
                icon={<CloudRain size={40} />}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 风险等级概览 */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <ShieldAlert size={20} className="text-warn-red" />
                    风险评估结论
                  </h3>
                  <WarningBadge level={simResult.level as WarningLevel} />
                </div>
                <div className="mb-1.5 text-sm text-ink-sub flex items-center gap-2">
                  <MapPin size={14} />
                  {simResult.village.name} · {simResult.village.township}
                </div>
                <RiskBar
                  score={Math.round(simResult.derivation.riskAssessment.riskScore)}
                  level={simResult.derivation.riskAssessment.level}
                />
                <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                  <MetricBox label="危险性" value={simResult.derivation.riskAssessment.hazard.toFixed(1)} />
                  <MetricBox label="暴露度" value={simResult.derivation.riskAssessment.exposure.toFixed(1)} />
                  <MetricBox label="脆弱性" value={simResult.derivation.riskAssessment.vulnerability.toFixed(1)} />
                </div>
              </div>

              {/* 八步模型链 - 逐步显现 */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <GitBranch size={20} className="text-primary" />
                    八步模型链推演
                  </h3>
                  {visibleSteps >= 8 && !animating && (
                    <button
                      onClick={animateSteps}
                      className="text-xs text-accent flex items-center gap-1 hover:opacity-70"
                    >
                      <RefreshCw size={12} /> 推演结论
                    </button>
                  )}
                </div>
                <ModelChain
                  derivation={simResult.derivation}
                  visibleSteps={visibleSteps}
                />
              </div>

              {/* 双版本文案 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 村民通俗版 - 可编辑 */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-ink flex items-center gap-1.5">
                      <UserCheck size={16} className="text-safe" />
                      村民通俗版文案
                    </h4>
                    <button
                      onClick={() => setEditing(!editing)}
                      className={`text-xs flex items-center gap-1 px-2 py-1 rounded-btn transition-colors ${
                        editing ? 'bg-accent text-white' : 'text-accent hover:bg-accent/10'
                      }`}
                    >
                      <Edit3 size={12} />
                      {editing ? '完成编辑' : '编辑文案'}
                    </button>
                  </div>
                  {editing ? (
                    <textarea
                      className="input-field min-h-[180px] py-2.5 resize-y text-sm leading-relaxed"
                      value={publicTextEdit}
                      onChange={e => setPublicTextEdit(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-ink-sub leading-relaxed whitespace-pre-wrap bg-bg p-3 rounded-btn">
                      {publicTextEdit || simResult.publicText}
                    </p>
                  )}
                </div>

                {/* 专业溯源版 - 统一字体 */}
                <div className="card p-5">
                  <h4 className="text-sm font-bold text-ink mb-3 flex items-center gap-1.5">
                    <Siren size={16} className="text-warn-orange" />
                    专业溯源版文案
                  </h4>
                  <p className="text-sm text-ink-sub leading-relaxed whitespace-pre-wrap bg-bg p-3 rounded-btn">
                    {simResult.professionalText}
                  </p>
                </div>
              </div>

              <button
                onClick={handlePublish}
                disabled={publishLoading}
                className="btn-danger w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {publishLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    发布预警
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 预警列表 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <AlertTriangle size={20} className="text-warn-orange" />
            预警记录 ({warnings.length})
          </h3>
          <button
            onClick={loadWarnings}
            className="btn-secondary h-9 px-3 text-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            刷新
          </button>
        </div>
        {listLoading ? (
          <Loading text="加载预警列表..." />
        ) : warnings.length === 0 ? (
          <EmptyState text="暂无预警记录" icon={<AlertTriangle size={32} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-sm text-ink-sub border-b border-border">
                  <th className="py-2.5 px-3">等级</th>
                  <th className="py-2.5 px-3">标题</th>
                  <th className="py-2.5 px-3">村组</th>
                  <th className="py-2.5 px-3">发布时间</th>
                  <th className="py-2.5 px-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {warnings.map(w => (
                  <tr key={w.id} className="border-b border-border hover:bg-bg">
                    <td className="py-2.5 px-3"><WarningBadge level={w.level} size="sm" /></td>
                    <td className="py-2.5 px-3 text-ink font-medium">{w.title}</td>
                    <td className="py-2.5 px-3 text-ink-sub">{w.village_name || '-'}</td>
                    <td className="py-2.5 px-3 text-ink-sub text-sm">
                      {w.publish_time ? new Date(w.publish_time).toLocaleString('zh-CN') : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`tag ${
                        w.status === 'active'
                          ? 'bg-safe/10 text-safe'
                          : 'bg-bg text-ink-sub'
                      }`}>
                        {w.status === 'active' ? '生效中' : w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 数字输入 =====
function NumberInput({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm text-ink-sub mb-1.5">{label}</label>
      <input
        type="number"
        className="input-field"
        value={value}
        onChange={e => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

// ===== 指标小盒子 =====
function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg rounded-btn p-3 text-center">
      <div className="text-sm text-ink-sub">{label}</div>
      <div className="text-lg font-bold text-ink mt-1">{value}</div>
    </div>
  );
}

// ===== 八步模型链 - 逐步显现 =====
function ModelChain({
  derivation, visibleSteps,
}: { derivation: ModelDerivation; visibleSteps: number }) {
  const steps = [
    {
      icon: <CloudRain size={18} />, title: '① 降雨输入', color: '#1976D2',
      lines: [
        `强度: ${derivation.rainfall.intensity} mm/h`,
        `累计: ${derivation.rainfall.cumulative} mm`,
        `预报: ${derivation.rainfall.forecast} mm`,
        `来源: ${derivation.rainfall.dataSource}`,
      ],
    },
    {
      icon: <Waves size={18} />, title: '② 产流计算', color: '#2E7DFF',
      lines: [
        `CN 值: ${derivation.runoff.curveNumber}`,
        `洪峰流量: ${derivation.runoff.peakFlow} m³/s`,
        `汇流时间: ${derivation.runoff.convergenceTime} min`,
        `产流时刻: ${derivation.runoff.yieldTime} min`,
      ],
    },
    {
      icon: <GitBranch size={18} />, title: '③ 河道汇流', color: '#0070B8',
      lines: [
        `洪峰到达: ${derivation.channelRouting.peakArrivalTime} min`,
        `洪峰流速: ${derivation.channelRouting.peakVelocity} m/s`,
        `断面数: ${derivation.channelRouting.sections.length}`,
      ],
    },
    {
      icon: <Droplets size={18} />, title: '④ 溃决淹没', color: '#F57C00',
      lines: [
        `淹没面积: ${derivation.inundation.area} km²`,
        `最大水深: ${derivation.inundation.maxDepth} m`,
        `水深分布: ${derivation.inundation.depthDistribution}`,
      ],
    },
    {
      icon: <ShieldAlert size={18} />, title: '⑤ 风险评估', color: '#FBC000',
      lines: [
        `危险性: ${derivation.riskAssessment.hazard}`,
        `暴露度: ${derivation.riskAssessment.exposure}`,
        `脆弱性: ${derivation.riskAssessment.vulnerability}`,
        `风险分: ${derivation.riskAssessment.riskScore}`,
      ],
    },
    {
      icon: <Siren size={18} />, title: '⑥ 预警等级', color: '#E62020',
      lines: [
        `等级: ${(derivation.riskAssessment.level || '').toUpperCase()}`,
        `触发阈值已突破`,
      ],
    },
    {
      icon: <UserCheck size={18} />, title: '⑦ 转移任务', color: '#27AE60',
      lines: [
        `转移人数: ${derivation.transferTask.personCount}`,
        `安置点: ${derivation.transferTask.shelterName}`,
        `负责人: ${derivation.transferTask.responsible}`,
        `路线: ${derivation.transferTask.routes.join('、')}`,
      ],
    },
    {
      icon: <RefreshCw size={18} />, title: '⑧ 反馈校正', color: '#4E5969',
      lines: [
        `模型版本: ${derivation.feedbackCorrection.modelVersion}`,
        `最近校准: ${derivation.feedbackCorrection.lastCalibrated}`,
        `精度: ${derivation.feedbackCorrection.accuracyNote}`,
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {steps.map((s, i) => {
        const isVisible = i < visibleSteps;
        return (
          <div
            key={i}
            className={`border rounded-btn p-3 transition-all duration-500 ${
              isVisible
                ? 'border-border bg-white opacity-100 translate-y-0'
                : 'border-transparent bg-bg/30 opacity-0 translate-y-4'
            }`}
            style={{ minHeight: '110px' }}
          >
            {isVisible && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-7 h-7 rounded flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.icon}
                  </span>
                  <span className="text-sm font-bold text-ink">{s.title}</span>
                </div>
                <div className="space-y-1">
                  {s.lines.map((l, j) => (
                    <div key={j} className="text-xs text-ink-sub leading-snug">{l}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
