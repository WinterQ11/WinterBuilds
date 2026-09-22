import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search by name, package name, or keywords...',
  className = '',
}) => {
  const [localVal, setLocalVal] = useState(value);

  // Debounce input to prevent lagging on rapid typing
  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [localVal]);

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-4 w-5 h-5 text-[#857767] dark:text-[#8a7e70] pointer-events-none" />
      <input
        id="app-search-input"
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-3 rounded-2xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-[#ffffff] border-[#ded4c3] text-[#1f1914] placeholder-[#9c8f7f] dark:bg-[#191715] dark:border-[#2b2721] dark:text-[#f8f5ee] dark:placeholder-[#6b6256]"
      />
      {localVal && (
        <button
          type="button"
          onClick={() => {
            setLocalVal('');
            onChange('');
          }}
          aria-label="Clear search"
          className="absolute right-3.5 p-1 rounded-lg text-[#857767] hover:bg-[#eae0ce] dark:text-[#8a7e70] dark:hover:bg-[#25211c]"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
