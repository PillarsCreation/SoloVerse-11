/**
 * 村民端 - 安置点登记
 * 表单（姓名/手机号/同行人数/拍照）+ 提交
 * 无需地理定位，直接点击登记即可
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon, Phone, Users, Camera, CheckCircle2,
  Loader2, AlertCircle, MapPin,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { personnelApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

export default function VillagerRegister() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const villageId = user?.villageId;

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [companion, setCompanion] = useState(1);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ arriveTime?: string } | null>(null);
  const [error, setError] = useState('');
  const submittedRef = useRef(false);

  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    // 防重复提交：ref 守卫 + state 双重保险
    if (submittedRef.current || submitting) return;
    setError('');
    if (!name.trim()) {
      setError('请输入姓名');
      return;
    }
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }
    if (!villageId) {
      setError('未绑定村组信息，无法登记');
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await personnelApi.register({
        userId: user?.id,
        name: name.trim(),
        phone: phone.trim(),
        villageId,
        companionCount: companion,
        photoUrl: photo,
      });
      setSuccess({ arriveTime: res.arriveTime });
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
      submittedRef.current = false; // 失败后允许重试
    } finally {
      setSubmitting(false);
    }
  };

  // 提交成功状态
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 animate-fade-in text-center">
        <CheckCircle2 className="w-16 h-16 text-safe" />
        <div className="text-lg font-bold mt-3 text-ink">登记成功</div>
        <div className="text-sm text-ink-sub mt-1">
          您已成功登记安置信息，请尽快前往安置点。
        </div>
        {success.arriveTime && (
          <div className="mt-3 card px-4 py-3 text-sm">
            <span className="text-ink-sub">登记时间：</span>
            <span className="font-bold text-primary">
              {new Date(success.arriveTime).toLocaleString('zh-CN')}
            </span>
          </div>
        )}
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
      <div className="text-base font-bold text-ink px-1">安置点登记</div>

      {/* 安置点信息卡片 */}
      <div className="card p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <MapPin className="w-4 h-4 text-primary" /> 安置点信息
        </div>
        <div className="mt-2 text-xs text-ink-sub bg-bg rounded-btn px-3 py-2">
          点击下方「确认登记」即可完成安置点登记，系统将自动记录您的信息并通知指挥部。
        </div>
      </div>

      {/* 登记表单 */}
      <div className="card p-3 space-y-3">
        <Field label="姓名" icon={<UserIcon className="w-4 h-4 text-ink-sub" />}>
          <input
            className="input-field"
            placeholder="请输入姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="手机号" icon={<Phone className="w-4 h-4 text-ink-sub" />}>
          <input
            className="input-field"
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>

        <Field label="同行人数" icon={<Users className="w-4 h-4 text-ink-sub" />}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompanion((c) => Math.max(1, c - 1))}
              className="w-9 h-9 rounded-btn bg-bg text-ink font-bold text-lg active:scale-95"
            >
              -
            </button>
            <input
              className="input-field text-center font-bold"
              type="number"
              min={1}
              value={companion}
              onChange={(e) => setCompanion(Math.max(1, Number(e.target.value) || 1))}
            />
            <button
              type="button"
              onClick={() => setCompanion((c) => c + 1)}
              className="w-9 h-9 rounded-btn bg-bg text-ink font-bold text-lg active:scale-95"
            >
              +
            </button>
          </div>
        </Field>

        <Field label="现场拍照（选填）" icon={<Camera className="w-4 h-4 text-ink-sub" />}>
          <label className="block w-24 h-24 rounded-btn border-2 border-dashed border-border bg-bg flex items-center justify-center cursor-pointer overflow-hidden active:opacity-70">
            {photo ? (
              <img src={photo} alt="现场照片" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-ink-sub">
                <Camera className="w-6 h-6" />
                <span className="text-[10px]">上传</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
          </label>
        </Field>
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
          'w-full h-14 rounded-btn bg-safe text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform',
          submitting && 'opacity-70'
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> 提交中...
          </>
        ) : (
          '确认登记'
        )}
      </button>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 text-sm text-ink-sub">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
