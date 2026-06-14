/**
 * 村民端 - 伤情/物资上报
 * 伤情等级选择 + 物资需求多选 + 定位 + 提交
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, LocateFixed, Loader2, AlertCircle, MapPin, Package,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { personnelApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { INJURY_CONFIG } from '@/types';
import type { InjuryLevel } from '@/types';
import { cn } from '@/lib/utils';

const INJURY_OPTIONS: InjuryLevel[] = ['none', 'minor', 'severe'];
const MATERIAL_OPTIONS = ['急救药品', '饮用水', '食品', '保暖物资', '其他'];
type GeoStatus = 'idle' | 'loading' | 'error' | 'ok';

export default function VillagerReport() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const villageId = user?.villageId;

  const [injury, setInjury] = useState<InjuryLevel>('none');
  const [materials, setMaterials] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const submittedRef = useRef(false);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude });
        setGeoStatus('ok');
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const toggleMaterial = (m: string) => {
    setMaterials((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const handleSubmit = async () => {
    if (submittedRef.current || submitting) return;
    setError('');
    if (!villageId) {
      setError('未绑定村组信息');
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await personnelApi.report({
        userId: user?.id,
        injuryLevel: injury,
        materialNeeds: materials.join(','),
        lng: coords?.lng,
        lat: coords?.lat,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // 提交成功状态
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 animate-fade-in text-center">
        <CheckCircle2 className="w-16 h-16 text-safe" />
        <div className="text-lg font-bold mt-3 text-ink">上报成功</div>
        <div className="text-sm text-ink-sub mt-1">
          您的信息已上报，救援人员将尽快响应。
        </div>
        <button
          onClick={() => navigate('/villager')}
          className="mt-5 h-11 px-8 rounded-btn bg-primary text-white font-bold active:scale-95 transition-transform"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="text-base font-bold text-ink px-1">伤情 / 物资上报</div>

      {/* 伤情等级选择 */}
      <div className="card p-3">
        <div className="text-sm font-bold text-ink mb-2">伤情等级</div>
        <div className="grid grid-cols-3 gap-2">
          {INJURY_OPTIONS.map((level) => {
            const cfg = INJURY_CONFIG[level];
            const selected = injury === level;
            return (
              <button
                key={level}
                onClick={() => setInjury(level)}
                className={cn(
                  'h-16 rounded-btn flex flex-col items-center justify-center gap-1 text-white font-bold text-sm transition-all active:scale-95',
                  selected ? 'shadow-card-lg' : 'opacity-60'
                )}
                style={{
                  backgroundColor: cfg.color,
                  outline: selected ? `3px solid ${cfg.color}` : 'none',
                  outlineOffset: '2px',
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 物资需求多选 */}
      <div className="card p-3">
        <div className="text-sm font-bold text-ink mb-2 flex items-center gap-1">
          <Package className="w-4 h-4 text-accent" /> 物资需求（可多选）
        </div>
        <div className="flex flex-wrap gap-2">
          {MATERIAL_OPTIONS.map((m) => {
            const selected = materials.includes(m);
            return (
              <button
                key={m}
                onClick={() => toggleMaterial(m)}
                className={cn(
                  'h-9 px-4 rounded-btn text-sm font-medium transition-all active:scale-95',
                  selected
                    ? 'bg-accent text-white shadow-card'
                    : 'bg-bg text-ink-sub border border-border'
                )}
              >
                {selected ? '✓ ' : ''}
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* GPS 定位 */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-ink flex items-center gap-1">
            <MapPin className="w-4 h-4 text-primary" /> 当前定位
          </span>
          <button
            onClick={getLocation}
            className="text-xs text-accent flex items-center gap-1 active:opacity-70"
          >
            <LocateFixed className="w-3.5 h-3.5" /> 重新定位
          </button>
        </div>
        {geoStatus === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-ink-sub">
            <Loader2 className="w-4 h-4 animate-spin" /> 正在获取定位...
          </div>
        )}
        {geoStatus === 'error' && (
          <div className="flex items-center gap-2 text-sm text-warn-red">
            <AlertCircle className="w-4 h-4" /> 定位失败，可仍提交（无坐标）
          </div>
        )}
        {geoStatus === 'ok' && coords && (
          <div className="text-xs text-ink-sub font-mono bg-bg rounded-btn px-3 py-2">
            经度：{coords.lng.toFixed(6)}，纬度：{coords.lat.toFixed(6)}
          </div>
        )}
        {geoStatus === 'idle' && (
          <div className="text-xs text-ink-sub">点击右上角获取定位</div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-warn-red bg-warn-red/10 rounded-btn px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={cn(
          'w-full h-14 rounded-btn bg-accent text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform',
          submitting && 'opacity-70'
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> 提交中...
          </>
        ) : (
          '确认上报'
        )}
      </button>
    </div>
  );
}
