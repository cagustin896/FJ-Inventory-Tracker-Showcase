import { useState, useEffect, useCallback } from 'react';
import { getDashboard, getDashboardBreakdown } from '../api';
import {
  Smartphone, RefreshCw, Tablet, Package, ShoppingBag,
  ArrowDownToLine, ArrowUpFromLine, X, Sun, Moon, CalendarDays,
  ChevronRight, Store, Activity, BarChart3,
} from 'lucide-react';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const CARDS = [
  { category: 'brand_new', label: 'Brand New', field: 'brand_new', icon: Smartphone, tone: 'blue' },
  { category: 'secondhand', label: 'Secondhand', field: 'secondhand', icon: RefreshCw, tone: 'amber' },
  { category: 'android', label: 'Android', field: 'android', icon: Smartphone, tone: 'emerald' },
  { category: 'ipad_macbook', label: 'iPad & Mac', field: 'ipad_macbook', icon: Tablet, tone: 'violet' },
  { category: 'accessories', label: 'Accessories', field: 'accessories', icon: Package, tone: 'slate' },
  { category: 'sold', label: 'Sold Today', field: 'sold', icon: ShoppingBag, tone: 'red', eveningOnly: true },
  { category: 'stockins', label: 'Stock Ins', field: 'stock_ins', icon: ArrowDownToLine, tone: 'emerald', eveningOnly: true },
  { category: 'pullouts', label: 'Pull Outs', field: 'pull_outs', icon: ArrowUpFromLine, tone: 'orange', eveningOnly: true },
];

const TONES = {
  blue: { icon: 'bg-blue-50 text-blue-700', line: '#2563eb', bar: 'bg-blue-600' },
  amber: { icon: 'bg-amber-50 text-amber-700', line: '#f97316', bar: 'bg-amber-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700', line: '#16a34a', bar: 'bg-emerald-600' },
  violet: { icon: 'bg-violet-50 text-violet-700', line: '#7c3aed', bar: 'bg-violet-600' },
  slate: { icon: 'bg-slate-100 text-slate-700', line: '#64748b', bar: 'bg-slate-600' },
  red: { icon: 'bg-red-50 text-red-700', line: '#dc2626', bar: 'bg-red-600' },
  orange: { icon: 'bg-orange-50 text-orange-700', line: '#ea580c', bar: 'bg-orange-500' },
};

