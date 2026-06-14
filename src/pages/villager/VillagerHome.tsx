/**
 * 村民端 - 首页
 * 预警提醒 + 四个快捷操作 + 防汛避险须知
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Ambulance, LifeBuoy, Phone, AlertTriangle, ChevronRight,
  ShieldAlert, Mountain, Waves,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { warningApi } from '@/lib/api';
import { WARNING_CONFIG } from '@/types';
import type { Warning, WarningLevel } from '@/types';
import { useAuthStore } from '@/store/auth';
import { Loading } from '@/components/ui';

const LEVEL_ORDER: Record<WarningLevel, number> = { red: 4, orange: 3, yellow: 2, blue: 1 };

export default function VillagerHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const villageId = user?.villageId;
  const villageName = user?.village?.name;
  const [warning, setWarning] = useState<Warning | null>(null);
  const [loading, setLoading] = useState(true);
  const spokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!villageId) {
      setLoading(false);
      return;
    }
    warningApi
      .list({ villageId, status: 'active' })
      .then((list) => {
        if (cancelled) return;
        if (list && list.length) {
          const sorted = [...list].sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]);
          setWarning(sorted[0]);
        } else {
          setWarning(null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [villageId]);

  // 高风险（红/橙）触发语音播报
  useEffect(() => {
    if (!warning) return;
    const highRisk = warning.level === 'red' || warning.level === 'orange';
    if (highRisk && spokenRef.current !== warning.id) {
      spokenRef.current = warning.id;
      try {
        if ('speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(
            `${WARNING_CONFIG[warning.level].label}，${
              warning.village_name || villageName || ''
            }，请立即避险撤离`
          );
          utter.lang = 'zh-CN';
          utter.rate = 1;
          window.speechSynthesis.speak(utter);
        }
      } catch {
        /* 忽略语音播报异常 */
      }
    }
  }, [warning, villageName]);

  if (loading) return <Loading text="加载中..." />;

  const cfg = warning ? WARNING_CONFIG[warning.level] : null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* 预警提醒卡片 */}
      {warning && cfg ? (
        <div
          className="rounded-card overflow-hidden shadow-card-lg"
          style={{ backgroundColor: cfg.color, color: warning.level === 'yellow' ? '#1D2129' : '#fff' }}
        >
          <div className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 animate-pulse-warn flex-shrink-0" />
              <span className="font-bold text-sm">{cfg.label}</span>
            </div>
            <div className="text-base font-bold leading-snug">{warning.title}</div>
            <div className="text-xs opacity-90 mt-1">
              {warning.village_name || villageName} ·{' '}
              {new Date(warning.publish_time).toLocaleString('zh-CN')}
            </div>
            <button
              onClick={() => navigate('/villager/warning')}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold bg-white/25 px-3 py-1 rounded-btn active:scale-95 transition-transform"
            >
              查看详情 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-safe/15 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-safe" />
          </div>
          <div>
            <div className="text-sm font-bold text-ink">当前安全</div>
            <div className="text-xs text-ink-sub">您的村组暂无活跃预警</div>
          </div>
        </div>
      )}

      {/* 四个快捷操作按钮 */}
      <div className="space-y-2">
        <ActionButton
          bg="#27AE60"
          icon={<MapPin className="w-5 h-5" />}
          label="安置点登记"
          onClick={() => navigate('/villager/register')}
        />
        <ActionButton
          bg="#2E7DFF"
          icon={<Ambulance className="w-5 h-5" />}
          label="伤情/物资上报"
          onClick={() => navigate('/villager/report')}
        />
        <ActionButton
          bg="#F57C00"
          icon={<LifeBuoy className="w-5 h-5" />}
          label="救援进度追踪"
          onClick={() => navigate('/villager/rescue')}
        />
        <ActionButton
          bg="#005288"
          icon={<Phone className="w-5 h-5" />}
          label="应急电话"
          onClick={() => {
            window.location.href = 'tel:119';
          }}
        />
      </div>

      {/* 防汛避险须知 */}
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-warn-orange" />
          <span className="text-sm font-bold text-ink">防汛避险须知</span>
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
    </div>
  );
}

function ActionButton({
  bg,
  icon,
  label,
  onClick,
}: {
  bg: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full h-14 rounded-btn flex items-center gap-3 px-4 text-white font-bold text-base active:scale-[0.98] transition-transform"
      style={{ backgroundColor: bg }}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight className="w-4 h-4 opacity-80" />
    </button>
  );
}
