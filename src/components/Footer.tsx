import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onOpenDeployGuide?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full border-t border-[#e2d8c7] bg-[#f2ece1] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          
          {/* Col 1: Brand & Philosophy */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e5dbc9] border border-[#d3c4b0] flex items-center justify-center text-[#6b4423]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-[#281e16]">
                Winter<span className="text-[#7c4d29]">Build</span>
              </span>
            </div>
            <p className="text-xs text-[#6e5d4f] leading-relaxed">
              WinterBuild is a safe and simple place to get Android apps. 
              We give you clean apps with no extra junk or hidden installers.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs text-[#6e5d4f]">
              <span className="w-2 h-2 rounded-full bg-[#3f6d48] animate-pulse"></span>
              App Store is Online
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#4d3c2e] mb-3">
              Pages
            </h4>
            <ul className="space-y-2 text-xs text-[#6e5d4f]">
              <li>
                <button
                  id="btn-footer-home"
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#6b4423] transition-colors"
                >
                  Featured Apps
                </button>
              </li>
              <li>
                <button
                  id="btn-footer-catalog"
                  onClick={() => onNavigate('catalog')}
                  className="hover:text-[#6b4423] transition-colors"
                >
                  All Apps
                </button>
              </li>
              <li>
                <button
                  id="btn-footer-about"
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#6b4423] transition-colors"
                >
                  How We Check Apps
                </button>
              </li>
              <li>
                <button
                  id="btn-footer-contact"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#6b4423] transition-colors"
                >
                  Help & Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Platform Administration */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#4d3c2e] mb-3">
              Website Owner
            </h4>
            <div className="space-y-2.5">
              <button
                id="btn-footer-admin"
                onClick={() => onNavigate('admin')}
                className="w-full text-left text-xs text-[#4d3c2e] hover:text-[#281e16] bg-[#faf7f2] border border-[#ded4c3] rounded-lg p-2.5 flex items-center justify-between group hover:border-[#c5b8a5] transition-all shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#6b4423]" />
                  Manage Website
                </span>
                <span className="text-[10px] text-[#7d6c5d]">Private</span>
              </button>
            </div>
          </div>

        </div>

        <div className="border-t border-[#e2d8c7] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7d6c5d]">
          <p>
            © {new Date().getFullYear()} WinterBuild. Made for everyone who loves Android apps.
          </p>
        </div>
      </div>
    </footer>
  );
};
