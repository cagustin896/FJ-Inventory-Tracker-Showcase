import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DailyEntry from './pages/DailyEntry';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { LayoutDashboard, ClipboardPen, FileBarChart2, Settings2 } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/entry',     label: 'Daily Entry', icon: ClipboardPen },
  { to: '/reports',   label: 'Reports',    icon: FileBarChart2 },
  { to: '/settings',  label: 'Settings',   icon: Settings2 },
];

function DesktopNav() {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `nav-link ${isActive ? 'nav-link-active' : 'nav-link-idle'}`
          }
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 flex z-50 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-all duration-150 ${
              isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-lg transition-all duration-150 ${isActive ? 'bg-slate-950 text-white' : ''}`}>
                <Icon size={20} />
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell flex flex-col">
        <header className="app-header">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="brand-mark shrink-0">
                <span>FJ</span>
              </div>
              <div className="min-w-0">
                <span className="block whitespace-nowrap font-black tracking-tight text-slate-950 text-[clamp(12px,3.4vw,14px)]">F&J Gadgets Inventory</span>
                <p className="hidden sm:block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Local ops console</p>
              </div>
            </div>
            <DesktopNav />
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/entry" element={<DailyEntry />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        <MobileNav />
      </div>
    </BrowserRouter>
  );
}
