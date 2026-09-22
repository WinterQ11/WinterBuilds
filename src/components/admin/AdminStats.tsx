import React from 'react';
import type { DashboardStats } from '../../types';
import { Layers, CheckCircle2, FileEdit, DownloadCloud, Sparkles } from 'lucide-react';
import { formatNumber } from '../../lib/formatters';

interface AdminStatsProps {
  stats: DashboardStats;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ stats }) => {
  const cards = [
    {
      label: 'Total Applications',
      value: stats.totalApps,
      icon: Layers,
      color: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-blue-500/10 dark:bg-blue-400/10',
    },
    {
      label: 'Published Releases',
      value: stats.publishedApps,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    },
    {
      label: 'Draft Applications',
      value: stats.draftApps,
      icon: FileEdit,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 dark:bg-amber-400/10',
    },
    {
      label: 'Total Downloads',
      value: formatNumber(stats.totalDownloads),
      icon: DownloadCloud,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10 dark:bg-purple-400/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="rounded-2xl p-5 border shadow-xs flex items-center justify-between bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#28241e]"
          >
            <div>
              <p className="text-xs font-mono uppercase tracking-wider font-semibold text-[#7d7062] dark:text-[#8e8274]">
                {c.label}
              </p>
              <p className="text-2xl font-extrabold mt-1 text-[#1f1914] dark:text-[#f8f5ee]">
                {c.value}
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${c.bg} ${c.color}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
