import React from 'react';
import { ShieldCheck, Download, Cpu, Github, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t transition-colors duration-200 bg-[#f4ede0] border-[#e2d8c3] dark:bg-[#0f0e0d] dark:border-[#221f1b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-gradient-to-br from-amber-600 to-amber-700 text-amber-50">
                <span>W</span>
                <span className="text-amber-300 text-[10px] ml-0.5 font-mono">B</span>
              </div>
              <span className="font-extrabold text-lg tracking-tight text-[#221c17] dark:text-[#f8f5ee]">
                WINTER<span className="text-amber-600 dark:text-amber-400">BUILDS</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-md text-[#6c6155] dark:text-[#9c9183]">
              A high-performance Android APK Hub engineered for direct-to-storage delivery, verified cryptographic SHA-256 package integrity, and seamless browsing across all devices.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#7d7163] dark:text-[#8e8476]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#eae1d0] dark:bg-[#1a1815] border border-[#dacdb6] dark:border-[#292520]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Verified Packages
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#eae1d0] dark:bg-[#1a1815] border border-[#dacdb6] dark:border-[#292520]">
                <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Direct CDN Delivery
              </span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold mb-3.5 text-[#3a3127] dark:text-[#d4c9b8]">
              Navigation
            </h3>
            <ul className="space-y-2.5 text-sm text-[#665a4e] dark:text-[#a39789]">
              <li>
                <button onClick={() => onNavigate('/')} className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/apps')} className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                  All Applications
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/categories')} className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                  Categories
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/about')} className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                  Architecture & Security
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Administration */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold mb-3.5 text-[#3a3127] dark:text-[#d4c9b8]">
              Management
            </h3>
            <ul className="space-y-2.5 text-sm text-[#665a4e] dark:text-[#a39789]">
              <li>
                <button onClick={() => onNavigate('/admin')} className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                  Admin Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/admin/login')} className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                  Admin Sign In
                </button>
              </li>
              <li>
                <span className="inline-flex items-center gap-1 text-xs text-[#8c8072] dark:text-[#7d7367]">
                  <Cpu className="w-3 h-3" />
                  Vercel Serverless Ready
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7d7163] border-[#e2d8c3] dark:border-[#221f1b] dark:text-[#82786b]">
          <p>© {new Date().getFullYear()} WinterBuilds. Verified Android distribution.</p>
          <div className="flex items-center gap-4">
            <span>Direct Browser-to-Storage Uploads</span>
            <span>•</span>
            <span>Supabase PostgreSQL</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
