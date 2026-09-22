import React, { useState, useEffect } from 'react';
import type { Application, DashboardStats } from '../types';
import { api, setLocalAuthToken } from '../services/api';
import { AdminSidebar, AdminTab } from '../components/admin/AdminSidebar';
import { AdminStats } from '../components/admin/AdminStats';
import { AppTable } from '../components/admin/AppTable';
import { UploadWizard } from '../components/admin/UploadWizard';
import { SearchBar } from '../components/apps/SearchBar';
import {
  PlusCircle,
  RefreshCw,
  HardDrive,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AdminDashboardPageProps {
  onExitAdmin: () => void;
  onViewPublicApp: (app: Application) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onExitAdmin,
  onViewPublicApp,
}) => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalApps: 0,
    publishedApps: 0,
    draftApps: 0,
    totalDownloads: 0,
    recentlyAdded: [],
    recentlyUpdated: [],
  });
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminStatus, setAdminStatus] = useState<{
    authenticated: boolean;
    email: string | null;
    supabaseConfigured: boolean;
  }>({
    authenticated: true,
    email: 'winterbuilds99@gmail.com',
    supabaseConfigured: false,
  });

  // Modal for editing an app or replacing APK
  const [wizardTarget, setWizardTarget] = useState<{
    app: Application | null;
    mode: 'create' | 'edit' | 'replace-apk';
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, statsRes, appsRes] = await Promise.all([
        api.checkAdminStatus(),
        api.getAdminStats(),
        api.getAdminApps({ limit: 100 }),
      ]);
      setAdminStatus(statusRes);
      setStats(statsRes);
      setApps(appsRes.applications);
    } catch (err) {
      console.warn('Dashboard load warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const updated = await api.publishApp(id);
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setStats((prev) => ({
        ...prev,
        publishedApps: prev.publishedApps + 1,
        draftApps: Math.max(0, prev.draftApps - 1),
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to publish');
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const updated = await api.unpublishApp(id);
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setStats((prev) => ({
        ...prev,
        publishedApps: Math.max(0, prev.publishedApps - 1),
        draftApps: prev.draftApps + 1,
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to unpublish');
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteApp(id);
    setApps((prev) => prev.filter((a) => a.id !== id));
    setStats((prev) => ({
      ...prev,
      totalApps: Math.max(0, prev.totalApps - 1),
    }));
  };

  const handleSignOut = () => {
    setLocalAuthToken(null);
    onExitAdmin();
  };

  const filteredApps = apps.filter((app) => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.package_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col md:flex-row min-h-[85vh] rounded-3xl border overflow-hidden shadow-sm bg-[#faf6ef] border-[#e2d8c3] dark:bg-[#121110] dark:border-[#25211c]">
      {/* Admin Navigation Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'new-app') {
            setWizardTarget({ app: null, mode: 'create' });
          } else {
            setCurrentTab(tab);
          }
        }}
        onExitAdmin={onExitAdmin}
        onSignOut={handleSignOut}
        adminEmail={adminStatus.email || 'winterbuilds99@gmail.com'}
        supabaseConfigured={adminStatus.supabaseConfigured}
      />

      {/* Main Admin Content Area */}
      <main className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e6decb] dark:border-[#25211c]">
          <div>
            <h1 className="text-2xl font-black text-[#1c1713] dark:text-[#f8f5ee]">
              {currentTab === 'overview'
                ? 'Overview & Metrics'
                : currentTab === 'apps'
                ? 'Manage Applications'
                : 'System Settings'}
            </h1>
            <p className="text-xs text-[#716454] dark:text-[#8e8373] mt-0.5">
              Direct-to-storage distribution system for WinterBuilds
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              title="Refresh data"
              className="p-2 rounded-xl border transition-colors bg-[#ffffff] border-[#ded4c3] text-[#4d4032] hover:bg-[#f6efe4] dark:bg-[#181614] dark:border-[#2b2721] dark:text-[#cbbfae]"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              id="admin-add-app-btn"
              onClick={() => setWizardTarget({ app: null, mode: 'create' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-900/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New App</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB: OVERVIEW */}
        {/* ------------------------------------------------------------- */}
        {currentTab === 'overview' && (
          <div className="space-y-8">
            <AdminStats stats={stats} />

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setWizardTarget({ app: null, mode: 'create' })}
                className="p-5 rounded-2xl border cursor-pointer hover:border-amber-600/40 transition-all bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#28241e]"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#1c1713] dark:text-[#f8f5ee]">
                  Upload New APK
                </h3>
                <p className="text-xs text-[#716454] dark:text-[#8e8373] mt-1">
                  Upload an Android package directly to storage and publish
                </p>
              </div>

              <div
                onClick={() => setCurrentTab('apps')}
                className="p-5 rounded-2xl border cursor-pointer hover:border-amber-600/40 transition-all bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#28241e]"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#1c1713] dark:text-[#f8f5ee]">
                  Manage Releases
                </h3>
                <p className="text-xs text-[#716454] dark:text-[#8e8373] mt-1">
                  Review published apps, draft updates, or replace binaries
                </p>
              </div>

              <div
                onClick={onExitAdmin}
                className="p-5 rounded-2xl border cursor-pointer hover:border-amber-600/40 transition-all bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#28241e]"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#1c1713] dark:text-[#f8f5ee]">
                  View Public Hub
                </h3>
                <p className="text-xs text-[#716454] dark:text-[#8e8373] mt-1">
                  Inspect the public catalog as seen by end visitors
                </p>
              </div>
            </div>

            {/* Recent Apps Table preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-[#1c1713] dark:text-[#f8f5ee]">
                  Recent Applications
                </h2>
                <button
                  onClick={() => setCurrentTab('apps')}
                  className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  View All ({apps.length})
                </button>
              </div>

              <AppTable
                apps={apps.slice(0, 5)}
                onEditApp={(app) => setWizardTarget({ app, mode: 'edit' })}
                onPublishApp={handlePublish}
                onUnpublishApp={handleUnpublish}
                onDeleteApp={handleDelete}
                onReplaceApk={(app) => setWizardTarget({ app, mode: 'replace-apk' })}
                onViewPublic={onViewPublicApp}
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB: APPLICATIONS */}
        {/* ------------------------------------------------------------- */}
        {currentTab === 'apps' && (
          <div className="space-y-6">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {(['all', 'published', 'draft'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      statusFilter === st
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'bg-[#ffffff] border-[#ded4c3] text-[#554a3e] dark:bg-[#181614] dark:border-[#2b2721] dark:text-[#a69b8d]'
                    }`}
                  >
                    {st} ({st === 'all' ? apps.length : apps.filter((a) => a.status === st).length})
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-72">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Filter apps..."
                />
              </div>
            </div>

            {/* Applications Full Table */}
            <AppTable
              apps={filteredApps}
              onEditApp={(app) => setWizardTarget({ app, mode: 'edit' })}
              onPublishApp={handlePublish}
              onUnpublishApp={handleUnpublish}
              onDeleteApp={handleDelete}
              onReplaceApk={(app) => setWizardTarget({ app, mode: 'replace-apk' })}
              onViewPublic={onViewPublicApp}
            />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB: SETTINGS */}
        {/* ------------------------------------------------------------- */}
        {currentTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div className="p-6 rounded-3xl border bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#27231e] space-y-4">
              <h3 className="font-bold text-base text-[#1c1713] dark:text-[#f8f5ee]">
                Storage & Distribution Settings
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-[#eee3d1] dark:border-[#25211c]">
                  <span className="text-[#716454] dark:text-[#8e8373]">Storage Provider</span>
                  <span className="font-mono font-semibold">Supabase Storage / Object CDN</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#eee3d1] dark:border-[#25211c]">
                  <span className="text-[#716454] dark:text-[#8e8373]">Public Download Bucket</span>
                  <span className="font-mono font-semibold">apks (Public Read)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#eee3d1] dark:border-[#25211c]">
                  <span className="text-[#716454] dark:text-[#8e8373]">Direct Upload Authorization</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Enabled</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#eee3d1] dark:border-[#25211c]">
                  <span className="text-[#716454] dark:text-[#8e8373]">Gemini AI Model</span>
                  <span className="font-mono font-semibold">gemini-2.5-flash</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl border bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#27231e] space-y-3">
              <h3 className="font-bold text-base text-[#1c1713] dark:text-[#f8f5ee]">
                Administrator Account
              </h3>
              <p className="text-xs text-[#716454] dark:text-[#8e8373]">
                Authorized administrator email: <span className="font-mono font-bold text-[#1c1713] dark:text-[#f8f5ee]">winterbuilds99@gmail.com</span>
              </p>
              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 border border-rose-500/30 hover:bg-rose-500/10"
                >
                  Sign Out of Admin Center
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Multi-Step Upload & Edit Wizard Modal */}
      {wizardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <UploadWizard
              existingApp={wizardTarget.app}
              mode={wizardTarget.mode}
              onSuccess={(savedApp) => {
                setApps((prev) => {
                  const exists = prev.some((a) => a.id === savedApp.id);
                  return exists
                    ? prev.map((a) => (a.id === savedApp.id ? savedApp : a))
                    : [savedApp, ...prev];
                });
                setWizardTarget(null);
                loadDashboardData();
              }}
              onCancel={() => setWizardTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
