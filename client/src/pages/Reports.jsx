import { useCallback, useState, useEffect } from 'react';
import { getBranches, getReportsSummary } from '../api';
import { subscribeToBranchUpdates } from '../branchEvents';
import {
  FileSpreadsheet, ChartColumn, ArrowLeftRight,
  Download, Calendar, Building2, Loader2, ShoppingBag,
  Store, ArrowDownToLine, ArrowUpFromLine, Activity,
  RefreshCw, FileChartColumn, TrendingUp,
} from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => {
  const d = new Date();
  return { year: d.getFullYear(), month: String(d.getMonth() + 1).padStart(2, '0') };
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const emptySummary = {
  totals: { soldUnits: 0, stockIns: 0, pullOuts: 0, netMovement: 0, activeBranches: 0, reportDays: 0 },
  branchSales: [],
  categorySales: [],
  dailySales: [],
  movement: [],
  recentTransfers: [],
};

function FilterLabel({ children }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</label>;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatDateLabel(date) {
  const parts = String(date).split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
}

function maxOf(rows, field) {
  return Math.max(1, ...rows.map(row => Number(row[field] || 0)));
}

function buildSparkPath(rows, field, width = 240, height = 78) {
  if (!rows.length) return '';
  const values = rows.map(row => Number(row[field] || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return rows.map((row, index) => {
    const x = rows.length === 1 ? width : (index / (rows.length - 1)) * width;
    const y = height - 10 - ((Number(row[field] || 0) - min) / range) * (height - 22);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function KpiCard({ label, value, detail, Icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p>
        </div>
        <div className={`metric-icon ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, description, Icon, onDownload, loading, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className={`metric-icon ${colorMap[color]}`}>
            <Icon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        <button
          onClick={onDownload}
          disabled={loading}
          className="btn-primary mt-auto flex w-full items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
            : <><Download size={15} /> Download Excel</>}
        </button>
      </div>
    </div>
  );
}

function HorizontalBars({ rows, labelField, valueField, emptyText }) {
  const max = maxOf(rows, valueField);

  if (!rows.length) {
    return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="space-y-4">
      {rows.map(row => {
        const value = Number(row[valueField] || 0);
        const width = Math.max(4, (value / max) * 100);
        return (
          <div key={row[labelField]} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-slate-700">{row[labelField]}</span>
              <span className="font-black text-slate-950">{formatNumber(value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-950" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DailySalesChart({ rows }) {
  const max = maxOf(rows, 'sold');
  const path = buildSparkPath(rows, 'sold');

  if (!rows.length) {
    return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No sales recorded for this month.</div>;
  }

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 240 90" className="h-40 w-full" role="img" aria-label="Daily sold units trend">
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {rows.map((row, index) => {
          const x = rows.length === 1 ? 240 : (index / (rows.length - 1)) * 240;
          const barHeight = Math.max(4, (Number(row.sold || 0) / max) * 58);
          return (
            <rect
              key={row.date}
              x={x - 4}
              y={88 - barHeight}
              width="8"
              height={barHeight}
              rx="3"
              fill="#dbeafe"
            />
          );
        })}
      </svg>
      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-500">
        <span>{formatDateLabel(rows[0]?.date)}</span>
        <span className="text-center">{rows.length} report days</span>
        <span className="text-right">{formatDateLabel(rows[rows.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function MovementSummary({ summary }) {
  const stockIns = Number(summary.totals.stockIns || 0);
  const pullOuts = Number(summary.totals.pullOuts || 0);
  const total = Math.max(1, stockIns + pullOuts);
  const inWidth = (stockIns / total) * 100;
  const outWidth = (pullOuts / total) * 100;

  return (
    <div className="space-y-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
        <div className="bg-emerald-500" style={{ width: `${inWidth}%` }} />
        <div className="bg-amber-500" style={{ width: `${outWidth}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Stock ins</p>
          <p className="mt-1 text-xl font-black text-emerald-950">{formatNumber(stockIns)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Pull outs</p>
          <p className="mt-1 text-xl font-black text-amber-950">{formatNumber(pullOuts)}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Net movement</p>
        <p className="mt-1 text-lg font-black text-slate-950">{formatNumber(summary.totals.netMovement)} units</p>
      </div>
    </div>
  );
}

function RecentTransfers({ rows }) {
  if (!rows.length) {
    return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No stock movement recorded for this month.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="table-th">Date</th>
            <th className="table-th">Movement</th>
            <th className="table-th">Model</th>
            <th className="table-th text-right">Qty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, index) => (
            <tr key={`${row.date}-${row.model}-${index}`}>
              <td className="table-td whitespace-nowrap">{formatDateLabel(row.date)}</td>
              <td className="table-td">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${row.transfer_type === 'stock_in' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {row.transfer_type === 'stock_in' ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />}
                  {row.transfer_type === 'stock_in' ? 'Stock in' : 'Pull out'}
                </span>
              </td>
              <td className="table-td min-w-0">
                <span className="line-clamp-1 font-semibold text-slate-700">{row.model}</span>
              </td>
              <td className="table-td text-right font-black text-slate-950">{formatNumber(row.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(today());
  const { year: initYear, month: initMonth } = thisMonth();
  const [year, setYear] = useState(String(initYear));
  const [month, setMonth] = useState(initMonth);
  const [loading, setLoading] = useState({});
  const [summary, setSummary] = useState(emptySummary);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const loadBranches = useCallback(() => {
    getBranches().then(b => {
      setBranches(b);
      setBranchId(current => {
        if (current && b.some(branch => String(branch.id) === String(current))) return current;
        return b.length ? String(b[0].id) : '';
      });
    });
  }, []);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  useEffect(() => (
    subscribeToBranchUpdates(loadBranches)
  ), [loadBranches]);

  useEffect(() => {
    let ignore = false;
    setSummaryLoading(true);
    setSummaryError('');

    getReportsSummary(year, parseInt(month, 10))
      .then(data => {
        if (!ignore) setSummary({ ...emptySummary, ...data, totals: { ...emptySummary.totals, ...data.totals } });
      })
      .catch(err => {
        if (!ignore) setSummaryError(err.response?.data?.error || 'Failed to load report analytics');
      })
      .finally(() => {
        if (!ignore) setSummaryLoading(false);
      });

    return () => { ignore = true; };
  }, [year, month]);

  const setLoadingKey = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  const download = (url, key) => {
    setLoadingKey(key, true);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setLoadingKey(key, false), 2500);
  };

  const selectedMonth = MONTH_NAMES[parseInt(month, 10) - 1];
  const topBranch = summary.branchSales[0];
  const topCategory = summary.categorySales[0];

  return (
    <div className="space-y-5">
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Monthly analytics, branch performance, and Excel exports</p>
        </div>
        <button
          type="button"
          onClick={() => getReportsSummary(year, parseInt(month, 10)).then(data => setSummary({ ...emptySummary, ...data, totals: { ...emptySummary.totals, ...data.totals } }))}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-3">
            <div className="metric-icon bg-blue-50 text-blue-600">
              <FileChartColumn size={18} />
            </div>
            <div>
              <h2 className="panel-title">Monthly Report View</h2>
              <p className="panel-subtitle">Select a period to review live local data and export the matching files</p>
            </div>
          </div>
          <div className="status-pill">
            <Calendar size={14} />
            {selectedMonth} {year}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FilterLabel>Year</FilterLabel>
                <select className="form-input" value={year} onChange={e => setYear(e.target.value)}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <FilterLabel>Month</FilterLabel>
                <select className="form-input" value={month} onChange={e => setMonth(e.target.value)}>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={String(i + 1).padStart(2, '0')}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <button
              onClick={() => download(`/api/reports/sold-units/${year}/${parseInt(month, 10)}`, 'sold')}
              disabled={loading.sold}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {loading.sold ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Sold Units Excel
            </button>
            <button
              onClick={() => download(`/api/reports/stock-movement/${year}/${parseInt(month, 10)}`, 'stock')}
              disabled={loading.stock}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              {loading.stock ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Stock Movement Excel
            </button>
          </div>
        </div>
      </section>

      {summaryError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {summaryError}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sold units"
          value={summaryLoading ? '-' : formatNumber(summary.totals.soldUnits)}
          detail={topBranch ? `Top branch: ${topBranch.branch_name}` : 'Across all branches'}
          Icon={ShoppingBag}
          tone="emerald"
        />
        <KpiCard
          label="Stock ins"
          value={summaryLoading ? '-' : formatNumber(summary.totals.stockIns)}
          detail="Inbound units logged"
          Icon={ArrowDownToLine}
          tone="blue"
        />
        <KpiCard
          label="Pull outs"
          value={summaryLoading ? '-' : formatNumber(summary.totals.pullOuts)}
          detail={`Net movement: ${formatNumber(summary.totals.netMovement)}`}
          Icon={ArrowUpFromLine}
          tone="amber"
        />
        <KpiCard
          label="Coverage"
          value={summaryLoading ? '-' : `${summary.totals.activeBranches}/${branches.length || 0}`}
          detail={`${formatNumber(summary.totals.reportDays)} reporting days`}
          Icon={Store}
          tone="slate"
        />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Daily Sales Trend</h2>
              <p className="panel-subtitle">Sold units by date for the selected month</p>
            </div>
            <TrendingUp size={18} className="text-slate-400" />
          </div>
          {summaryLoading ? (
            <div className="flex h-40 items-center justify-center text-sm font-medium text-slate-500">
              <Loader2 size={16} className="mr-2 animate-spin" /> Loading trend
            </div>
          ) : (
            <DailySalesChart rows={summary.dailySales} />
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Stock Movement Mix</h2>
              <p className="panel-subtitle">Inbound and outbound movement composition</p>
            </div>
            <ArrowLeftRight size={18} className="text-slate-400" />
          </div>
          <MovementSummary summary={summary} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Branch Sales Ranking</h2>
              <p className="panel-subtitle">Total sold units by location</p>
            </div>
            <ChartColumn size={18} className="text-slate-400" />
          </div>
          <HorizontalBars
            rows={summary.branchSales}
            labelField="branch_name"
            valueField="sold"
            emptyText="No branch sales recorded for this month."
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Category Mix</h2>
              <p className="panel-subtitle">{topCategory ? `Leading category: ${topCategory.unit_type}` : 'Sold units grouped by product type'}</p>
            </div>
            <Activity size={18} className="text-slate-400" />
          </div>
          <HorizontalBars
            rows={summary.categorySales}
            labelField="unit_type"
            valueField="sold"
            emptyText="No category sales recorded for this month."
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Daily Inventory Export</h2>
              <p className="panel-subtitle">Branch-level morning and evening count sheet</p>
            </div>
            <FileSpreadsheet size={18} className="text-slate-400" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <FilterLabel>Branch</FilterLabel>
              <div className="relative">
                <Building2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select className="form-input pl-8" value={branchId} onChange={e => setBranchId(e.target.value)}>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <FilterLabel>Date</FilterLabel>
              <div className="relative">
                <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" className="form-input pl-8" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => download(`/api/reports/daily/${branchId}/${date}`, 'daily')}
                disabled={loading.daily || !branchId}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                {loading.daily
                  ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
                  : <><Download size={15} /> Download Daily Excel</>}
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Recent Movement</h2>
              <p className="panel-subtitle">Latest stock-in and pull-out activity</p>
            </div>
            <ArrowLeftRight size={18} className="text-slate-400" />
          </div>
          <RecentTransfers rows={summary.recentTransfers} />
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-3">
            <div className="metric-icon bg-violet-50 text-violet-600">
              <Download size={18} />
            </div>
            <div>
              <h2 className="panel-title">Report Downloads</h2>
              <p className="panel-subtitle">Export the same selected period as formatted Excel workbooks</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReportCard
            title="Sold Units Monthly"
            description={`All branches sold units for ${selectedMonth} ${year}`}
            Icon={ChartColumn}
            color="emerald"
            loading={loading.sold}
            onDownload={() => download(`/api/reports/sold-units/${year}/${parseInt(month, 10)}`, 'sold')}
          />
          <ReportCard
            title="Stock Movement Monthly"
            description={`All pull-outs and stock-ins for ${selectedMonth} ${year}`}
            Icon={ArrowLeftRight}
            color="violet"
            loading={loading.stock}
            onDownload={() => download(`/api/reports/stock-movement/${year}/${parseInt(month, 10)}`, 'stock')}
          />
        </div>
      </section>
    </div>
  );
}
