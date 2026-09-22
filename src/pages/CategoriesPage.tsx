import React, { useState, useEffect } from 'react';
import { APP_CATEGORIES, AppCategory } from '../types';
import { api } from '../services/api';
import {
  Gamepad2,
  Wrench,
  Briefcase,
  GraduationCap,
  Film,
  Camera,
  MessageCircle,
  FolderCog,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface CategoriesPageProps {
  onSelectCategory: (category: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ onSelectCategory }) => {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadCategoryStats();
  }, []);

  const loadCategoryStats = async () => {
    try {
      const res = await api.getApps({ limit: 200 });
      const tally: Record<string, number> = {};
      res.applications.forEach((app) => {
        tally[app.category] = (tally[app.category] || 0) + 1;
      });
      setCounts(tally);
    } catch {
      // ignore
    }
  };

  const getCategoryIcon = (cat: AppCategory) => {
    switch (cat) {
      case 'Games':
        return Gamepad2;
      case 'Tools':
        return Wrench;
      case 'Productivity':
        return Briefcase;
      case 'Education':
        return GraduationCap;
      case 'Entertainment':
        return Film;
      case 'Photography':
        return Camera;
      case 'Social':
      case 'Communication':
        return MessageCircle;
      case 'Utilities':
        return FolderCog;
      default:
        return Layers;
    }
  };

  return (
    <div className="space-y-8 pb-16 pt-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1c1713] dark:text-[#f8f5ee]">
          Categories
        </h1>
        <p className="text-xs text-[#736555] dark:text-[#8f8373] mt-1">
          Explore verified Android applications grouped by specialty and functionality
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {APP_CATEGORIES.map((cat) => {
          const Icon = getCategoryIcon(cat);
          const count = counts[cat] || 0;

          return (
            <div
              key={cat}
              id={`category-card-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => onSelectCategory(cat)}
              className="group p-6 rounded-3xl border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md bg-[#ffffff] border-[#e2d8c3] hover:border-amber-600/40 dark:bg-[#181614] dark:border-[#27231e] dark:hover:border-amber-400/30"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="font-mono text-xs px-2.5 py-1 rounded-full border bg-[#f3ecdf] border-[#ded3be] text-[#55493b] dark:bg-[#201d19] dark:border-[#302b23] dark:text-[#9e9282]">
                  {count} {count === 1 ? 'app' : 'apps'}
                </span>
              </div>

              <h3 className="font-bold text-lg mb-1 text-[#1c1713] dark:text-[#f8f5ee] group-hover:text-amber-600 transition-colors">
                {cat}
              </h3>
              <p className="text-xs text-[#6e6051] dark:text-[#908475] mb-4">
                Discover verified Android releases for {cat.toLowerCase()}
              </p>

              <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                <span>Browse {cat}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
