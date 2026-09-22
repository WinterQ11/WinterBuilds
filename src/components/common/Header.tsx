import React, { useState, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ShieldCheck, Menu, X, ArrowUpRight, LayoutDashboard, LogIn, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isAdmin: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate, isAdmin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Apps', path: '/apps' },
    { name: 'Categories', path: '/categories' },
    { name: 'About', path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md transition-colors duration-200 bg-[#faf6ef]/90 border-b border-[#e6decb] dark:bg-[#121110]/90 dark:border-[#25221e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              id="brand-logo-btn"
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm transition-transform duration-200 group-hover:scale-105 bg-gradient-to-br from-amber-600 to-amber-700 text-amber-50 shadow-amber-900/20">
                <span className="tracking-tighter">W</span>
                <span className="text-amber-300 text-xs font-mono ml-0.5">B</span>
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-[#221c17] dark:text-[#f8f5ee]">
                  WINTER<span className="text-amber-600 dark:text-amber-400">BUILDS</span>
                </span>
                <span className="hidden sm:block text-[10px] uppercase font-mono tracking-wider text-[#857a6e] dark:text-[#908678]">
                  Android APK Hub
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const active = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  id={`nav-link-${item.name.toLowerCase()}`}
                  onClick={() => onNavigate(item.path)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-[#ede5d5] text-[#1f1914] dark:bg-[#221f1b] dark:text-amber-300'
                      : 'text-[#6c6155] hover:text-[#1f1914] hover:bg-[#f2ece0] dark:text-[#a09587] dark:hover:text-[#f5f1ea] dark:hover:bg-[#1a1816]'
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Auth Controls */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            {isAdmin ? (
              <button
                id="header-admin-dashboard-btn"
                onClick={() => onNavigate('/admin')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm bg-[#e8deca] hover:bg-[#ded1ba] text-[#2c241d] border border-[#d6c9b0] dark:bg-[#25221d] dark:hover:bg-[#302c25] dark:text-amber-300 dark:border-[#38332a]"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Admin Dashboard</span>
              </button>
            ) : (
              <button
                id="header-admin-login-btn"
                onClick={() => onNavigate('/admin/login')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all bg-[#f3ece0] hover:bg-[#eae2d3] text-[#5c5043] border border-[#ded5c2] dark:bg-[#1a1815] dark:hover:bg-[#23201c] dark:text-[#ab9f8f] dark:border-[#2e2a24]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="md:hidden p-2.5 rounded-xl border bg-[#f4eee4] border-[#dcd4c5] text-[#4a3f35] dark:bg-[#1e1c1a] dark:border-[#332f2a] dark:text-[#d4cbbf]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t px-4 pt-3 pb-5 space-y-1 bg-[#f7f2e8] border-[#e6decb] dark:bg-[#161412] dark:border-[#282420]">
          {navItems.map((item) => {
            const active = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-base font-semibold ${
                  active
                    ? 'bg-[#eae0cf] text-[#1c1713] dark:bg-[#24211d] dark:text-amber-300'
                    : 'text-[#6c6155] dark:text-[#a09587]'
                }`}
              >
                {item.name}
              </button>
            );
          })}

          <div className="pt-2 border-t border-[#e2d8c3] dark:border-[#26221d]">
            {isAdmin ? (
              <button
                onClick={() => {
                  onNavigate('/admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 text-white dark:bg-amber-500 dark:text-neutral-950"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onNavigate('/admin/login');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border bg-[#efe7d8] border-[#dcd1bc] text-[#4d4236] dark:bg-[#1e1c18] dark:border-[#332f28] dark:text-[#c4b9a8]"
              >
                <LogIn className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
