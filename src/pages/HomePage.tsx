import React, { useState, useEffect } from 'react';
import type { Application } from '../types';
import { api } from '../services/api';
import { SearchBar } from '../components/apps/SearchBar';
import { CategoryFilter } from '../components/apps/CategoryFilter';
import { AppGrid } from '../components/apps/AppGrid';
import { Badge } from '../components/common/Badge';
import {
  ShieldCheck,
  Download,
  Zap,
  Sparkles,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface HomePageProps {
  onSelectApp: (app: Application) => void;
  onNavigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectApp, onNavigate }) => {
  const [featuredApps, setFeaturedApps] = useState<Application[]>([]);
  const [latestApps, setLatestApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [featRes, latestRes] = await Promise.all([
        api.getApps({ featured: true, limit: 4 }),
        api.getApps({ limit: 12, sort: 'latest' }),
      ]);
      setFeaturedApps(featRes.applications);
      setLatestApps(latestRes.applications);
    } catch (err) {
      console.warn('Failed to load home data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadIncrement = (appId: string, newCount: number) => {
    setLatestApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, downloads_count: newCount } : a))
    );
    setFeaturedApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, downloads_count: newCount } : a))
    );
  };

  const filteredApps = latestApps.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.package_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' ||
      app.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-14 pb-16">
      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-6 sm:pt-10">
        <div className="rounded-3xl p-6 sm:p-12 border overflow-hidden relative shadow-sm bg-gradient-to-b from-[#f5eee0] to-[#f9f5ed] border-[#e6dcce] dark:from-[#1b1916] dark:to-[#131110] dark:border-[#28231d]">
          {/* Subtle warm glow background accent */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none bg-amber-500/20" />

          <div className="max-w-3xl space-y-5 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-800 border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Verified Android APK Distribution</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-[#1c1713] dark:text-[#f8f5ee]">
              Direct Android APKs.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-700 dark:from-amber-400 dark:to-amber-500">
                No ads, no countdowns.
              </span>
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-[#615446] dark:text-[#9c9183]">
              Discover, browse, and directly download authenticated Android application packages. Built with direct-to-storage infrastructure and cryptographic SHA-256 integrity checks.
            </p>

            {/* Instant Search Bar */}
            <div className="pt-2 max-w-xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by app name, package ID, or keyword..."
              />
            </div>

            {/* Value Props Row */}
            <div className="flex flex-wrap items-center gap-5 pt-3 text-xs font-mono text-[#716454] dark:text-[#8f8373]">
              <span className="inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Direct CDN Downloads
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                SHA-256 Verified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Admin Curated
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FEATURED APPLICATIONS SHOWCASE */}
      {/* ------------------------------------------------------------- */}
      {featuredApps.length > 0 && !searchQuery && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-xl font-bold tracking-tight text-[#1c1713] dark:text-[#f8f5ee]">
                Featured Applications
              </h2>
            </div>
            <button
              onClick={() => onNavigate('/apps?featured=true')}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
            >
              <span>See all featured</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredApps.map((app) => (
              <div
                key={app.id}
                onClick={() => onSelectApp(app)}
                className="group p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 shadow-sm bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#28231d] hover:border-amber-600/40"
              >
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center bg-[#f2ebd9] border-[#decbb0] dark:bg-[#201d19] dark:border-[#332f28]">
                    {app.icon_url ? (
                      <img src={app.icon_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Smartphone className="w-6 h-6 text-amber-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate text-[#1c1713] dark:text-[#f8f5ee] group-hover:text-amber-600 transition-colors">
                      {app.name}
                    </h3>
                    <Badge variant="amber" size="sm">
                      {app.category}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs line-clamp-2 text-[#615446] dark:text-[#9c9183] mb-3">
                  {app.short_description || app.description}
                </p>
                <div className="pt-2 border-t flex items-center justify-between text-[11px] font-mono border-[#eee4d2] dark:border-[#26211c] text-[#7a6e60] dark:text-[#887c6e]">
                  <span>v{app.version_name}</span>
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                    <Download className="w-3 h-3" />
                    {app.downloads_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CATEGORIES QUICK BAR & LATEST CATALOG */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1c1713] dark:text-[#f8f5ee]">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'Browse Applications'}
            </h2>
            <p className="text-xs text-[#736657] dark:text-[#8f8373] mt-0.5">
              Verified Android packages ready for instant download
            </p>
          </div>

          <button
            onClick={() => onNavigate('/apps')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-colors bg-[#ffffff] border-[#ded4c3] text-[#3d3328] hover:bg-[#f6efe4] dark:bg-[#181614] dark:border-[#2b2721] dark:text-[#cbbfae] dark:hover:bg-[#221f1b]"
          >
            <span>View Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Categories Pills */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Applications Grid */}
        <AppGrid
          apps={filteredApps}
          isLoading={isLoading}
          onSelectApp={onSelectApp}
          onDownloadIncrement={handleDownloadIncrement}
          onResetFilters={() => {
            setSearchQuery('');
            setSelectedCategory('All');
          }}
        />
      </section>

      {/* ------------------------------------------------------------- */}
      {/* ARCHITECTURE HIGHLIGHTS */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-3xl p-8 sm:p-10 border bg-[#f7f2e8] border-[#e2d8c3] dark:bg-[#151311] dark:border-[#25211c]">
        <div className="max-w-2xl mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-[#1c1713] dark:text-[#f8f5ee]">
            Engineered for Transparency & Integrity
          </h2>
          <p className="text-sm text-[#66594b] dark:text-[#998d7e] mt-1.5">
            WinterBuilds eliminates fake download buttons, slow redirects, and untracked binary modifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border bg-[#ffffff] border-[#ded4c2] dark:bg-[#191714] dark:border-[#27231e]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm mb-1 text-[#1c1713] dark:text-[#f8f5ee]">
              Direct-to-Storage Uploads
            </h3>
            <p className="text-xs leading-relaxed text-[#6b5e50] dark:text-[#918575]">
              Uploads flow directly from the admin browser into durable object storage, avoiding server memory bottlenecks or proxy truncations.
            </p>
          </div>

          <div className="p-5 rounded-2xl border bg-[#ffffff] border-[#ded4c2] dark:bg-[#191714] dark:border-[#27231e]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm mb-1 text-[#1c1713] dark:text-[#f8f5ee]">
              SHA-256 Checksums
            </h3>
            <p className="text-xs leading-relaxed text-[#6b5e50] dark:text-[#918575]">
              Every application package has its cryptographic digest generated and displayed so you can verify binary integrity on your device.
            </p>
          </div>

          <div className="p-5 rounded-2xl border bg-[#ffffff] border-[#ded4c2] dark:bg-[#191714] dark:border-[#27231e]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm mb-1 text-[#1c1713] dark:text-[#f8f5ee]">
              Gemini AI Enhancement
            </h3>
            <p className="text-xs leading-relaxed text-[#6b5e50] dark:text-[#918575]">
              Administrators can leverage Gemini to automatically summarize release notes, highlight features, and clean changelog entries.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
