import React, { useState } from 'react';
import type { Application } from '../types';
import { DownloadButton } from '../components/apps/DownloadButton';
import { Badge } from '../components/common/Badge';
import { formatBytes, formatDate, formatNumber } from '../lib/formatters';
import {
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  HardDrive,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface AppDetailPageProps {
  app: Application;
  onBack: () => void;
  onSelectCategory?: (category: string) => void;
}

export const AppDetailPage: React.FC<AppDetailPageProps> = ({
  app,
  onBack,
  onSelectCategory,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(
    app.screenshots?.[0] || null
  );
  const [downloadCount, setDownloadCount] = useState(app.downloads_count);

  const copyShaToClipboard = () => {
    if (app.apk_sha256) {
      navigator.clipboard.writeText(app.apk_sha256);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    }
  };

  // Human readable Android version mapping
  const getAndroidVersionName = (sdkLevel: number) => {
    switch (sdkLevel) {
      case 21:
      case 22:
        return 'Android 5.0 / 5.1 (Lollipop)+';
      case 23:
        return 'Android 6.0 (Marshmallow)+';
      case 24:
      case 25:
        return 'Android 7.0 / 7.1 (Nougat)+';
      case 26:
      case 27:
        return 'Android 8.0 / 8.1 (Oreo)+';
      case 28:
        return 'Android 9.0 (Pie)+';
      case 29:
        return 'Android 10+';
      case 30:
        return 'Android 11+';
      case 31:
      case 32:
        return 'Android 12 / 12L+';
      case 33:
        return 'Android 13+';
      case 34:
        return 'Android 14+';
      case 35:
        return 'Android 15+';
      default:
        return `API Level ${sdkLevel}+`;
    }
  };

  return (
    <div className="space-y-8 pb-16 pt-2">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[#7c6f5f] dark:text-[#8a7f72]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications</span>
        </button>
        <span>/</span>
        <span
          onClick={() => onSelectCategory?.(app.category)}
          className="hover:underline cursor-pointer"
        >
          {app.category}
        </span>
        <span>/</span>
        <span className="text-[#241d17] dark:text-[#f5f1e9] truncate max-w-xs">{app.name}</span>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-3xl p-6 sm:p-8 border shadow-sm bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#27231e]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shrink-0 border flex items-center justify-center shadow-sm bg-[#f2ebd9] border-[#dfd2bd] dark:bg-[#201d19] dark:border-[#332f28]">
              {app.icon_url ? (
                <img
                  src={app.icon_url}
                  alt={`${app.name} icon`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Smartphone className="w-12 h-12 text-amber-600 dark:text-amber-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-[#1c1713] dark:text-[#f8f5ee]">
                  {app.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Verified
                </span>
                {app.featured && (
                  <Badge variant="amber" size="sm">
                    Featured
                  </Badge>
                )}
              </div>

              <p className="text-xs sm:text-sm font-mono text-[#786c5e] dark:text-[#908577]">
                {app.package_name}
              </p>

              <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                <Badge variant="amber" size="sm">
                  v{app.version_name} (Build {app.version_code})
                </Badge>
                <Badge variant="default" size="sm">
                  {app.category}
                </Badge>
                <span className="text-xs text-[#7d7062] dark:text-[#887e72]">
                  Updated {formatDate(app.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Download Action */}
          <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-2 pt-2 md:pt-0">
            <DownloadButton
              appId={app.id}
              appName={app.name}
              fileSize={app.apk_file_size}
              variant="lg"
              onDownloadSuccess={(newCount) => setDownloadCount(newCount)}
            />
            <span className="text-xs text-center md:text-right font-mono text-[#85786a] dark:text-[#807567]">
              {formatNumber(downloadCount)} total verified downloads
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Description vs Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Screenshots + Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Screenshots gallery */}
          {app.screenshots && app.screenshots.length > 0 && (
            <div className="rounded-3xl p-6 border bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#27231e] space-y-4">
              <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-[#635546] dark:text-[#9c9082]">
                Screenshots Preview
              </h2>

              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
                {app.screenshots.map((shot, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveScreenshot(shot)}
                    className={`shrink-0 w-44 sm:w-56 rounded-2xl overflow-hidden border cursor-pointer transition-all ${
                      activeScreenshot === shot
                        ? 'ring-2 ring-amber-600 border-transparent shadow-md'
                        : 'border-[#dfd3bf] dark:border-[#2f2b24] opacity-85 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={shot}
                      alt={`${app.name} screenshot ${idx + 1}`}
                      className="w-full h-auto object-cover aspect-[9/16]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full description */}
          <div className="rounded-3xl p-6 sm:p-8 border bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#27231e] space-y-4">
            <h2 className="text-lg font-bold text-[#1c1713] dark:text-[#f8f5ee]">
              About {app.name}
            </h2>

            {app.short_description && (
              <p className="text-sm sm:text-base font-medium leading-relaxed text-[#3d3328] dark:text-[#d8cdbd]">
                {app.short_description}
              </p>
            )}

            <div className="text-sm leading-relaxed text-[#615344] dark:text-[#9e9384] whitespace-pre-line space-y-2">
              {app.description}
            </div>
          </div>
        </div>

        {/* Right Col: Technical Specifications */}
        <div className="space-y-6">
          <div className="rounded-3xl p-6 border bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#27231e] space-y-5">
            <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-[#635546] dark:text-[#9c9082]">
              Technical Specifications
            </h2>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#eee3d1] dark:border-[#25211c]">
                <span className="text-[#7d7062] dark:text-[#887c6e]">Package Name</span>
                <span className="font-mono font-semibold truncate max-w-[170px] text-right">
                  {app.package_name}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#eee3d1] dark:border-[#25211c]">
                <span className="text-[#7d7062] dark:text-[#887c6e]">Version Name</span>
                <span className="font-mono font-semibold">v{app.version_name}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#eee3d1] dark:border-[#25211c]">
                <span className="text-[#7d7062] dark:text-[#887c6e]">Version Code</span>
                <span className="font-mono font-semibold">{app.version_code}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#eee3d1] dark:border-[#25211c]">
                <span className="text-[#7d7062] dark:text-[#887c6e]">Minimum OS</span>
                <span className="font-medium text-right">{getAndroidVersionName(app.min_sdk || 21)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#eee3d1] dark:border-[#25211c]">
                <span className="text-[#7d7062] dark:text-[#887c6e]">Target OS</span>
                <span className="font-medium text-right">{getAndroidVersionName(app.target_sdk || 34)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#eee3d1] dark:border-[#25211c]">
                <span className="text-[#7d7062] dark:text-[#887c6e]">File Size</span>
                <span className="font-mono font-semibold">{formatBytes(app.apk_file_size)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#eee3d1] dark:border-[#25211c]">
                <span className="text-[#7d7062] dark:text-[#887c6e]">Release Date</span>
                <span>{formatDate(app.created_at)}</span>
              </div>

              {/* SHA-256 Checksum with Copy Button */}
              {app.apk_sha256 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[#7d7062] dark:text-[#887c6e]">SHA-256 Digest:</span>
                    <button
                      onClick={copyShaToClipboard}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
                    >
                      {copiedSha ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl border font-mono text-[10px] break-all leading-relaxed bg-[#f6eee2] border-[#e0d4c1] dark:bg-[#1f1d19] dark:border-[#2c2822] text-[#4d4032] dark:text-[#c7baa8]">
                    {app.apk_sha256}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verification Badge Box */}
          <div className="rounded-3xl p-5 border bg-emerald-500/5 border-emerald-500/25 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>WinterBuilds Integrity Guarantee</span>
            </div>
            <p className="text-xs text-[#5e5244] dark:text-[#948777] leading-relaxed">
              This package is served directly from authenticated object storage. The SHA-256 checksum was computed during release publishing and can be verified against local file hashes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
