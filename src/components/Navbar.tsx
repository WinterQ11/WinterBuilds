import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Menu, 
  X, 
  Lock, 
  Sparkles, 
  Layers, 
  Info, 
  Mail,
  Smartphone
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  isAdminAuthenticated: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isAdminAuthenticated,
  searchQuery,
  onSearchChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const handleNav = (view: string, params?: Record<string, string>) => {
    onNavigate(view, params);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Smartphone },
    { id: 'catalog', label: 'All Apps', icon: Layers },
    { id: 'about', label: 'About Us', icon: Info },
    { id: 'contact', label: 'Help & Contact', icon: Mail },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e6dece] bg-[#fbf9f4]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <button
          id="btn-nav-brand"
          onClick={() => handleNav('home')}
          className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8c6543] rounded-lg p-1"
        >
          <div className="w-10 h-10 rounded-xl bg-[#f0e6d6] border border-[#d8c8b4] flex items-center justify-center text-[#6b4423] group-hover:border-[#b89f84] transition-all shadow-sm">
            <ShieldCheck className="w-5 h-5 text-[#6b4423] transition-transform group-hover:scale-110" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-[#281e16] group-hover:text-[#6b4423] transition-colors">
                Winter<span className="text-[#7c4d29]">Build</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#ebdcc9] border border-[#d9c7b0] text-[#5e381a]">
                Apps
              </span>
            </div>
            <p className="text-[11px] text-[#736254] hidden sm:block">Safe & Free Android Apps</p>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`btn-nav-${item.id}`}
                onClick={() => handleNav(item.id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#ede4d5] text-[#5a361a] border border-[#d8cbba] shadow-sm'
                    : 'text-[#635345] hover:text-[#281e16] hover:bg-[#ede5d6]/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#6b4423]' : 'text-[#827263]'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Search Bar & Admin Action */}
        <div className="flex items-center gap-3">
          
          {/* Quick Search */}
          <div className="relative">
            <div className="relative flex items-center">
              <input
                id="input-nav-search"
                type="text"
                placeholder="Search apps by name..."
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (currentView !== 'catalog') {
                    onNavigate('catalog');
                  }
                }}
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => setIsSearchExpanded(false)}
                className={`bg-[#ffffff] border border-[#ded5c5] text-[#281e16] placeholder-[#9a897b] text-xs sm:text-sm rounded-lg pl-9 pr-4 py-1.5 sm:py-2 focus:outline-none focus:border-[#7c4d29] focus:ring-1 focus:ring-[#7c4d29]/40 transition-all ${
                  isSearchExpanded ? 'w-48 sm:w-64 border-[#7c4d29]' : 'w-36 sm:w-52'
                }`}
              />
              <Search className="w-4 h-4 text-[#827263] absolute left-3 pointer-events-none" />
            </div>
          </div>

          {/* Admin Dashboard Trigger */}
          <button
            id="btn-nav-admin"
            onClick={() => handleNav('admin')}
            className={`px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 transition-all border ${
              isAdminAuthenticated
                ? 'bg-[#eef4ee] text-[#2c5836] border-[#c8dec9] hover:bg-[#e4ede5]'
                : currentView === 'admin'
                ? 'bg-[#ede3d3] text-[#5b371b] border-[#cfbea8]'
                : 'bg-[#ffffff] text-[#4f3e30] border-[#ded5c5] hover:border-[#c5b8a5] hover:text-[#281e16]'
            }`}
            title="Website Manager"
          >
            <Lock className={`w-3.5 h-3.5 ${isAdminAuthenticated ? 'text-[#2e623b]' : 'text-[#827263]'}`} />
            <span className="hidden sm:inline">
              {isAdminAuthenticated ? 'Manage Website' : 'Owner Login'}
            </span>
          </button>

          {/* Mobile Menu Button */}
          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#635345] hover:text-[#281e16] hover:bg-[#ede4d5] focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#e6dece] bg-[#faf7f0] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#ede4d5] text-[#5a361a] border border-[#d8cbba]'
                    : 'text-[#635345] hover:text-[#281e16] hover:bg-[#f1ebd0]/60'
                }`}
              >
                <Icon className="w-4 h-4 text-[#6b4423]" />
                {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-[#e6dece] mt-2">
            <button
              onClick={() => handleNav('admin')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#635345] hover:text-[#281e16] hover:bg-[#ede4d5]"
            >
              <Lock className="w-4 h-4 text-[#6b4423]" />
              {isAdminAuthenticated ? 'Manage My Website' : 'Owner Login'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
