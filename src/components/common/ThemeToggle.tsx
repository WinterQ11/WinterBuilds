import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getInitialTheme, applyTheme, Theme } from '../../lib/theme';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900" />
    );
  }

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      className="p-2.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-[#f4eee4] hover:bg-[#eae2d4] text-[#4a3f35] border-[#dcd4c5] dark:bg-[#1e1c1a] dark:hover:bg-[#282522] dark:text-[#d4cbbf] dark:border-[#332f2a]"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-amber-700 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
};
