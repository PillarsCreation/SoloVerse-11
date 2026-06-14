/**
 * 农业灾情台账 - PC端
 * 筛选 + 搜索 + 表格 + 导出CSV + 分页 + 合计行
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { ReactNode, ChangeEvent } from 'react';
import {
  Download, Search, ChevronLeft, ChevronRight, BookOpen, RefreshCw, Loader2,
} from 'lucide-react';
import { agricultureApi, geoApi } from '@/lib/api';
import type { AgricultureRecord, Village } from '@/types';
import { Loading, EmptyState } from '@/components/ui';

const PAGE_SIZE = 10;

function formatTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function esc(v: unknown): string {
  const s = v == null ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export default function AgricultureLedger() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [records, setRecords] = useState<AgricultureRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [villageFilter, setVillageFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    Promise.all([
      agricultureApi.records({
        villageId: villageFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
      agricultureApi.summary(villageFilter || undefined),
    ])
      .then(([res, sum]) => {
        setRecords(res || []);
        setTotal(sum?.summary?.total_records ?? (res?.length ?? 0));
      })
      .catch(() => {
        setRecords([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [villageFilter, page]);

  useEffect(() => {
    geoApi.villages().catch(() => [] as Village[]).then(setVillages);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 关键词本地搜索（在当前页内）
  const displayRecords = useMemo(() => {
    if (!keyword.trim()) return records;
    const kw = keyword.trim().toLowerCase();
    return records.filter(
      (r) =>
        r.villager_name?.toLowerCase().includes(kw) ||
        r.crop_type?.toLowerCase().includes(kw) ||
        r.livestock_type?.toLowerCase().includes(kw)
    );
  }, [records, keyword]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 合计行（当前页）
  const totals = useMemo(() => {
    return displayRecords.reduce(
      (acc, r) => {
        acc.cropArea += r.crop_area || 0;
        acc.cropLoss += r.crop_loss || 0;
        acc.livestockDead += r.livestock_dead || 0;
        acc.livestockLoss += r.livestock_loss || 0;
        acc.total += (r.crop_loss || 0) + (r.livestock_loss || 0);
        return acc;
      },
      { cropArea: 0, cropLoss: 0, livestockDead: 0, livestockLoss: 0, total: 0 }
    );
  }, [displayRecords]);

  // 导出 CSV（导出全部筛选数据）
  const exportCSV = async () => {
    setExporting(true);
    try {
      const all = await agricultureApi.records({
        villageId: villageFilter || undefined,
        page: 1,
        pageSize: 10000,
      });
      const rows = all || [];
      const headers = [
        '序号', '姓名', '村组', '种植作物', '受灾面积(亩)', '种植损失(元)',
        '养殖品类', '死亡数量', '养殖损失(元)', '总损失(元)', '登记时间',
      ];
      const lines = rows.map((r, i) =>
        [
          i + 1,
          r.villager_name,
          r.village_name || '',
          r.crop_type || '',
          r.crop_area ?? '',
          r.crop_loss ?? '',
          r.livestock_type || '',
          r.livestock_dead ?? '',
          r.livestock_loss ?? '',
          (r.crop_loss || 0) + (r.livestock_loss || 0),
          formatTime(r.created_at),
        ].map(esc).join(',')
      );
      const csv = [headers.map(esc).join(','), ...lines].join('\r\n');
      // BOM 头确保 Excel 正确识别中文
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `灾情台账_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleVillageChange = (v: string) => {
    setVillageFilter(v);
    setPage(1);
  };

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  return (
    <div className="p-6 space-y-4">
      {/* 标题 + 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-primary" />
          <h1 className="text-lg font-bold text-ink">灾情台账</h1>
          <span className="tag bg-bg text-ink-sub">共 {total} 条</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            className="btn-secondary h-9 px-3 flex items-center gap-1 text-sm"
          >
            <RefreshCw size={14} /> 刷新
          </button>
          <button
            onClick={exportCSV}
            disabled={exporting || total === 0}
            className="btn-primary h-9 px-4 flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            导出Excel
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-sub">村组</label>
          <select
            value={villageFilter}
            onChange={(e) => handleVillageChange(e.target.value)}
            className="input-field h-9 w-44"
          >
            <option value="">全部村组</option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <label className="text-sm text-ink-sub">搜索</label>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-sub" />
            <input
              value={keyword}
              onChange={handleSearch}
              placeholder="按姓名 / 作物 / 养殖品类"
              className="input-field h-9 pl-8"
            />
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="card overflow-hidden">
        {loading ? (
          <Loading text="加载台账数据..." />
        ) : displayRecords.length === 0 ? (
          <EmptyState text="暂无灾情记录" icon={<BookOpen size={40} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg text-ink-sub text-xs">
                  <Th>序号</Th>
                  <Th>姓名</Th>
                  <Th>村组</Th>
                  <Th>种植作物</Th>
                  <Th align="right">受灾面积(亩)</Th>
                  <Th align="right">种植损失(元)</Th>
                  <Th>养殖品类</Th>
                  <Th align="right">死亡数量</Th>
                  <Th align="right">养殖损失(元)</Th>
                  <Th align="right">总损失(元)</Th>
                  <Th>登记时间</Th>
                </tr>
              </thead>
              <tbody>
                {displayRecords.map((r, i) => {
                  const totalLoss = (r.crop_loss || 0) + (r.livestock_loss || 0);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-bg/60">
                      <Td>{(page - 1) * PAGE_SIZE + i + 1}</Td>
                      <Td className="font-medium">{r.villager_name}</Td>
                      <Td>{r.village_name || '-'}</Td>
                      <Td>{r.crop_type || '-'}</Td>
                      <Td align="right">{r.crop_area != null ? r.crop_area : '-'}</Td>
                      <Td align="right">{r.crop_loss != null ? r.crop_loss.toLocaleString() : '-'}</Td>
                      <Td>{r.livestock_type || '-'}</Td>
                      <Td align="right">{r.livestock_dead != null ? r.livestock_dead : '-'}</Td>
                      <Td align="right">{r.livestock_loss != null ? r.livestock_loss.toLocaleString() : '-'}</Td>
                      <Td align="right" className="font-bold text-warn-red">
                        {totalLoss.toLocaleString()}
                      </Td>
                      <Td className="text-ink-sub text-xs whitespace-nowrap">{formatTime(r.created_at)}</Td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary/30 bg-primary/5 font-bold">
                  <Td colSpan={4}>本页合计（{displayRecords.length} 条）</Td>
                  <Td align="right">{totals.cropArea}</Td>
                  <Td align="right">{totals.cropLoss.toLocaleString()}</Td>
                  <Td></Td>
                  <Td align="right">{totals.livestockDead}</Td>
                  <Td align="right">{totals.livestockLoss.toLocaleString()}</Td>
                  <Td align="right" className="text-warn-red">{totals.total.toLocaleString()}</Td>
                  <Td></Td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 分页 */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-sub">
            第 {page} / {totalPages} 页 · 每页 {PAGE_SIZE} 条
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="btn-secondary h-8 px-3 text-xs disabled:opacity-40"
            >
              首页
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary h-8 w-8 p-0 flex items-center justify-center disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <PageNumbers page={page} totalPages={totalPages} onChange={setPage} />
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary h-8 w-8 p-0 flex items-center justify-center disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="btn-secondary h-8 px-3 text-xs disabled:opacity-40"
            >
              末页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PageNumbers({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const nums: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) nums.push(i);
  return (
    <>
      {nums.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-8 w-8 rounded-btn text-xs font-medium ${
            n === page
              ? 'bg-primary text-white'
              : 'bg-white border border-border text-ink-sub hover:bg-bg'
          }`}
        >
          {n}
        </button>
      ))}
    </>
  );
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-3 py-2.5 font-medium whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({
  children, align = 'left', colSpan, className = '',
}: { children?: ReactNode; align?: 'left' | 'right'; colSpan?: number; className?: string }) {
  return (
    <td
      colSpan={colSpan}
      className={`px-3 py-2.5 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      {children}
    </td>
  );
}
