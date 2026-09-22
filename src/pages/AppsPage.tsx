import React, { useState, useEffect } from 'react';
import type { Application } from '../types';
import { api } from '../services/api';
import { SearchBar } from '../components/apps/SearchBar';
import { CategoryFilter } from '../components/apps/CategoryFilter';
import { AppGrid } from '../components/apps/AppGrid';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface AppsPageProps {
  onSelectApp: (app: Application) => void;
  initialCategory?: string;
  initialFeatured?: boolean;
}

export const AppsPage: React.FC<AppsPageProps> = ({
  onSelectApp,
  initialCategory = 'All',
  initialFeatured,
}) => {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<'latest' | 'downloads' | 'updated' | 'name'>('latest');
  const [filterFeatured, setFilterFeatured] = useState<boolean | undefined>(initialFeatured);

  useEffect(() => {
    loadApps();
  }, [selectedCategory, sortBy, filterFeatured]);

  const loadApps = async () => {
    setIsLoading(true);
    try {
      const res = await api.getApps({
        category: selectedCategory,
        sort: sortBy,
        featured: filterFeatured,
        limit: 100,
      });
      setApps(res.applications);
    } catch (err) {
      console.warn('Failed to load apps:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadIncrement = (appId: string, newCount: number) => {
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, downloads_count: newCount } : a))
    );
  };

  const filteredApps = apps.filter((app) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.name.toLowerCase().includes(q) ||
      app.package_name.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1c1713] dark:text-[#f8f5ee]">
            All Applications
          </h1>
          <p className="text-xs text-[#736555] dark:text-[#8f8373] mt-1">
            Browse through our verified repository of Android applications
          </p>
        </div>

        {/* Sort & Filter controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs bg-[#ffffff] border-[#ded4c3] text-[#4d4032] dark:bg-[#181614] dark:border-[#2b2721] dark:text-[#cbbfae]">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer"
            >
              <option value="latest">Newest Releases</option>
              <option value="downloads">Most Downloaded</option>
              <option value="updated">Recently Updated</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>

          <button
            onClick={() => setFilterFeatured(filterFeatured ? undefined : true)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filterFeatured
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-[#ffffff] border-[#ded4c3] text-[#4d4032] dark:bg-[#181614] dark:border-[#2b2721] dark:text-[#cbbfae]'
            }`}
          >
            {filterFeatured ? '★ Featured Only' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Filter by name, package name, or keywords..."
      />

      {/* Categories Bar */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Results Count */}
      <div className="text-xs font-mono text-[#807261] dark:text-[#827768]">
        Showing {filteredApps.length} {filteredApps.length === 1 ? 'application' : 'applications'}
      </div>

      {/* Applications Grid */}
      <AppGrid
        apps={filteredApps}
        isLoading={isLoading}
        onSelectApp={onSelectApp}
        onDownloadIncrement={handleDownloadIncrement}
        onResetFilters={() => {
          setSearchQuery('');
          setSelectedCategory('All');
          setFilterFeatured(undefined);
          setSortBy('latest');
        }}
      />
    </div>
  );
};
