import React from 'react';
import type { Application } from '../../types';
import { AppCard } from './AppCard';
import { Smartphone, RefreshCw, SearchX } from 'lucide-react';

interface AppGridProps {
  apps: Application[];
  isLoading?: boolean;
  onSelectApp: (app: Application) => void;
  onDownloadIncrement?: (appId: string, newCount: number) => void;
  onResetFilters?: () => void;
}

export const AppGrid: React.FC<AppGridProps> = ({
  apps,
  isLoading = false,
  onSelectApp,
  onDownloadIncrement,
  onResetFilters,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 border animate-pulse bg-[#f2ebd9] border-[#ded3be] dark:bg-[#181614] dark:border-[#27231e]"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#e4dac5] dark:bg-[#24201b]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#e4dac5] dark:bg-[#24201b] rounded-md w-3/4" />
                <div className="h-3 bg-[#e4dac5] dark:bg-[#24201b] rounded-md w-1/2" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-[#e4dac5] dark:bg-[#24201b] rounded-md w-full" />
              <div className="h-3 bg-[#e4dac5] dark:bg-[#24201b] rounded-md w-5/6" />
            </div>
            <div className="h-8 bg-[#e4dac5] dark:bg-[#24201b] rounded-xl w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="rounded-3xl p-12 text-center border my-8 bg-[#ffffff] border-[#ded4c2] dark:bg-[#161412] dark:border-[#25211c]">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 bg-amber-500/15 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
          <SearchX className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold mb-1 text-[#221c17] dark:text-[#f8f5ee]">
          No Applications Found
        </h3>
        <p className="text-sm max-w-md mx-auto mb-6 text-[#6c6052] dark:text-[#9e9282]">
          We couldn't find any applications matching your query or filter criteria. Try adjusting your search term.
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors bg-[#f4ece0] hover:bg-[#eadecb] text-[#3b3227] border-[#d8cbaf] dark:bg-[#201d19] dark:hover:bg-[#292520] dark:text-[#d0c5b4] dark:border-[#352f27]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {apps.map((app) => (
        <AppCard
          key={app.id}
          app={app}
          onSelect={onSelectApp}
          onDownloadIncrement={onDownloadIncrement}
        />
      ))}
    </div>
  );
};
