import { useState, useEffect } from 'react';
import {
  getBranches, addBranch, renameBranch, deleteBranch,
  getSettingsSummary,
} from '../api';
import {
  Building2, Check, ClipboardCheck, Database, FolderDown,
  HardDrive, MonitorCog, Pencil, Plus, RefreshCw,
  ShieldCheck, Trash2, X,
} from 'lucide-react';
import { announceBranchesUpdated } from '../branchEvents';

const DEFAULT_PREFS = {
  landingPage: 'dashboard',
  density: 'comfortable',
  showHints: true,
};

function StatCard({ label, value, detail, Icon, tone = 'blue' }) {
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
          {detail && <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p>}
        </div>
        <div className={`metric-icon ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function PreferenceButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
        active
          ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

export default function Settings() {
  const [branches, setBranches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(() => {
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem('fj-settings-preferences') || '{}') };
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const load = async () => {
    const [branchRows, summaryData] = await Promise.all([getBranches(), getSettingsSummary()]);
    setBranches(branchRows);
    setSummary(summaryData);
  };

  useEffect(() => { load(); }, []);

  const updatePrefs = (next) => {
    const updated = { ...prefs, ...next };
    setPrefs(updated);
    localStorage.setItem('fj-settings-preferences', JSON.stringify(updated));
    setNotice('Workspace preferences saved on this browser.');
  };

  const handleAdd = async (event) => {
    event?.preventDefault();
    if (saving) return;
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await addBranch(newName.trim());
      setNewName('');
      await load();
      announceBranchesUpdated();
      setNotice('Branch added successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add branch');
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (id) => {
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await renameBranch(id, editName.trim());
      setEditId(null);
      setEditName('');
      await load();
      announceBranchesUpdated();
      setNotice('Branch renamed successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rename branch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete branch "${name}"? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    try {
      await deleteBranch(id);
      await load();
      announceBranchesUpdated();
      setNotice('Branch deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete branch');
    }
  };

  const maintenance = [
    ['Local database', summary?.database.status === 'ready', 'SQLite is ready for offline operation.'],
    ['Reporting history', (summary?.data.daysWithEntries || 0) > 0, `${summary?.data.daysWithEntries || 0} business days available for charts.`],
    ['Exports folder', summary?.storage.exportsExists, summary?.storage.exportsPath || 'Not configured'],
    ['Branch setup', branches.length >= 4, `${branches.length} active branches configured.`],
  ];

  return (
    <div className="space-y-5">
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Control branch setup, storage, exports, and workspace preferences</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {error || notice}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Branches" value={branches.length} detail="Active locations" Icon={Building2} />
        <StatCard label="Data History" value={summary?.data.daysWithEntries ?? '-'} detail={`Latest: ${summary?.data.latestEntryDate || '-'}`} Icon={Database} tone="emerald" />
        <StatCard label="Sold Units" value={summary?.data.soldUnits ?? '-'} detail="Across local dataset" Icon={ClipboardCheck} tone="violet" />
        <StatCard label="DB Size" value={`${summary?.storage.databaseSizeMb ?? 0} MB`} detail="Local SQLite file" Icon={HardDrive} tone="slate" />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Storage & Operations</h2>
              <p className="panel-subtitle">Inspect local database status and export destinations</p>
            </div>
            <div className="status-pill">
              <ShieldCheck size={14} />
              Offline-ready
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Storage</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-700">Database</p>
                  <p className="break-all text-xs text-slate-500">{summary?.storage.databasePath || '-'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Exports</p>
                  <p className="break-all text-xs text-slate-500">{summary?.storage.exportsPath || '-'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Operating Snapshot</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">History</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{summary?.data.daysWithEntries ?? '-'}</p>
                  <p className="text-xs text-slate-500">business days</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Exports</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{summary?.storage.exportsExists ? 'Ready' : 'Check'}</p>
                  <p className="text-xs text-slate-500">Excel output</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Latest Entry</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{summary?.data.latestEntryDate || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Database</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{summary?.database.client || 'local'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Maintenance Checklist</h2>
              <p className="panel-subtitle">Quick readiness signals for daily operations</p>
            </div>
          </div>
          <div className="space-y-3">
            {maintenance.map(([label, ok, detail]) => (
              <div key={label} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  <Check size={13} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-950">{label}</p>
                  <p className="text-xs text-slate-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Workspace Preferences</h2>
            <p className="panel-subtitle">Browser-only preferences for the operator experience</p>
          </div>
          <MonitorCog size={18} className="text-slate-400" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Default landing</p>
            <div className="flex flex-wrap gap-2">
              {['dashboard', 'entry', 'reports'].map(value => (
                <PreferenceButton key={value} active={prefs.landingPage === value} onClick={() => updatePrefs({ landingPage: value })}>
                  {value}
                </PreferenceButton>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Table density</p>
            <div className="flex flex-wrap gap-2">
              {['comfortable', 'compact'].map(value => (
                <PreferenceButton key={value} active={prefs.density === value} onClick={() => updatePrefs({ density: value })}>
                  {value}
                </PreferenceButton>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Guidance</p>
            <PreferenceButton active={prefs.showHints} onClick={() => updatePrefs({ showHints: !prefs.showHints })}>
              {prefs.showHints ? 'Hints enabled' : 'Hints disabled'}
            </PreferenceButton>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Branch Management</h2>
              <p className="panel-subtitle">Rename or remove locations from local inventory workflows</p>
            </div>
          </div>

          <div className="space-y-2">
            {branches.map(branch => (
              <div key={branch.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="metric-icon bg-blue-50 text-blue-600">
                  <Building2 size={16} />
                </div>
                {editId === branch.id ? (
                  <>
                    <input
                      className="form-input flex-1"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(branch.id)}
                      autoFocus
                    />
                    <button onClick={() => handleRename(branch.id)} disabled={saving} className="icon-button text-emerald-600">
                      <Check size={16} />
                    </button>
                    <button onClick={() => { setEditId(null); setEditName(''); }} className="icon-button">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-950">{branch.name}</p>
                      <p className="text-xs text-slate-500">Branch ID {branch.id}</p>
                    </div>
                    <button onClick={() => { setEditId(branch.id); setEditName(branch.name); setError(''); }} className="icon-button">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(branch.id, branch.name)} className="icon-button text-red-500 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <aside className="panel h-fit">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Add New Branch</h2>
              <p className="panel-subtitle">New branches appear immediately across the app</p>
            </div>
            <FolderDown size={18} className="text-slate-400" />
          </div>

          <form className="space-y-3" onSubmit={handleAdd}>
            <input
              className="form-input"
              placeholder="Branch name, e.g. Cebu IT Park 2"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="btn-primary flex w-full items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Branch
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
