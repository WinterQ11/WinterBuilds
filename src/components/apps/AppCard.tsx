import React, { useState } from 'react';
import type { Application } from '../../types';
import { Badge } from '../common/Badge';
import { DownloadButton } from './DownloadButton';
import { formatBytes, formatDate, formatNumber } from '../../lib/formatters';
import { Download, Sparkles, Smartphone } from 'lucide-react';

interface AppCardProps {
  app: Application;
  onSelect: (app: Application) => void;
  onDownloadIncrement?: (appId: string, newCount: number) => void;
}

export const AppCard: React.FC<AppCardProps> = ({ app, onSelect, onDownloadIncrement }) => {
  const [iconError, setIconError] = useState(false);

  return (
    <div
      id={`app-card-${app.slug}`}
      onClick={() => onSelect(app)}
      className="group relative flex flex-col justify-between rounded-2xl p-5 border transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-lg bg-[#ffffff] border-[#e4dcce] hover:border-amber-600/40 shadow-sm dark:bg-[#191715] dark:border-[#2a2621] dark:hover:border-amber-400/30"
    >
      <div>
        {/* Top: Icon + Title + Version */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border flex items-center justify-center shadow-xs bg-[#f4eee4] border-[#e0d6c5] dark:bg-[#221f1b] dark:border-[#332f28]">
            {app.icon_url && !iconError ? (
              <img
                src={app.icon_url}
                alt={`${app.name} icon`}
                className="w-full h-full object-cover"
                onError={() => setIconError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Smartphone className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-base leading-tight truncate text-[#1f1914] group-hover:text-amber-700 dark:text-[#f7f4ee] dark:group-hover:text-amber-400 transition-colors">
                {app.name}
              </h3>
              {app.featured && (
                <span title="Featured Application" className="text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-3.5 h-3.5 fill-amber-500/30" />
                </span>
              )}
            </div>

            <p className="text-xs font-mono text-[#807466] dark:text-[#8f8475] truncate mt-0.5">
              {app.package_name}
            </p>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="amber" size="sm">
                v{app.version_name}
              </Badge>
              <Badge variant="default" size="sm">
                {app.category}
              </Badge>
            </div>
          </div>
        </div>

        {/* Middle: Short Description */}
        <p className="text-xs leading-relaxed line-clamp-2 mb-4 text-[#5c5043] dark:text-[#a09485]">
          {app.short_description || app.description}
        </p>
      </div>

      {/* Bottom Metadata & Download Button */}
      <div className="pt-3 border-t flex items-center justify-between gap-2 border-[#eee6d8] dark:border-[#26221d]">
        <div className="flex flex-col text-[11px] font-mono text-[#786c5e] dark:text-[#8a7e70]">
          <span>{formatBytes(app.apk_file_size)}</span>
          <span className="flex items-center gap-1 text-[10px] text-[#918374] dark:text-[#786d60]">
            <Download className="w-2.5 h-2.5" />
            {formatNumber(app.downloads_count)} • {formatDate(app.updated_at)}
          </span>
        </div>

        <DownloadButton
          appId={app.id}
          appName={app.name}
          fileSize={app.apk_file_size}
          onDownloadSuccess={(newCount) => onDownloadIncrement?.(app.id, newCount)}
        />
      </div>
    </div>
  );
};
