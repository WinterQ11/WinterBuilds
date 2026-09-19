import React from 'react';
import { 
  ShieldCheck, 
  Download, 
  Search, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Package, 
  Cpu, 
  Smartphone, 
  Lock,
  Compass
} from 'lucide-react';
import { AppListing, APP_CATEGORIES } from '../types';
import { AppCard } from '../components/AppCard';

interface HomeViewProps {
  apps: AppListing[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onSelectApp: (id: string) => void;
  onQuickDownload: (app: AppListing) => void;
  isLoading: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  apps,
  searchQuery,
  onSearchChange,
  onNavigate,
  onSelectApp,
  onQuickDownload,
  isLoading,
}) => {
  const featuredApps = apps.filter((a) => a.isFeatured);
  const recentApps = [...apps].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  ).slice(0, 6);

  const totalDownloads = apps.reduce((acc, curr) => acc + (curr.downloadsCount || 0), 0);

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-14 pb-8 overflow-hidden">
        {/* Subtle background warm ambiance */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-[#ebdcc8]/40 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0e6d6] border border-[#d8c8b4] text-[#6b4423] text-xs font-semibold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#7c4d29]" />
            <span>Safe Android Apps • No Ads or Extra Junk</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#281e16] tracking-tight leading-[1.15]">
            Find and download <br className="hidden sm:inline" />
            <span className="text-[#7c4d29]">
              safe Android apps.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-[#6e5d4f] max-w-2xl mx-auto leading-relaxed">
            WinterBuild makes it easy to find and download free Android apps. 
            Every app is checked for safety, clean from viruses, and ready to install on your phone.
          </p>

          {/* Central Search Form */}
          <div className="max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center shadow-lg shadow-[#6b4423]/5 rounded-2xl">
              <input
                id="input-hero-search"
                type="text"
                placeholder="Search apps by name, creator, or type (like tools, music, games)..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onNavigate('catalog');
                  }
                }}
                className="w-full bg-[#ffffff] border border-[#ded5c5] hover:border-[#c5b8a5] focus:border-[#7c4d29] rounded-2xl pl-12 pr-32 py-4 text-sm text-[#281e16] placeholder-[#9a897b] focus:outline-none focus:ring-2 focus:ring-[#7c4d29]/25 transition-all"
              />
              <Search className="w-5 h-5 text-[#8a796b] absolute left-4 pointer-events-none" />
              <button
                id="btn-hero-search-submit"
                onClick={() => onNavigate('catalog')}
                className="absolute right-2 px-4 py-2.5 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] text-xs font-semibold transition-all shadow-xs"
              >
                Search Apps
              </button>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
            <span className="text-xs text-[#7d6c5d]">Categories:</span>
            {APP_CATEGORIES.slice(0, 5).map((cat) => (
              <button
                key={cat}
                id={`btn-hero-cat-${cat.toLowerCase()}`}
                onClick={() => onNavigate('catalog', { category: cat })}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-[#6e5d4f] hover:text-[#281e16] bg-[#f5eee3] hover:bg-[#ebe2d4] border border-[#ded3c2] transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Trust Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-6 border-t border-[#e2d8c7] text-left">
            <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#e5ded3] shadow-2xs">
              <div className="text-xl font-extrabold text-[#281e16]">{apps.length}</div>
              <div className="text-xs text-[#7d6c5d]">Apps Available</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#e5ded3] shadow-2xs">
              <div className="text-xl font-extrabold text-[#281e16]">{totalDownloads}</div>
              <div className="text-xs text-[#7d6c5d]">Total Downloads</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#e5ded3] shadow-2xs">
              <div className="text-xl font-extrabold text-[#7c4d29]">Checked</div>
              <div className="text-xs text-[#7d6c5d]">Safety Tested</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#e5ded3] shadow-2xs">
              <div className="text-xl font-extrabold text-[#2d5c37]">100%</div>
              <div className="text-xs text-[#7d6c5d]">Free & Clean</div>
            </div>
          </div>

        </div>
      </section>

      {/* Featured Apps Section (if any featured apps exist) */}
      {featuredApps.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#281e16] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#7c4d29]" />
                Featured Apps
              </h2>
              <p className="text-xs text-[#6e5d4f]">Great apps hand-picked for you</p>
            </div>
            <button
              onClick={() => onNavigate('catalog', { sort: 'popular' })}
              className="text-xs font-semibold text-[#7c4d29] hover:text-[#5e381b] flex items-center gap-1 transition-colors"
            >
              <span>See all apps</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onSelectApp={onSelectApp}
                onQuickDownload={onQuickDownload}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Apps / Repository Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#281e16] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#7c4d29]" />
              Newly Added Apps
            </h2>
            <p className="text-xs text-[#6e5d4f]">The newest apps added to WinterBuild</p>
          </div>
          {apps.length > 0 && (
            <button
              onClick={() => onNavigate('catalog')}
              className="text-xs font-semibold text-[#7c4d29] hover:text-[#5e381b] flex items-center gap-1 transition-colors"
            >
              <span>See all {apps.length} apps</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-[#f0e7d8]/60 border border-[#e2d8c7] animate-pulse p-5 space-y-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#e5dbc9]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#e5dbc9] rounded w-3/4" />
                    <div className="h-3 bg-[#e5dbc9] rounded w-1/2" />
                  </div>
                </div>
                <div className="h-10 bg-[#e5dbc9] rounded" />
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          /* HELPFUL EMPTY STATE AS MANDATED */
          <div 
            id="empty-state-no-apps"
            className="rounded-2xl border border-[#e5ded3] bg-[#ffffff] p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4 shadow-sm"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#faf6f0] border border-[#e5ded3] flex items-center justify-center mx-auto text-[#7c4d29]">
              <Smartphone className="w-8 h-8 text-[#7c4d29]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#281e16]">
                No Apps Available Yet
              </h3>
              <p className="text-xs sm:text-sm text-[#6e5d4f] leading-relaxed max-w-lg mx-auto">
                We are getting the app collection ready! If you are the website owner, log in to add your first app.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-empty-goto-admin"
                onClick={() => onNavigate('admin')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Manage My Website</span>
              </button>
              <button
                onClick={() => onNavigate('about')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#f5eee3] hover:bg-[#ebe2d4] text-[#4d3c2e] hover:text-[#281e16] border border-[#ded3c2] font-medium text-xs transition-all"
              >
                Learn How We Check Apps
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onSelectApp={onSelectApp}
                onQuickDownload={onQuickDownload}
              />
            ))}
          </div>
        )}
      </section>

      {/* Why WinterBuild Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#e2d8c7] bg-[#ffffff] p-8 sm:p-10 space-y-8 shadow-2xs">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-[#281e16]">
              Why choose WinterBuild?
            </h2>
            <p className="text-xs sm:text-sm text-[#6e5d4f] mt-1">
              Simple, safe, and made for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-[#faf6f0] border border-[#e8dfd1] space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#f0e6d6] border border-[#d8c8b4] flex items-center justify-center text-[#7c4d29]">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#281e16]">Direct Downloads</h3>
              <p className="text-xs text-[#6e5d4f] leading-relaxed">
                No confusing extra downloaders or spam. You get the real app file directly to your phone.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#faf6f0] border border-[#e8dfd1] space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#edf4ee] border border-[#cbe0ce] flex items-center justify-center text-[#2d5c37]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#281e16]">Checked for Safety</h3>
              <p className="text-xs text-[#6e5d4f] leading-relaxed">
                We check every app to make sure it is safe, untouched, and free of viruses.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#faf6f0] border border-[#e8dfd1] space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#f5eee3] border border-[#e0d3c0] flex items-center justify-center text-[#6b4423]">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#281e16]">Clear Phone Requirements</h3>
              <p className="text-xs text-[#6e5d4f] leading-relaxed">
                We clearly show which Android version your phone needs so you know it will work.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
