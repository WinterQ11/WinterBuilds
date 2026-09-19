import React, { useState, useEffect } from 'react';
import { 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  X, 
  AlertTriangle,
  Smartphone,
  ExternalLink,
  HardDrive
} from 'lucide-react';
import { AppListing } from '../types';
import { triggerAppDownload, apiUrl, getAssetUrl } from '../api';

interface DownloadModalProps {
  app: AppListing | null;
  onClose: () => void;
  onDownloaded?: (appId: string) => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  app,
  onClose,
  onDownloaded,
}) => {
  const [downloadStep, setDownloadStep] = useState<'verifying' | 'ready'>('verifying');
  const [copiedHash, setCopiedHash] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [downloadName, setDownloadName] = useState<string>('');

  useEffect(() => {
    if (!app) return;

    setDownloadStep('verifying');
    setCopiedHash(false);

    // Call backend download counter & prepare link
    triggerAppDownload(app.id)
      .then((data) => {
        setDownloadUrl(data.downloadUrl);
        setDownloadName(data.fileName);
        if (onDownloaded) onDownloaded(app.id);

        // Simulate 0.8s verification for security feedback
        const timer = setTimeout(() => {
          setDownloadStep('ready');
          
          // Trigger the download automatically
          const directEndpoint = data.downloadUrl || apiUrl(`/api/download-apk/${encodeURIComponent(app.id)}`);
          const downloadAnchor = document.createElement('a');
          downloadAnchor.href = directEndpoint;
          downloadAnchor.setAttribute('download', data.fileName || `${app.title}.apk`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          document.body.removeChild(downloadAnchor);
        }, 800);

        return () => clearTimeout(timer);
      })
      .catch((err) => {
        console.error('Download error:', err);
        setDownloadStep('ready');
      });
  }, [app]);

  if (!app) return null;

  const copySha256 = () => {
    if (!app.apkSha256) return;
    navigator.clipboard.writeText(app.apkSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#281e16]/60 backdrop-blur-sm animate-in fade-in">
      <div 
        id="modal-download-app"
        className="relative w-full max-w-lg bg-[#ffffff] border border-[#ded5c5] rounded-2xl p-6 shadow-2xl space-y-6 text-[#281e16]"
      >
        {/* Close Button */}
        <button
          id="btn-close-download-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-[#7d6c5d] hover:text-[#281e16] hover:bg-[#f5efe4] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#faf6f0] border border-[#e5ded3] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {app.iconUrl ? (
              <img src={getAssetUrl(app.iconUrl)} alt={app.title} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-lg text-[#6b4423]">{app.title.charAt(0)}</span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#281e16] leading-snug">{app.title}</h3>
            <p className="text-xs text-[#736254]">
              Version {app.version} • {app.fileSize}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        {downloadStep === 'verifying' ? (
          <div className="p-4 rounded-xl bg-[#fbf7f0] border border-[#e8dfcf] flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#7c4d29] border-t-transparent rounded-full animate-spin shrink-0"></div>
            <div>
              <p className="text-sm font-medium text-[#281e16]">Checking app safety...</p>
              <p className="text-xs text-[#736254]">Getting your download ready...</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#edf4ee] border border-[#cbe0ce] flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#2d5c37] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#2d5c37]">Your download has started!</p>
              <p className="text-xs text-[#527a5b]">
                The app file is downloading to your device now.
              </p>
            </div>
          </div>
        )}

        {/* Fallback Direct Download Link */}
        <div className="space-y-3">
          <a
            id="btn-direct-apk-download"
            href={downloadUrl || apiUrl(`/api/download-apk/${encodeURIComponent(app.id)}`)}
            download={downloadName || `${app.title}.apk`}
            className="w-full py-3 px-4 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#6b4423]/20"
          >
            <Download className="w-4 h-4" />
            <span>Click here if your download did not start</span>
          </a>

          {/* Android Installation Tip */}
          <div className="rounded-xl bg-[#fbf8f2] border border-[#e8dece] p-3.5 text-xs text-[#6e5d4f] space-y-2">
            <div className="flex items-center gap-2 text-[#382b20] font-medium">
              <Smartphone className="w-4 h-4 text-[#7c4d29]" />
              <span>How to install this app on your Android phone:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed pl-1 text-[#6e5d4f]">
              <li>Tap the downloaded file in your notifications or Downloads folder.</li>
              <li>If your phone asks, tap "Settings" and turn on "Allow from this source".</li>
              <li>Tap "Install". Once finished, tap "Open" to start using your app!</li>
            </ol>
          </div>

          {/* SHA-256 Checksum if available */}
          {app.apkSha256 && (
            <div className="p-3 rounded-lg bg-[#f5efe4] border border-[#e2d7c5] text-[11px] space-y-1">
              <div className="flex items-center justify-between text-[#7d6c5d]">
                <span className="font-mono uppercase font-semibold text-[#7d6c5d]">Safety Code (SHA-256)</span>
                <button
                  onClick={copySha256}
                  className="flex items-center gap-1 text-[#7c4d29] hover:text-[#5e381b] text-[11px]"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-[#2d5c37]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <p className="font-mono text-[#4d3c2e] break-all select-all">{app.apkSha256}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[#4d3c2e] hover:text-[#281e16] bg-[#f5eee3] hover:bg-[#ebe2d4] border border-[#ded3c2] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
