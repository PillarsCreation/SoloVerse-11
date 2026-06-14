/**
 * 共享UI组件库
 */
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { WarningLevel, InjuryLevel, SafetyStatus } from '@/types';
import { WARNING_CONFIG, INJURY_CONFIG, SAFETY_STATUS_CONFIG } from '@/types';

// ===== 预警徽章 =====
export function WarningBadge({ level, size = 'md' }: { level: WarningLevel; size?: 'sm' | 'md' }) {
  const cfg = WARNING_CONFIG[level];
  return (
    <span
      className={cn('tag font-bold', cfg.bg, cfg.text, size === 'sm' ? 'text-[10px]' : 'text-xs')}
      style={{ minWidth: size === 'sm' ? 36 : 48, justifyContent: 'center' }}
    >
      {cfg.label}
    </span>
  );
}

// ===== 伤情徽章 =====
export function InjuryBadge({ level }: { level: InjuryLevel }) {
  const cfg = INJURY_CONFIG[level];
  return (
    <span className="tag" style={{ backgroundColor: cfg.color, color: '#fff' }}>
      {cfg.label}
    </span>
  );
}

// ===== 安全状态徽章 =====
export function StatusBadge({ status }: { status: SafetyStatus }) {
  const cfg = SAFETY_STATUS_CONFIG[status];
  return (
    <span className="tag" style={{ backgroundColor: cfg.color, color: '#fff' }}>
      {cfg.label}
    </span>
  );
}

// ===== 数据卡片 =====
export function StatCard({
  title, value, unit, color, icon,
}: {
  title: string; value: string | number; unit?: string; color?: string; icon?: ReactNode;
}) {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <div className="text-xs text-ink-sub mb-1">{title}</div>
        <div className="text-2xl font-bold" style={{ color: color || '#1D2129' }}>
          {value}
          {unit && <span className="text-sm font-normal text-ink-sub ml-1">{unit}</span>}
        </div>
      </div>
      {icon && <div className="text-3xl opacity-80">{icon}</div>}
    </div>
  );
}

// ===== 加载状态 =====
export function Loading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mr-3" />
      <span className="text-ink-sub">{text}</span>
    </div>
  );
}

// ===== 空状态 =====
export function EmptyState({ text = '暂无数据', icon }: { text?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-ink-sub">
      {icon && <div className="text-4xl mb-3 opacity-40">{icon}</div>}
      <span className="text-sm">{text}</span>
    </div>
  );
}

// ===== 风险等级条 =====
export function RiskBar({ score, level }: { score: number; level: WarningLevel }) {
  const cfg = WARNING_CONFIG[level];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-bg overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: cfg.color }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color: cfg.color }}>{score}</span>
    </div>
  );
}
