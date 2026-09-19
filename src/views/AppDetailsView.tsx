import React, { useState } from 'react';
import { 
  Download, 
  ShieldCheck, 
  Smartphone, 
  HardDrive, 
  Calendar, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Check, 
  ChevronRight, 
  Layers, 
  Cpu, 
  ExternalLink,
  ArrowLeft,
  X,
  Sparkles
} from 'lucide-react';
import { AppListing } from '../types';
import { AppCard } from '../components/AppCard';
import { getAssetUrl } from '../api';

interface AppDetailsViewProps {
  app: AppListing;
  relatedApps: AppListing[];
  onSelectApp: (id: string) => void;
  onDownload: (app: AppListing) => void;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export const AppDetailsView: React.FC<AppDetailsViewProps> = ({
  app,
  relatedApps,
  onSelectApp,
  onDownload,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'changelog' | 'technical'>('overview');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [copiedPackage, setCopiedPackage] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const copyPackageName = () => {
    navigator.clipboard.writeText(app.packageName);
    setCopiedPackage(true);
    setTimeout(() => setCopiedPackage(false), 2000);
  };

  const copySha256 = () => {
    if (!app.apkSha256) return;
    navigator.clipboard.writeText(app.apkSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${app.title} - Android APK Download`,
        text: `Download ${app.title} v${app.version} on WinterBuild`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 pb-20">
      
      {/* Breadcrumbs Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[#7d6c5d]">
        <button 
          onClick={() => onNavigate('home')} 
          className="hover:text-[#281e16] transition-colors"
        >
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#8a796b]" />
        <button 
          onClick={() => onNavigate('catalog')} 
          className="hover:text-[#281e16] transition-colors"
        >
          Apps
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#8a796b]" />
        <button 
          onClick={() => onNavigate('catalog', { category: app.category })} 
          className="hover:text-[#281e16] transition-colors"
        >
          {app.category}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#8a796b]" />
        <span className="text-[#281e16] font-medium truncate max-w-[200px]">
          {app.title}
        </span>
      </nav>

      {/* Main Hero Card */}
      <div className="rounded-2xl border border-[#ded5c5] bg-[#ffffff] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ebdcc8]/30 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          
          {/* App Identity */}
          <div className="flex items-start sm:items-center gap-5">
            {/* App Icon */}
            <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#faf6f0] border border-[#e5ded3] p-1 flex items-center justify-center overflow-hidden shadow-xs">
              {app.iconUrl ? (
                <img
                  src={getAssetUrl(app.iconUrl)}
                  alt={`${app.title} icon`}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full rounded-xl bg-gradient-to-br from-[#f0e6d6] to-[#e2d4c0] flex items-center justify-center text-[#6b4423] font-bold text-3xl ${app.iconUrl ? 'hidden' : ''}`}>
                {app.title.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#f0e6d6] border border-[#d8c8b4] text-[#6b4423]">
                  {app.category}
                </span>
                {app.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2d5c37] bg-[#edf4ee] border border-[#cbe0ce] px-2 py-0.5 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Safe
                  </span>
                )}
                {app.isFeatured && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#855e09] bg-[#fef9e8] border border-[#fae4a8] px-2 py-0.5 rounded-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    Featured
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#281e16] tracking-tight">
                {app.title}
              </h1>

              <div className="flex items-center gap-3 text-xs text-[#7d6c5d] flex-wrap">
                <span className="font-medium text-[#4d3c2e]">{app.developer}</span>
                <span>•</span>
                <button
                  onClick={copyPackageName}
                  className="font-mono text-[#6e5d4f] hover:text-[#281e16] flex items-center gap-1 group"
                  title="Click to copy package ID"
                >
                  <span>{app.packageName}</span>
                  {copiedPackage ? (
                    <Check className="w-3 h-3 text-[#2d5c37]" />
                  ) : (
                    <Copy className="w-3 h-3 text-[#8a796b] group-hover:text-[#281e16]" />
                  )}
                </button>
              </div>

              {/* Quick specs pills */}
              <div className="pt-1 flex items-center gap-3 text-xs text-[#6e5d4f] flex-wrap">
                <span className="bg-[#f5eee3] px-2 py-1 rounded border border-[#ded3c2] font-mono text-[#4d3c2e]">
                  Version {app.version}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-[#8a796b]" />
                  {app.fileSize}
                </span>
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-[#8a796b]" />
                  {app.minAndroid}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#8a796b]" />
                  {app.releaseDate}
                </span>
              </div>
            </div>

          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              id="btn-app-details-download"
              onClick={() => onDownload(app)}
              className="px-6 py-3.5 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs active:scale-95"
            >
              <Download className="w-5 h-5" />
              <span>Download App ({app.fileSize})</span>
            </button>

            <button
              id="btn-app-details-share"
              onClick={handleShare}
              className="px-4 py-2.5 rounded-xl bg-[#f5eee3] hover:bg-[#ebe2d4] text-[#4d3c2e] hover:text-[#281e16] text-xs font-medium flex items-center justify-center gap-2 border border-[#ded3c2] transition-colors"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#2d5c37]" />
                  <span className="text-[#2d5c37] font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#8a796b]" />
                  <span>Share App Link</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Screenshots Gallery (if available) */}
      {app.screenshots && app.screenshots.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#281e16] flex items-center gap-2">
            <span>App Pictures</span>
            <span className="text-xs font-normal text-[#7d6c5d]">({app.screenshots.length})</span>
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
            {app.screenshots.map((src, index) => (
              <div
                key={index}
                onClick={() => setSelectedScreenshot(src)}
                className="cursor-pointer shrink-0 w-44 sm:w-52 h-80 sm:h-96 rounded-xl overflow-hidden bg-[#faf6f0] border border-[#e5ded3] hover:border-[#6b4423]/50 transition-all hover:scale-[1.02] shadow-sm group relative"
              >
                <img
                  src={getAssetUrl(src)}
                  alt={`${app.title} picture ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[#281e16]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs font-semibold text-[#fdfcf9] bg-[#281e16]/75 px-3 py-1.5 rounded-lg backdrop-blur-xs">
                    View Full Size
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation: Overview / Changelog / Technical Specs */}
      <div className="border-b border-[#ded5c5]">
        <div className="flex gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#6b4423] text-[#6b4423] font-semibold'
                : 'border-transparent text-[#6e5d4f] hover:text-[#281e16]'
            }`}
          >
            About & Features
          </button>
          <button
            onClick={() => setActiveTab('changelog')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'changelog'
                ? 'border-[#6b4423] text-[#6b4423] font-semibold'
                : 'border-transparent text-[#6e5d4f] hover:text-[#281e16]'
            }`}
          >
            What's New (v{app.version})
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'technical'
                ? 'border-[#6b4423] text-[#6b4423] font-semibold'
                : 'border-transparent text-[#6e5d4f] hover:text-[#281e16]'
            }`}
          >
            App Details
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Main Tab Detail */}
        <div className="lg:col-span-2 space-y-6">
          
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-[#281e16]">About {app.title}</h3>
                <p className="text-xs sm:text-sm text-[#4d3c2e] leading-relaxed whitespace-pre-line">
                  {app.description || app.shortDescription || 'No description provided yet.'}
                </p>
              </div>

              {/* Key Features List */}
              {app.features && app.features.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-base font-bold text-[#281e16]">Main Features</h3>
                  <ul className="space-y-2.5">
                    {app.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#4d3c2e]">
                        <CheckCircle2 className="w-4 h-4 text-[#2d5c37] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'changelog' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#281e16]">What's new in version {app.version}</h3>
              <div className="rounded-xl bg-[#ffffff] border border-[#ded5c5] p-5 font-mono text-xs text-[#4d3c2e] leading-relaxed whitespace-pre-line">
                {app.changelog || 'No notes provided for this version.'}
              </div>
            </div>
          )}

          {activeTab === 'technical' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#281e16]">App Information & Safety</h3>
              
              <div className="rounded-xl bg-[#ffffff] border border-[#ded5c5] divide-y divide-[#ede5d8] text-xs">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[#6e5d4f]">App Package ID</span>
                  <span className="font-mono text-[#281e16]">{app.packageName}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[#6e5d4f]">Version</span>
                  <span className="font-mono text-[#281e16]">{app.version} {app.versionCode ? `(Code ${app.versionCode})` : ''}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[#6e5d4f]">Phone Processor</span>
                  <span className="font-mono text-[#281e16]">{app.targetArchitecture}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[#6e5d4f]">Requires Android</span>
                  <span className="text-[#281e16]">{app.minAndroid}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[#6e5d4f]">File Size</span>
                  <span className="font-mono text-[#281e16]">{app.fileSize}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-[#6e5d4f]">Date Added</span>
                  <span className="text-[#281e16]">{app.releaseDate}</span>
                </div>
                {app.apkSha256 && (
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6e5d4f]">Safety Code (SHA-256)</span>
                      <button
                        onClick={copySha256}
                        className="text-[#7c4d29] hover:text-[#5e381b] flex items-center gap-1 text-[11px]"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-[#2d5c37]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHash ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-[#6e5d4f] break-all select-all">
                      {app.apkSha256}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right 1 Col: Trust & Safety Card */}
        <div className="space-y-6">
          
          <div className="rounded-2xl border border-[#ded5c5] bg-[#ffffff] p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#281e16] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2d5c37]" />
              Safety Check Report
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-[#2d5c37]">
                <Check className="w-4 h-4" />
                <span>No viruses or spyware</span>
              </div>
              <div className="flex items-center gap-2 text-[#2d5c37]">
                <Check className="w-4 h-4" />
                <span>Original developer file</span>
              </div>
              <div className="flex items-center gap-2 text-[#2d5c37]">
                <Check className="w-4 h-4" />
                <span>Direct download to your phone</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#ede5d8] text-[11px] text-[#7d6c5d] leading-relaxed">
              WinterBuild checks every app to make sure it is safe to install and has not been altered.
            </div>
          </div>

          {/* Quick Install Guide */}
          <div className="rounded-2xl border border-[#ded5c5] bg-[#ffffff] p-5 space-y-3 text-xs text-[#6e5d4f] shadow-xs">
            <h4 className="font-semibold text-[#281e16] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#7c4d29]" />
              How to Install
            </h4>
            <div className="text-[11px] leading-relaxed space-y-1 text-[#4d3c2e]">
              <p>1. Tap <strong>Download App</strong> above.</p>
              <p>2. Tap the downloaded file in your notifications.</p>
              <p>3. If your phone asks, tap Settings and allow the app.</p>
              <p>4. Tap Install and enjoy your app!</p>
            </div>
          </div>

        </div>

      </div>

      {/* Related Apps in Same Category */}
      {relatedApps.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-[#ded5c5]">
          <h2 className="text-lg font-bold text-[#281e16]">
            More in {app.category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {relatedApps.slice(0, 3).map((rel) => (
              <AppCard
                key={rel.id}
                app={rel}
                onSelectApp={onSelectApp}
                onQuickDownload={onDownload}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Screenshot Lightbox Modal */}
      {selectedScreenshot && (
        <div 
          onClick={() => setSelectedScreenshot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1611]/90 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-12 right-0 p-2 text-[#fdfcf9] hover:text-[#d8c5b0]"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={getAssetUrl(selectedScreenshot)}
              alt="Fullscreen preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-[#ded5c5] shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};
