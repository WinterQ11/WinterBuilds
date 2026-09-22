import React from 'react';
import {
  LayoutDashboard,
  Layers,
  PlusCircle,
  Settings,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export type AdminTab = 'overview' | 'apps' | 'new-app' | 'settings';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onExitAdmin: () => void;
  onSignOut: () => void;
  adminEmail?: string | null;
  supabaseConfigured: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  onExitAdmin,
  onSignOut,
  adminEmail,
  supabaseConfigured,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'apps', label: 'Applications', icon: Layers },
    { id: 'new-app', label: 'Add New App', icon: PlusCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-full md:w-64 border-r shrink-0 flex flex-col justify-between p-4 bg-[#f8f2e7] border-[#e2d8c3] dark:bg-[#141210] dark:border-[#25211c]">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm bg-gradient-to-br from-amber-600 to-amber-700 text-amber-50">
            <span>W</span>
            <span className="text-amber-300 text-[10px] ml-0.5 font-mono">B</span>
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-tight text-[#221c17] dark:text-[#f8f5ee]">
              WINTER<span className="text-amber-600 dark:text-amber-400">BUILDS</span>
            </h2>
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-[#827464] dark:text-[#8a7f72]">
              Admin Center
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`admin-nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-amber-600 text-white shadow-xs dark:bg-amber-500 dark:text-neutral-950 font-bold'
                    : 'text-[#635546] hover:bg-[#ede3d1] hover:text-[#1c1713] dark:text-[#9e9282] dark:hover:bg-[#1f1d19] dark:hover:text-[#f5f1ea]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status Indicator */}
        <div className="px-3 py-3 rounded-xl border text-xs space-y-1.5 bg-[#f0e7d7] border-[#ddd0bb] dark:bg-[#1a1815] dark:border-[#2b2721]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#736555] dark:text-[#887c6e]">
              Database
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
              supabaseConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${supabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {supabaseConfigured ? 'Supabase Live' : 'Local Store'}
            </span>
          </div>
          {adminEmail && (
            <p className="text-[11px] text-[#554a3e] dark:text-[#a09484] truncate font-mono">
              {adminEmail}
            </p>
          )}
        </div>
      </div>

      {/* Footer controls */}
      <div className="space-y-2 pt-4 border-t border-[#e2d8c3] dark:border-[#25211c]">
        <button
          onClick={onExitAdmin}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors bg-[#ede2cf] border-[#dacbb1] text-[#4d4032] hover:bg-[#e4d7c0] dark:bg-[#1c1a17] dark:border-[#2e2923] dark:text-[#c7baa8] dark:hover:bg-[#25221d]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Public Hub</span>
        </button>

        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
