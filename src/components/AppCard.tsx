import React from 'react';
import { 
  Download, 
  ShieldCheck, 
  HardDrive, 
  Layers, 
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { AppListing } from '../types';
import { getAssetUrl } from '../api';

interface AppCardProps {
  app: AppListing;
  onSelectApp: (id: string) => void;
  onQuickDownload?: (app: AppListing) => void;
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  onSelectApp,
  onQuickDownload,
}) => {
  return (
    <div 
      id={`card-app-${app.id}`}
      className="group relative bg-[#ffffff] border border-[#e5ded3] hover:border-[#c9b7a2] rounded-xl p-5 transition-all duration-200 hover:shadow-[0_8px_24px_rgba(107,68,35,0.08)] flex flex-col justify-between"
    >
      <div>
        {/* Top Header: Icon & Metadata */}
        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div 
            onClick={() => onSelectApp(app.id)}
            className="cursor-pointer shrink-0 w-16 h-16 rounded-2xl bg-[#faf6f0] border border-[#e5ded3] p-1 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-200 shadow-xs"
          >
            {app.iconUrl ? (
              <img
                src={getAssetUrl(app.iconUrl)}
                alt={`${app.title} icon`}
                className="w-full h-full object-cover rounded-xl"
                loading="lazy"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-full h-full rounded-xl bg-[#f0e6d6] flex items-center justify-center text-[#6b4423] font-bold text-xl ${app.iconUrl ? 'hidden' : ''}`}>
              {app.title.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Title & Developer */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#f5eee3] border border-[#e3d7c5] text-[#6b4423]">
                {app.category}
              </span>
              {app.isVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2d5c37] bg-[#edf4ee] border border-[#cbe0ce] px-1.5 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3" />
                  Safe & Checked
                </span>
              )}
            </div>

            <h3 
              onClick={() => onSelectApp(app.id)}
              className="text-base font-bold text-[#281e16] group-hover:text-[#7c4d29] transition-colors cursor-pointer truncate"
              title={app.title}
            >
              {app.title}
            </h3>

            <p className="text-xs text-[#6e5d4f] truncate">
              {app.developer}
            </p>
          </div>
        </div>

        {/* Short Description */}
        <p className="mt-3.5 text-xs text-[#6e5d4f] line-clamp-2 leading-relaxed">
          {app.shortDescription || app.description || 'Safe Android app ready to download and use.'}
        </p>

        {/* Technical Specs Pills */}
        <div className="mt-4 flex items-center gap-2 flex-wrap text-[11px] text-[#7d6c5d] border-t border-[#ede6db] pt-3">
          <div className="flex items-center gap-1">
            <span className="text-[#3f3126] font-mono">v{app.version}</span>
          </div>
          <span className="text-[#cfc3b2]">•</span>
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-[#8a796b]" />
            <span>{app.fileSize || '15 MB'}</span>
          </div>
          <span className="text-[#cfc3b2]">•</span>
          <div className="flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-[#8a796b]" />
            <span className="truncate max-w-[100px]">{app.minAndroid.split(' ')[0] || 'Android'}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 flex items-center justify-between gap-2 border-t border-[#ede6db]/60">
        <span className="text-[11px] text-[#7d6c5d]">
          <span className="font-semibold text-[#281e16]">{app.downloadsCount || 0}</span> downloads
        </span>

        <div className="flex items-center gap-1.5">
          <button
            id={`btn-view-app-${app.id}`}
            onClick={() => onSelectApp(app.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#4d3c2e] hover:text-[#281e16] bg-[#f5eee3] hover:bg-[#ebe2d4] border border-[#ded3c2] transition-all"
          >
            View Details
          </button>

          <button
            id={`btn-download-app-${app.id}`}
            onClick={() => {
              if (onQuickDownload) {
                onQuickDownload(app);
              } else {
                onSelectApp(app.id);
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#fdfcf9] bg-[#6b4423] hover:bg-[#543318] transition-all flex items-center gap-1 shadow-xs active:scale-95"
            title="Download App"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