function chartPath(rows, field, width = 160, height = 52) {
  if (!rows?.length) return '';
  const values = rows.map(row => Number(row[field] || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = rows.length === 1 ? 0 : (index / (rows.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function TrendLine({ rows, field, color, height = 52 }) {
  const path = chartPath(rows, field, 160, height);
  const values = rows?.map(row => Number(row[field] || 0)) || [];
  const latest = values.at(-1) || 0;
  return (
    <svg viewBox={`0 0 160 ${height}`} className="h-12 w-full" role="img" aria-label={`${field} trend ending at ${latest}`}>
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {rows?.length > 0 && (
        <circle cx="160" cy={(height - 4).toString()} r="0" className="hidden" />
      )}
    </svg>
  );
}

function KPIGrid({ evening, trends }) {
  const totalEvening = evening.totals.brand_new + evening.totals.secondhand + evening.totals.android + evening.totals.ipad_macbook;
  const daily = trends?.daily || [];
  const kpis = [
    { ...CARDS[0], value: evening.totals.brand_new, trendField: 'brand_new' },
    { ...CARDS[1], value: evening.totals.secondhand, trendField: 'secondhand' },
    { ...CARDS[2], value: evening.totals.android, trendField: 'android' },
    { ...CARDS[3], value: evening.totals.ipad_macbook, trendField: 'ipad_macbook' },
    { ...CARDS[4], value: evening.totals.accessories, trendField: 'accessories' },
    { ...CARDS[5], value: evening.totals.sold, trendField: 'sold' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map(({ label, value, trendField, icon: Icon, tone }) => {
        const theme = TONES[tone];
        const previousDay = daily.length > 1 ? Number(daily[daily.length - 2][trendField] || 0) : value;
        const delta = value - previousDay;
        const deltaText = `${delta >= 0 ? '+' : ''}${delta} vs yesterday`;
        const deltaShort = `${delta >= 0 ? '+' : ''}${delta}`;
        return (
          <div key={label} className="metric-card min-h-[128px] p-3 sm:min-h-0 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className={`metric-icon h-8 w-8 sm:h-9 sm:w-9 ${theme.icon}`}>
                <Icon size={16} className="sm:h-[18px] sm:w-[18px]" />
              </div>
              <span className={`max-w-[72px] text-right text-[10px] font-bold leading-tight sm:max-w-none sm:text-xs sm:font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <span className="sm:hidden">{deltaShort}</span>
                <span className="hidden sm:inline">{deltaText}</span>
              </span>
            </div>
            <p className="mt-3 truncate text-[11px] font-bold text-slate-500 sm:mt-4 sm:text-xs sm:font-semibold">{label}</p>
            <div className="mt-1 flex items-end gap-1.5 sm:gap-2">
              <span className="text-2xl font-black leading-none text-slate-950 sm:text-3xl sm:font-bold">{value}</span>
              {label !== 'Accessories' && label !== 'Sold Today' && (
                <span className="mb-0.5 text-[10px] font-semibold text-slate-400 sm:mb-1 sm:text-xs sm:font-normal">of {totalEvening}</span>
              )}
            </div>
            <div className="mt-2 hidden sm:block">
              <TrendLine rows={daily} field={trendField} color={theme.line} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BreakdownTable({ category, rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
        <Package size={32} className="mb-2 opacity-40" />
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const columns = category === 'accessories'
    ? ['accessory', 'quantity']
    : category === 'stockins'
      ? ['unit_type', 'model', 'storage', 'color', 'from_branch', 'quantity']
      : category === 'pullouts'
        ? ['unit_type', 'model', 'storage', 'color', 'to_branch', 'quantity']
        : category === 'sold'
          ? ['unit_type', 'model', 'storage', 'color', 'quantity']
          : ['model', 'storage', 'color', 'quantity'];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          {columns.map(column => (
            <th key={column} className={`table-th ${column === 'quantity' ? 'text-right' : ''}`}>
              {column.replace('_', ' ')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
            {columns.map(column => (
              <td key={column} className={`table-td capitalize ${column === 'quantity' ? 'text-right font-bold' : ''}`}>
                {row[column] || '-'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BreakdownModal({ modal, data, loading, onClose }) {
  if (!modal) return null;
  const card = CARDS.find(c => c.category === modal.category);
  const Icon = card?.icon || Package;
  const tone = TONES[card?.tone || 'slate'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`metric-icon ${tone.icon}`}>
              <Icon size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-950">{modal.branchName}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{modal.label} / {modal.session} / {modal.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-button">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : (
            <BreakdownTable category={modal.category} rows={data} />
          )}
        </div>
      </div>
    </div>
  );
}

function BranchComparison({ data, date, onCardClick }) {
  const rows = data.evening.branches;
  const totals = data.evening.totals;
  const totalUnits = totals.brand_new + totals.secondhand + totals.android + totals.ipad_macbook;

  return (
    <div className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Branch Comparison</h2>
          <p className="panel-subtitle">Evening stock and movement by location</p>
        </div>
        <span className="status-pill">Total units {totalUnits}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              {['Branch', 'Status', 'Brand New', 'Secondhand', 'Android', 'iPad & Mac', 'Accessories', 'Sold', 'In', 'Out', ''].map(label => (
                <th key={label} className="table-th">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(branch => (
              <tr key={branch.branch_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="table-td font-semibold text-slate-950">
                  <span className="inline-flex items-center gap-2">
                    <Store size={15} className="text-blue-600" />
                    {branch.branch_name}
                  </span>
                </td>
                <td className="table-td">
                  <span className={`status-pill ${branch.has_data ? 'status-complete' : 'status-muted'}`}>
                    {branch.has_data ? 'Complete' : 'Pending'}
                  </span>
                </td>
                {['brand_new', 'secondhand', 'android', 'ipad_macbook', 'accessories', 'sold', 'stock_ins', 'pull_outs'].map(field => (
                  <td key={field} className="table-td font-semibold">{branch[field] || 0}</td>
                ))}
                <td className="table-td text-right">
                  <button
                    className="icon-button"
                    onClick={() => onCardClick({
                      branchId: branch.branch_id,
                      branchName: branch.branch_name,
                      session: 'evening',
                      category: 'brand_new',
                      label: 'Brand New',
                      date,
                    })}
                  >
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryMix({ totals }) {
  const segments = [
    ['Brand New', totals.brand_new, TONES.blue.bar],
    ['Secondhand', totals.secondhand, TONES.amber.bar],
    ['Android', totals.android, TONES.emerald.bar],
    ['iPad & Mac', totals.ipad_macbook, TONES.violet.bar],
  ];
  const total = segments.reduce((sum, [, value]) => sum + value, 0);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Inventory Mix</h2>
          <p className="panel-subtitle">Evening unit distribution</p>
        </div>
        <BarChart3 size={18} className="text-slate-400" />
      </div>
      <div className="space-y-4">
        {segments.map(([label, value, bar]) => {
          const percent = total ? Math.round((value / total) * 100) : 0;
          return (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <span className="font-semibold text-slate-950">{percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className={`h-2 rounded-full ${bar}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MovementSummary({ totals }) {
  const items = [
    { label: 'Sold Today', value: totals.sold, icon: ShoppingBag, tone: 'red' },
    { label: 'Accessories', value: totals.accessories, icon: Package, tone: 'slate' },
    { label: 'Opening Units', value: totals.brand_new + totals.secondhand + totals.android + totals.ipad_macbook, icon: Activity, tone: 'blue' },
  ];
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Daily Pulse</h2>
          <p className="panel-subtitle">Snapshot for the current showcase date</p>
        </div>
      </div>
      <div className="grid gap-3">
        {items.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-3">
            <div className="flex items-center gap-3">
              <div className={`metric-icon ${TONES[tone].icon}`}>
                <Icon size={16} />
              </div>
              <span className="text-sm font-medium text-slate-600">{label}</span>
            </div>
            <span className="text-xl font-bold text-slate-950">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DualTrendPanel({ trends }) {
  const daily = trends?.daily || [];
  const max = Math.max(1, ...daily.flatMap(row => [row.evening_units, row.sold]));
  const pointsFor = (field) => daily.map((row, index) => {
    const x = daily.length === 1 ? 0 : (index / (daily.length - 1)) * 100;
    const y = 94 - (Number(row[field] || 0) / max) * 82;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const latest = daily.at(-1) || {};

  return (
    <div className="panel lg:col-span-2">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">14-Day Inventory Velocity</h2>
          <p className="panel-subtitle">Evening stock and daily sold units from local SQLite history</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <span className="status-pill"><span className="h-2 w-2 rounded-full bg-blue-600" /> Stock {latest.evening_units || 0}</span>
          <span className="status-pill"><span className="h-2 w-2 rounded-full bg-red-600" /> Sold {latest.sold || 0}</span>
        </div>
      </div>
      <div className="pt-3">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-52 w-full sm:h-56"
          role="img"
          aria-label="14-day inventory and sales trend"
        >
          {[0, 1, 2, 3].map(index => (
            <line key={index} x1="0" x2="100" y1={14 + index * 24} y2={14 + index * 24} stroke="#e2e8f0" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={pointsFor('evening_units')} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={pointsFor('sold')} fill="none" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div
          className="mt-1 grid text-[10px] font-semibold text-slate-400 sm:text-xs"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, daily.length)}, minmax(0, 1fr))` }}
        >
          {daily.map((row, index) => (
            <span key={row.date} className={`${index === 0 ? 'text-left' : index === daily.length - 1 ? 'text-right' : 'text-center'} ${index % 2 === 1 ? 'invisible sm:visible' : ''}`}>
              {row.date.slice(5)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BranchSalesChart({ trends }) {
  const rows = trends?.branchSales || [];
  const max = Math.max(1, ...rows.map(row => row.sold));

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Sales by Branch</h2>
          <p className="panel-subtitle">Rolling 14-day sold units</p>
        </div>
        <BarChart3 size={18} className="text-slate-400" />
      </div>
      <div className="space-y-4">
        {rows.map(row => {
          const percent = Math.round((row.sold / max) * 100);
          return (
            <div key={row.branch_name}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">{row.branch_name}</span>
                <span className="font-bold text-slate-950">{row.sold}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDashboard(date)
      .then(setData)
      .catch(err => setError(err?.response?.data?.message || 'Could not load dashboard. Is the server running?'))
      .finally(() => setLoading(false));
  }, [date]);

  const handleCardClick = useCallback(async (info) => {
    setModal(info);
    setModalData(null);
    setModalLoading(true);
    try {
      const rows = await getDashboardBreakdown(info.branchId, info.date, info.session, info.category);
      setModalData(rows);
    } catch {
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => { setModal(null); setModalData(null); }, []);

  return (
    <div className="space-y-5">
      <BreakdownModal modal={modal} data={modalData} loading={modalLoading} onClose={closeModal} />

      <div className="page-toolbar">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Live inventory summary across all F&J branches</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <CalendarDays size={16} className="text-blue-600" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent outline-none" />
          </div>
          <div className="hidden sm:flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500">
              <Sun size={13} /> Morning
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
              <Moon size={13} /> Evening
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          <p className="text-sm">Loading dashboard...</p>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && data && (
        <div className="space-y-5 animate-fade-in-up">
          <KPIGrid evening={data.evening} trends={data.trends} />
          <DualTrendPanel trends={data.trends} />
          <BranchComparison data={data} date={date} onCardClick={handleCardClick} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
            <InventoryMix totals={data.evening.totals} />
            <BranchSalesChart trends={data.trends} />
            <MovementSummary totals={data.evening.totals} />
          </div>
        </div>
      )}
    </div>
  );
}
