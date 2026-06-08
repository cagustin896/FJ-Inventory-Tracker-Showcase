import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getBranches, getInventory, saveInventory,
  getSoldUnits, saveSoldUnits,
  getTransfers, saveTransfers,
  getAccessories, saveAccessories,
  getAdjustments, saveAdjustments,
  getModelSuggestions,
} from '../api';
import {
  Smartphone, RefreshCw, Tablet, Package, ShoppingBag,
  ArrowDownToLine, ArrowUpFromLine, Settings2, Plus, Minus,
  CheckCircle2, XCircle, Info, X, ChevronDown,
} from 'lucide-react';

const UNIT_TYPES = ['Brand New (iPhone)', 'Secondhand (iPhone)', 'Android', 'iPad & MacBook'];
const STORAGE_CHIPS = ['64GB', '128GB', '256GB', '512GB', '1TB'];
const PREVIEW_ROW_COUNT = 2;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const getPrevDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

const TYPE_CONFIG = {
  'Brand New (iPhone)':  { icon: Smartphone,  color: 'blue',   headerBg: 'bg-blue-600',   tabActive: 'border-blue-500 text-blue-700 bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
  'Secondhand (iPhone)': { icon: RefreshCw,   color: 'amber',  headerBg: 'bg-amber-500',   tabActive: 'border-amber-500 text-amber-700 bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
  'Android':             { icon: Smartphone,  color: 'emerald',headerBg: 'bg-emerald-600', tabActive: 'border-emerald-500 text-emerald-700 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  'iPad & MacBook':      { icon: Tablet,      color: 'purple', headerBg: 'bg-purple-600',  tabActive: 'border-purple-500 text-purple-700 bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
};

const emptyRow = (unit_type) => ({ unit_type, model: '', storage: '', color: '', quantity: 0 });
const emptyAdjustment = () => ({ unit_type: 'Brand New (iPhone)', model: '', storage: '', color: '', quantity: 0, reason: '' });
const emptyAccessory = () => ({ accessory: '', quantity: 0 });

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ type, message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const styles = type === 'success'
    ? 'bg-white border-emerald-200 text-emerald-800 shadow-emerald-100'
    : 'bg-white border-red-200 text-red-800 shadow-red-100';

  return (
    <div className={`toast shadow-lg animate-slide-in-right ${styles}`}>
      {type === 'success'
        ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
        : <XCircle size={16} className="text-red-500 shrink-0" />}
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 text-slate-400 hover:text-slate-600">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Model Autocomplete ───────────────────────────────────────────────────────

function ModelInput({ value, onChange, unitType, placeholder, onKeyDown }) {
  const [allSuggestions, setAllSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const suggestions = useMemo(() => {
    if (value.length < 1) return [];
    return allSuggestions
      .filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
      .slice(0, 6);
  }, [allSuggestions, value]);

  useEffect(() => {
    if (unitType) {
      getModelSuggestions(unitType).then(setAllSuggestions).catch(() => {});
    }
  }, [unitType]);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input
        className="form-input"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(e.target.value.length > 0); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder || 'e.g. iPhone 15 Pro'}
        autoComplete="off"
        onFocus={() => setOpen(suggestions.length > 0)}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-slate-50 last:border-0"
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quantity Stepper ─────────────────────────────────────────────────────────

function QuantityStepper({ value, onChange, min = 0, allowNegative = false }) {
  const decrement = () => {
    const next = (parseInt(value) || 0) - 1;
    if (!allowNegative && next < min) return;
    onChange(next);
  };
  const increment = () => onChange((parseInt(value) || 0) + 1);

  return (
    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white min-w-[100px]">
      <button
        type="button"
        onClick={decrement}
        className="w-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 h-8"
      >
        <Minus size={13} />
      </button>
      <input
        type="number"
        className="flex-1 text-center text-sm font-medium border-0 focus:outline-none focus:ring-0 bg-transparent py-1.5 min-w-0"
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
      />
      <button
        type="button"
        onClick={increment}
        className="w-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 h-8"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

// ─── Storage Chips ────────────────────────────────────────────────────────────

function useRowPreview(rows) {
  const [expanded, setExpanded] = useState(false);
  const canPreview = rows.length > PREVIEW_ROW_COUNT;
  const visibleRows = canPreview && !expanded ? rows.slice(0, PREVIEW_ROW_COUNT) : rows;

  useEffect(() => {
    if (!canPreview && expanded) setExpanded(false);
  }, [canPreview, expanded]);

  return {
    expanded,
    visibleRows,
    hiddenCount: Math.max(rows.length - PREVIEW_ROW_COUNT, 0),
    toggle: () => setExpanded(value => !value),
  };
}

function PreviewToggle({ expanded, hiddenCount, onToggle }) {
  if (hiddenCount <= 0) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      {expanded ? `Show only ${PREVIEW_ROW_COUNT}` : `Show ${hiddenCount} more`}
    </button>
  );
}

function StorageChips({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <input
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Storage"
      />
      <div className="flex flex-wrap gap-1">
        {STORAGE_CHIPS.map(chip => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(value === chip ? '' : chip)}
            className={`chip text-xs ${value === chip ? 'chip-active' : 'chip-inactive'}`}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Inventory Table ──────────────────────────────────────────────────────────

function InventoryTable({ unitType, rows, onChange }) {
  const cfg = TYPE_CONFIG[unitType];
  const Icon = cfg.icon;
  const preview = useRowPreview(rows);

  const updateRow = (i, field, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: field === 'quantity' ? (parseInt(val) || 0) : val };
    onChange(next);
  };
  const addRow = () => onChange([...rows, emptyRow(unitType)]);
  const removeRow = (i) => {
    const next = rows.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [emptyRow(unitType)]);
  };
  const total = rows.reduce((s, r) => s + (r.quantity || 0), 0);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className={`flex items-center justify-between px-4 py-3 ${cfg.headerBg}`}>
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-white/80" />
          <span className="font-semibold text-white text-sm">{unitType}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-xs">Total</span>
          <span className="bg-white/20 text-white font-bold text-sm px-2 py-0.5 rounded-md">{total}</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="table-th w-[35%]">Model</th>
              <th className="table-th w-[28%]">Storage</th>
              <th className="table-th w-[20%]">Color</th>
              <th className="table-th w-[12%] text-center">Qty</th>
              <th className="table-th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {preview.visibleRows.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors row-enter">
                <td className="table-td">
                  <ModelInput
                    value={row.model}
                    onChange={v => updateRow(i, 'model', v)}
                    unitType={unitType}
                    onKeyDown={e => e.key === 'Enter' && e.target.closest('tr')?.querySelector('[placeholder="Storage"]')?.focus()}
                  />
                </td>
                <td className="table-td py-1.5">
                  <StorageChips value={row.storage} onChange={v => updateRow(i, 'storage', v)} />
                </td>
                <td className="table-td">
                  <input className="form-input" value={row.color} onChange={e => updateRow(i, 'color', e.target.value)} placeholder="Color" />
                </td>
                <td className="table-td">
                  <QuantityStepper value={row.quantity} onChange={v => updateRow(i, 'quantity', v)} />
                </td>
                <td className="table-td">
                  <button onClick={() => removeRow(i)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {preview.visibleRows.map((row, i) => (
          <div key={i} className="p-3 space-y-2 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Row {i + 1}</span>
              <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
            <ModelInput value={row.model} onChange={v => updateRow(i, 'model', v)} unitType={unitType} placeholder="Model" />
            <StorageChips value={row.storage} onChange={v => updateRow(i, 'storage', v)} />
            <div className="flex gap-2">
              <input className="form-input flex-1" value={row.color} onChange={e => updateRow(i, 'color', e.target.value)} placeholder="Color" />
              <QuantityStepper value={row.quantity} onChange={v => updateRow(i, 'quantity', v)} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
        <button onClick={addRow} className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Plus size={14} /> Add Row
        </button>
        <PreviewToggle expanded={preview.expanded} hiddenCount={preview.hiddenCount} onToggle={preview.toggle} />
      </div>
    </div>
  );
}

// ─── Sold Table ───────────────────────────────────────────────────────────────

function SoldTable({ rows, onChange }) {
  const preview = useRowPreview(rows);
  const updateRow = (i, field, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: field === 'quantity' ? (parseInt(val) || 0) : val };
    onChange(next);
  };
  const addRow = () => onChange([...rows, { unit_type: 'Brand New (iPhone)', model: '', storage: '', color: '', quantity: 1 }]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-red-600">
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-white/80" />
          <span className="font-semibold text-white text-sm">Sold Units</span>
        </div>
        <span className="bg-white/20 text-white font-bold text-sm px-2 py-0.5 rounded-md">
          {rows.reduce((s, r) => s + (r.quantity || 0), 0)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="table-th">Type</th>
              <th className="table-th">Model</th>
              <th className="table-th">Storage</th>
              <th className="table-th">Color</th>
              <th className="table-th text-center">Qty</th>
              <th className="table-th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {preview.visibleRows.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors row-enter">
                <td className="table-td">
                  <select className="form-input" value={row.unit_type} onChange={e => updateRow(i, 'unit_type', e.target.value)}>
                    {UNIT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td className="table-td">
                  <ModelInput value={row.model} onChange={v => updateRow(i, 'model', v)} unitType={row.unit_type} />
                </td>
                <td className="table-td py-1.5"><StorageChips value={row.storage} onChange={v => updateRow(i, 'storage', v)} /></td>
                <td className="table-td"><input className="form-input" value={row.color} onChange={e => updateRow(i, 'color', e.target.value)} placeholder="Color" /></td>
                <td className="table-td"><QuantityStepper value={row.quantity} onChange={v => updateRow(i, 'quantity', v)} min={1} /></td>
                <td className="table-td">
                  <button onClick={() => removeRow(i)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No sold units recorded</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
        <button onClick={addRow} className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Plus size={14} /> Add Sold Unit
        </button>
        <PreviewToggle expanded={preview.expanded} hiddenCount={preview.hiddenCount} onToggle={preview.toggle} />
      </div>
    </div>
  );
}

// ─── Transfer Table ───────────────────────────────────────────────────────────

function TransferTable({ title, type, rows, onChange, branches, currentBranchId }) {
  const preview = useRowPreview(rows);
  const updateRow = (i, field, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: field === 'quantity' ? (parseInt(val) || 0) : val };
    onChange(next);
  };
  const addRow = () => {
    const newRow = {
      transfer_type: type, unit_type: 'Brand New (iPhone)',
      model: '', storage: '', color: '', quantity: 1,
      from_branch_id: null, to_branch_id: null,
      source_label: '', _sourceType: '',
    };
    if (type === 'pull_out') newRow.from_branch_id = parseInt(currentBranchId);
    if (type === 'stock_in') newRow.to_branch_id = parseInt(currentBranchId);
    onChange([...rows, newRow]);
  };
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));

  const otherBranches = branches.filter(b => b.id !== parseInt(currentBranchId));

  const handleSourceChange = (i, val) => {
    const next = [...rows];
    if (val === 'Supplier') {
      next[i] = { ...next[i], _sourceType: 'Supplier', from_branch_id: null, source_label: 'Supplier' };
    } else if (val === 'Other') {
      next[i] = { ...next[i], _sourceType: 'Other', from_branch_id: null, source_label: '' };
    } else if (val) {
      next[i] = { ...next[i], _sourceType: 'branch', from_branch_id: parseInt(val), source_label: '' };
    } else {
      next[i] = { ...next[i], _sourceType: '', from_branch_id: null, source_label: '' };
    }
    onChange(next);
  };

  const getDropdownValue = (row) => {
    if (row._sourceType === 'Supplier') return 'Supplier';
    if (row._sourceType === 'Other') return 'Other';
    if (row._sourceType === 'branch' && row.from_branch_id) return String(row.from_branch_id);
    return '';
  };

  const isTransferOut = type === 'pull_out';
  const Icon = isTransferOut ? ArrowUpFromLine : ArrowDownToLine;
  const headerBg = isTransferOut ? 'bg-orange-500' : 'bg-indigo-600';

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className={`flex items-center justify-between px-4 py-3 ${headerBg}`}>
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-white/80" />
          <span className="font-semibold text-white text-sm">{title}</span>
        </div>
        <span className="bg-white/20 text-white font-bold text-sm px-2 py-0.5 rounded-md">
          {rows.reduce((s, r) => s + (r.quantity || 0), 0)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="table-th">{isTransferOut ? 'To Branch' : 'Source'}</th>
              <th className="table-th">Type</th>
              <th className="table-th">Model</th>
              <th className="table-th">Storage</th>
              <th className="table-th">Color</th>
              <th className="table-th text-center">Qty</th>
              <th className="table-th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {preview.visibleRows.map((row, i) => (
              <Fragment key={i}>
                <tr key={`r-${i}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors row-enter">
                  <td className="table-td">
                    {isTransferOut ? (
                      <select className="form-input" value={row.to_branch_id || ''} onChange={e => updateRow(i, 'to_branch_id', parseInt(e.target.value))}>
                        <option value="">Select branch</option>
                        {otherBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    ) : (
                      <select className="form-input" value={getDropdownValue(row)} onChange={e => handleSourceChange(i, e.target.value)}>
                        <option value="">Select source</option>
                        {otherBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        <option value="Supplier">Supplier</option>
                        <option value="Other">Other</option>
                      </select>
                    )}
                  </td>
                  <td className="table-td">
                    <select className="form-input" value={row.unit_type} onChange={e => updateRow(i, 'unit_type', e.target.value)}>
                      {UNIT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="table-td">
                    <ModelInput value={row.model} onChange={v => updateRow(i, 'model', v)} unitType={row.unit_type} />
                  </td>
                  <td className="table-td py-1.5"><StorageChips value={row.storage} onChange={v => updateRow(i, 'storage', v)} /></td>
                  <td className="table-td"><input className="form-input" value={row.color} onChange={e => updateRow(i, 'color', e.target.value)} placeholder="Color" /></td>
                  <td className="table-td"><QuantityStepper value={row.quantity} onChange={v => updateRow(i, 'quantity', v)} min={1} /></td>
                  <td className="table-td">
                    <button onClick={() => removeRow(i)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
                {!isTransferOut && row._sourceType === 'Other' && (
                  <tr key={`note-${i}`} className="border-b border-amber-100 bg-amber-50">
                    <td colSpan={7} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-amber-700 whitespace-nowrap">Source note:</span>
                        <input
                          className="form-input border-amber-200 focus:ring-amber-400 text-sm flex-1"
                          value={row.source_label || ''}
                          onChange={e => updateRow(i, 'source_label', e.target.value)}
                          placeholder="Specify the source (e.g. Walk-in consignor, Online seller...)"
                          autoFocus
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">None recorded</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
        <button onClick={addRow} className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Plus size={14} /> Add {title}
        </button>
        <PreviewToggle expanded={preview.expanded} hiddenCount={preview.hiddenCount} onToggle={preview.toggle} />
      </div>
    </div>
  );
}

// ─── Accessories Table ────────────────────────────────────────────────────────

function AccessoriesTable({ rows, onChange }) {
  const preview = useRowPreview(rows);
  const updateRow = (i, field, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: field === 'quantity' ? (parseInt(val) || 0) : val };
    onChange(next);
  };
  const addRow = () => onChange([...rows, emptyAccessory()]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-teal-600">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-white/80" />
          <span className="font-semibold text-white text-sm">Accessories</span>
        </div>
        <span className="bg-white/20 text-white font-bold text-sm px-2 py-0.5 rounded-md">
          {rows.reduce((s, r) => s + (r.quantity || 0), 0)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="table-th">Accessory</th>
              <th className="table-th text-center w-36">Quantity</th>
              <th className="table-th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {preview.visibleRows.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors row-enter">
                <td className="table-td"><input className="form-input" value={row.accessory} onChange={e => updateRow(i, 'accessory', e.target.value)} placeholder="e.g. Charger, Case, EarPods" /></td>
                <td className="table-td"><QuantityStepper value={row.quantity} onChange={v => updateRow(i, 'quantity', v)} /></td>
                <td className="table-td">
                  <button onClick={() => removeRow(i)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No accessories</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
        <button onClick={addRow} className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Plus size={14} /> Add Accessory
        </button>
        <PreviewToggle expanded={preview.expanded} hiddenCount={preview.hiddenCount} onToggle={preview.toggle} />
      </div>
    </div>
  );
}

// ─── Adjustments Table ────────────────────────────────────────────────────────

function AdjustmentsTable({ rows, onChange }) {
  const preview = useRowPreview(rows);
  const updateRow = (i, field, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: field === 'quantity' ? (parseInt(val) || 0) : val };
    onChange(next);
  };
  const addRow = () => onChange([...rows, emptyAdjustment()]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-600">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-white/80" />
          <span className="font-semibold text-white text-sm">Inventory Adjustments</span>
        </div>
        <span className="text-white/60 text-xs">Negative qty = removal</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="table-th">Type</th>
              <th className="table-th">Model</th>
              <th className="table-th">Storage</th>
              <th className="table-th">Color</th>
              <th className="table-th text-center w-28">Qty</th>
              <th className="table-th">Reason</th>
              <th className="table-th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {preview.visibleRows.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors row-enter">
                <td className="table-td">
                  <select className="form-input" value={row.unit_type} onChange={e => updateRow(i, 'unit_type', e.target.value)}>
                    {UNIT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td className="table-td">
                  <ModelInput value={row.model} onChange={v => updateRow(i, 'model', v)} unitType={row.unit_type} />
                </td>
                <td className="table-td py-1.5"><StorageChips value={row.storage} onChange={v => updateRow(i, 'storage', v)} /></td>
                <td className="table-td"><input className="form-input" value={row.color} onChange={e => updateRow(i, 'color', e.target.value)} placeholder="Color" /></td>
                <td className="table-td">
                  <QuantityStepper value={row.quantity} onChange={v => updateRow(i, 'quantity', v)} allowNegative />
                </td>
                <td className="table-td"><input className="form-input" value={row.reason} onChange={e => updateRow(i, 'reason', e.target.value)} placeholder="e.g. Damaged, Returned" /></td>
                <td className="table-td">
                  <button onClick={() => removeRow(i)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No adjustments</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
        <button onClick={addRow} className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Plus size={14} /> Add Adjustment
        </button>
        <PreviewToggle expanded={preview.expanded} hiddenCount={preview.hiddenCount} onToggle={preview.toggle} />
      </div>
    </div>
  );
}

// ─── Discrepancy Modal ────────────────────────────────────────────────────────

function DiscrepancyModal({ results, onClose }) {
  const issues = results.filter(r => r.status !== 'ok');
  const allOk = issues.length === 0;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-scale-in">
        <div className={`px-6 py-5 rounded-t-2xl flex items-center gap-3 ${allOk ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {allOk
            ? <CheckCircle2 size={22} className="text-white" />
            : <XCircle size={22} className="text-white" />}
          <div>
            <h2 className="text-base font-bold text-white">
              {allOk ? 'All Clear — No Discrepancies' : 'Discrepancies Detected'}
            </h2>
            <p className="text-sm text-white/80 mt-0.5">
              {allOk ? 'All counts match expected values.' : `${issues.length} item(s) with discrepancies found.`}
            </p>
          </div>
        </div>

        {!allOk && (
          <div className="overflow-auto flex-1 p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Model', 'Type', 'Expected', 'Actual', 'Diff', 'Status'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="table-td font-medium">{r.model}{r.storage ? ` ${r.storage}` : ''}{r.color ? ` (${r.color})` : ''}</td>
                    <td className="table-td text-slate-500 text-xs">{r.unit_type}</td>
                    <td className="table-td text-center">{r.expected_evening}</td>
                    <td className="table-td text-center">{r.actual_evening ?? '—'}</td>
                    <td className={`table-td text-center font-bold ${r.discrepancy > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                      {r.discrepancy !== null ? (r.discrepancy > 0 ? `+${r.discrepancy}` : r.discrepancy) : '—'}
                    </td>
                    <td className="table-td">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'over' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-primary w-full">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Live Summary Bar ─────────────────────────────────────────────────────────

function LiveSummary({ inventoryRows, soldRows, pullOutRows, stockInRows }) {
  const inv = (type) => inventoryRows[type]?.reduce((s, r) => s + (r.quantity || 0), 0) || 0;
  const items = [
    { label: 'Brand New',   value: inv('Brand New (iPhone)'),  color: 'text-blue-600' },
    { label: 'Secondhand',  value: inv('Secondhand (iPhone)'), color: 'text-amber-600' },
    { label: 'Android',     value: inv('Android'),             color: 'text-emerald-600' },
    { label: 'iPad/Mac',    value: inv('iPad & MacBook'),      color: 'text-purple-600' },
    { label: 'Sold',        value: soldRows.reduce((s, r) => s + (r.quantity || 0), 0),    color: 'text-red-600' },
    { label: 'Pull Outs',   value: pullOutRows.reduce((s, r) => s + (r.quantity || 0), 0), color: 'text-orange-600' },
    { label: 'Stock Ins',   value: stockInRows.reduce((s, r) => s + (r.quantity || 0), 0), color: 'text-indigo-600' },
  ];
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        {items.map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center">
            <span className={`text-lg font-bold ${color}`}>{value}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyEntry() {
  const [searchParams] = useSearchParams();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(searchParams.get('branch') || '');
  const [date, setDate] = useState(searchParams.get('date') || today());
  const [activeTab, setActiveTab] = useState('Brand New (iPhone)');
  const [saving, setSaving] = useState(false);
  const [discrepancy, setDiscrepancy] = useState(null);
  const [toast, setToast] = useState(null);

  const [inventoryRows, setInventoryRows] = useState(
    Object.fromEntries(UNIT_TYPES.map(t => [t, [emptyRow(t)]]))
  );
  const [soldRows, setSoldRows] = useState([]);
  const [pullOutRows, setPullOutRows] = useState([]);
  const [stockInRows, setStockInRows] = useState([]);
  const [accessoryRows, setAccessoryRows] = useState([]);
  const [adjustmentRows, setAdjustmentRows] = useState([]);

  useEffect(() => {
    getBranches().then(b => {
      setBranches(b);
      if (!branchId && b.length) setBranchId(String(b[0].id));
    });
  }, [branchId]);

  const loadData = useCallback(async () => {
    if (!branchId || !date) return;
    try {
      const [existingEntries, sold, transfers, accessories, adjustments] = await Promise.all([
        getInventory(branchId, date, 'evening'),
        getSoldUnits(branchId, date),
        getTransfers(branchId, date),
        getAccessories(branchId, date, 'evening'),
        getAdjustments(branchId, date),
      ]);

      const grouped = Object.fromEntries(UNIT_TYPES.map(t => [t, []]));
      existingEntries.forEach(e => { if (grouped[e.unit_type]) grouped[e.unit_type].push(e); });
      UNIT_TYPES.forEach(t => { if (!grouped[t].length) grouped[t] = [emptyRow(t)]; });
      setInventoryRows(grouped);

      setSoldRows(sold);
      setPullOutRows(transfers.filter(t => t.transfer_type === 'pull_out' && t.from_branch_id === parseInt(branchId)));
      setStockInRows(transfers.filter(t => t.transfer_type === 'stock_in' && t.to_branch_id === parseInt(branchId)).map(t => {
        let _sourceType = '';
        if (t.from_branch_id) _sourceType = 'branch';
        else if (t.source_label === 'Supplier') _sourceType = 'Supplier';
        else if (t.source_label) _sourceType = 'Other';
        return { ...t, source_label: t.source_label || '', _sourceType };
      }));
      setAccessoryRows(accessories);
      setAdjustmentRows(adjustments);
    } catch (err) {
      console.error(err);
    }
  }, [branchId, date]);

  useEffect(() => { loadData(); }, [loadData]);

  const showToast = (type, message) => setToast({ type, message });

  const handleSave = async () => {
    setSaving(true);
    try {
      const allInventory = UNIT_TYPES.flatMap(t => inventoryRows[t].filter(r => r.model.trim()));
      const result = await saveInventory({ branch_id: parseInt(branchId), date, entries: allInventory });

      await saveSoldUnits({ branch_id: parseInt(branchId), date, entries: soldRows.filter(r => r.model.trim()) });

      const allTransfers = [
        ...pullOutRows.filter(r => r.model.trim()).map(r => ({ ...r, transfer_type: 'pull_out', from_branch_id: parseInt(branchId) })),
        ...stockInRows.filter(r => r.model.trim()).map(r => {
          const rest = { ...r };
          delete rest._sourceType;
          return { ...rest, transfer_type: 'stock_in', to_branch_id: parseInt(branchId) };
        }),
      ];
      await saveTransfers({ branch_id: parseInt(branchId), date, entries: allTransfers });
      await saveAccessories({ branch_id: parseInt(branchId), date, entries: accessoryRows.filter(r => r.accessory.trim()) });
      await saveAdjustments({ branch_id: parseInt(branchId), date, entries: adjustmentRows.filter(r => r.model.trim()) });

      if (result.discrepancy) {
        setDiscrepancy(result.discrepancy);
      } else {
        showToast('success', 'Entry saved successfully');
      }
    } catch (err) {
      showToast('error', 'Failed to save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const selectedBranch = branches.find(b => b.id === parseInt(branchId));
  const prevDate = getPrevDate(date);

  return (
    <div className="space-y-5 pb-36">
      {discrepancy && <DiscrepancyModal results={discrepancy} onClose={() => setDiscrepancy(null)} />}
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      {/* Page header */}
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">Daily Entry</h1>
          <p className="page-subtitle">Record evening stock, sales, transfers, accessories, and adjustments</p>
        </div>
      </div>

      {/* Controls */}
      <div className="panel">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_140px]">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Branch</label>
            <select className="form-input font-medium" value={branchId} onChange={e => setBranchId(e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
            <input type="date" className="form-input font-medium" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={loadData} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Reload
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <Info size={15} className="text-indigo-500 mt-0.5 shrink-0" />
          <p className="text-sm text-indigo-700">
            <span className="font-semibold">Evening entry for {date}.</span>
            {' '}Today's opening stock was carried over from <span className="font-medium">{prevDate}</span> evening.
          </p>
        </div>
      </div>

      {/* Inventory tabs */}
      <div className="panel mb-0 rounded-b-none border-b-0 pb-0">
        <div className="flex gap-1 overflow-x-auto -mb-px">
          {UNIT_TYPES.map(t => {
            const cfg = TYPE_CONFIG[t];
            const count = inventoryRows[t]?.reduce((s, r) => s + (r.quantity || 0), 0) || 0;
            const isActive = activeTab === t;
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 flex items-center gap-1.5 ${
                  isActive ? cfg.tabActive : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {t}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? cfg.badge : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <InventoryTable
          unitType={activeTab}
          rows={inventoryRows[activeTab] || [emptyRow(activeTab)]}
          onChange={rows => setInventoryRows(prev => ({ ...prev, [activeTab]: rows }))}
        />
      </div>

      <SectionLabel>Sales & Transfers</SectionLabel>

      <div className="space-y-4 mb-4">
        <SoldTable rows={soldRows} onChange={setSoldRows} />
        <TransferTable title="Pull Outs" type="pull_out" rows={pullOutRows} onChange={setPullOutRows} branches={branches} currentBranchId={branchId} />
        <TransferTable title="Stock Ins" type="stock_in" rows={stockInRows} onChange={setStockInRows} branches={branches} currentBranchId={branchId} />
      </div>

      <SectionLabel>Accessories & Adjustments</SectionLabel>

      <div className="space-y-4">
        <AccessoriesTable rows={accessoryRows} onChange={setAccessoryRows} />
        <AdjustmentsTable rows={adjustmentRows} onChange={setAdjustmentRows} />
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:left-0">
        <div className="max-w-7xl mx-auto px-4 pb-4 pt-2 md:pb-4">
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {selectedBranch?.name} · {date} · <span className="text-indigo-600">Evening</span>
                </div>
                <LiveSummary
                  inventoryRows={inventoryRows}
                  soldRows={soldRows}
                  pullOutRows={pullOutRows}
                  stockInRows={stockInRows}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !branchId}
                className="btn-primary shrink-0 flex items-center gap-2 px-5 py-2.5"
              >
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  : <><CheckCircle2 size={15} /> Save & Check</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
