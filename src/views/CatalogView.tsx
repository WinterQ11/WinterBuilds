import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  X, 
  Layers, 
  PackageSearch,
  Lock,
  Smartphone
} from 'lucide-react';
import { AppListing, AppCategory, APP_CATEGORIES } from '../types';
import { AppCard } from '../components/AppCard';

interface CatalogViewProps {
  apps: AppListing[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectApp: (id: string) => void;
  onQuickDownload: (app: AppListing) => void;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  isLoading: boolean;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  apps,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSelectApp,
  onQuickDownload,
  onNavigate,
  isLoading,
}) => {
  const [sortOption, setSortOption] = useState<'newest' | 'popular' | 'name'>('newest');

  // Filter apps
  const filteredApps = apps.filter((app) => {
    const matchesCategory =
      !selectedCategory ||
      selectedCategory === 'All' ||
      app.category.toLowerCase() === selectedCategory.toLowerCase();

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      app.title.toLowerCase().includes(q) ||
      app.packageName.toLowerCase().includes(q) ||
      app.developer.toLowerCase().includes(q) ||
      app.shortDescription.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  // Sort apps
  const sortedApps = [...filteredApps].sort((a, b) => {
    if (sortOption === 'popular') {
      return (b.downloadsCount || 0) - (a.downloadsCount || 0);
    }
    if (sortOption === 'name') {
      return a.title.localeCompare(b.title);
    }
    // Default newest
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const categoriesWithAll = ['All', ...APP_CATEGORIES];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7c4d29]">
          <Layers className="w-4 h-4" />
          <span>Browse Apps</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#281e16] tracking-tight">
          All Android Apps
        </h1>
        <p className="text-xs sm:text-sm text-[#6e5d4f] max-w-2xl">
          Find the apps you need. Browse by category, sort by popular apps, or search for your favorite tools.
        </p>
      </div>

      {/* Filter & Search Bar Controls */}
      <div className="bg-[#ffffff] border border-[#ded5c5] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        
        {/* Search input & Sort selector row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <input
              id="input-catalog-search"
              type="text"
              placeholder="Search apps by name, creator, or keywords..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#faf7f2] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs sm:text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[#7c4d29] focus:ring-1 focus:ring-[#7c4d29]/30 transition-all"
            />
            <Search className="w-4 h-4 text-[#8a796b] absolute left-3.5 top-3 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2.5 text-[#8a796b] hover:text-[#281e16]"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="select-catalog-sort" className="text-xs text-[#6e5d4f] flex items-center gap-1.5 whitespace-nowrap">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#8a796b]" />
              <span>Sort:</span>
            </label>
            <select
              id="select-catalog-sort"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="bg-[#faf7f2] border border-[#e2d8c7] text-xs sm:text-sm text-[#281e16] rounded-xl px-3 py-2 focus:outline-none focus:border-[#7c4d29] cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Downloaded</option>
              <option value="name">Name (A to Z)</option>
            </select>
          </div>

        </div>

        {/* Category Filter Pills */}
        <div className="pt-2 border-t border-[#ede5d8]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-xs text-[#6e5d4f] mr-1.5 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Category:
            </span>
            {categoriesWithAll.map((cat) => {
              const isSelected = (!selectedCategory && cat === 'All') || selectedCategory === cat;
              return (
                <button
                  key={cat}
                  id={`btn-catalog-filter-${cat.toLowerCase()}`}
                  onClick={() => onSelectCategory(cat === 'All' ? '' : cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#6b4423] text-[#fdfcf9] shadow-xs font-semibold'
                      : 'bg-[#f5eee3] text-[#6e5d4f] hover:text-[#281e16] hover:bg-[#ebe2d4] border border-[#ded3c2]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-[#7d6c5d] px-1">
        <span>
          Showing <span className="font-semibold text-[#281e16]">{sortedApps.length}</span> of{' '}
          <span className="font-semibold text-[#281e16]">{apps.length}</span> apps
          {selectedCategory && selectedCategory !== 'All' && ` in "${selectedCategory}"`}
          {searchQuery && ` matching "${searchQuery}"`}
        </span>
        {(selectedCategory || searchQuery) && (
          <button
            onClick={() => {
              onSelectCategory('');
              onSearchChange('');
            }}
            className="text-[#7c4d29] hover:text-[#5e381b] font-medium text-xs flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Apps Grid or Empty States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
        /* HELPFUL EMPTY STATE: NO APPS IN REPOSITORY */
        <div 
          id="catalog-empty-repository"
          className="rounded-2xl border border-[#e5ded3] bg-[#ffffff] p-10 sm:p-14 text-center max-w-2xl mx-auto space-y-4 shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#faf6f0] border border-[#e5ded3] flex items-center justify-center mx-auto text-[#7c4d29]">
            <Smartphone className="w-8 h-8 text-[#7c4d29]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[#281e16]">
              No Apps Available Yet
            </h3>
            <p className="text-xs sm:text-sm text-[#6e5d4f] leading-relaxed max-w-lg mx-auto">
              There are no apps listed on the website yet. If you are the website owner, log in to add your first app.
            </p>
          </div>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="btn-catalog-empty-admin"
              onClick={() => onNavigate('admin')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Manage My Website</span>
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#f5eee3] hover:bg-[#ebe2d4] text-[#4d3c2e] hover:text-[#281e16] border border-[#ded3c2] font-medium text-xs transition-all"
            >
              Go Back Home
            </button>
          </div>
        </div>
      ) : sortedApps.length === 0 ? (
        /* HELPFUL EMPTY STATE: FILTER YIELDED NO RESULTS */
        <div 
          id="catalog-no-filter-results"
          className="rounded-2xl border border-[#e5ded3] bg-[#ffffff] p-10 text-center max-w-xl mx-auto space-y-3 shadow-xs"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#faf6f0] border border-[#e5ded3] flex items-center justify-center mx-auto text-[#8a796b]">
            <PackageSearch className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#281e16]">No apps found. Try another search.</h3>
          <p className="text-xs text-[#6e5d4f] leading-relaxed">
            We could not find any apps with that name or category. Try typing another word or clearing your filters.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                onSelectCategory('');
                onSearchChange('');
              }}
              className="px-4 py-2 rounded-lg bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] text-xs font-semibold transition-all shadow-xs"
            >
              Show All Apps
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onSelectApp={onSelectApp}
              onQuickDownload={onQuickDownload}
            />
          ))}
        </div>
      )}

    </div>
  );
};
