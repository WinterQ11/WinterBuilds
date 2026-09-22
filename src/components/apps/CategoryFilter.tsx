import React from 'react';
import { APP_CATEGORIES, AppCategory } from '../../types';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories = ['All', ...APP_CATEGORIES];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {categories.map((cat) => {
        const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
        return (
          <button
            key={cat}
            id={`filter-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => onSelectCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight whitespace-nowrap transition-all duration-150 border ${
              isSelected
                ? 'bg-amber-600 border-amber-600 text-white shadow-sm shadow-amber-900/20 dark:bg-amber-500 dark:border-amber-500 dark:text-neutral-950'
                : 'bg-[#ffffff] hover:bg-[#f5ede0] border-[#ded4c3] text-[#554a3e] dark:bg-[#181614] dark:hover:bg-[#221f1b] dark:border-[#2a2620] dark:text-[#a69b8d]'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};
