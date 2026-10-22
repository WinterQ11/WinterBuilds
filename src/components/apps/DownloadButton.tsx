import React, { useState } from 'react';
import { Download, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { formatBytes } from '../../lib/formatters';
import { isValidGoogleDriveUrl } from '../../lib/drive';

interface DownloadButtonProps {
  appId: string;
  appName: string;
  fileSize?: number;
  variant?: 'sm' | 'lg';
  isGoogleDrive?: boolean;
  onDownloadSuccess?: (newCount: number) => void;
  className?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  appId,
  appName,
  fileSize,
  variant = 'sm',
  isGoogleDrive = false,
  onDownloadSuccess,
  className = '',
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [openedDrive, setOpenedDrive] = useState(isGoogleDrive);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click
    if (state === 'loading') return;

    setState('loading');
    setErrorMessage('');

    try {
      const result = await api.downloadApp(appId);

      const isDrive = Boolean(result.isGoogleDrive || (result.downloadUrl && isValidGoogleDriveUrl(result.downloadUrl)));
      if (isDrive) {
        setOpenedDrive(true);
      }

      // Trigger actual browser download or open Google Drive page
      if (result.downloadUrl) {
        if (isDrive) {
          // Open that application's Google Drive file page in a NEW browser tab
          // The original WinterBuilds page remains open
          const a = document.createElement('a');
          a.href = result.downloadUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          // Direct file download
          const a = document.createElement('a');
          a.href = result.downloadUrl;
          let cleanName = result.filename;
          if (!cleanName) {
            cleanName = appName.trim().replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').trim();
            if (!cleanName.toLowerCase().endsWith('.apk')) {
              cleanName = `${cleanName}.apk`;
            }
          }
          a.download = cleanName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }

      setState('success');
      onDownloadSuccess?.(result.downloadsCount);

      // Reset back to idle after 3 seconds
      setTimeout(() => {
        setState('idle');
      }, 3000);
    } catch (err: any) {
      console.error('Download failed:', err);
      setState('error');
      setErrorMessage(err.message || 'Download failed. Please try again.');
      setTimeout(() => {
        setState('idle');
      }, 4000);
    }
  };

  const isDriveMode = isGoogleDrive || openedDrive;

  if (variant === 'lg') {
    return (
      <div className="flex flex-col items-start gap-1.5 w-full sm:w-auto">
        <button
          id={`download-btn-lg-${appId}`}
          onClick={handleDownload}
          disabled={state === 'loading'}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-base shadow-md transition-all active:scale-[0.98] ${
            state === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-900/20'
              : state === 'error'
              ? 'bg-rose-600 text-white shadow-rose-900/20'
              : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/20'
          } ${className}`}
        >
          {state === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Preparing {isDriveMode ? 'Google Drive Link...' : 'Download...'}</span>
            </>
          ) : state === 'success' ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>{isDriveMode ? 'Opening in New Tab...' : 'Starting Download...'}</span>
            </>
          ) : state === 'error' ? (
            <>
              <AlertCircle className="w-5 h-5" />
              <span>Try Again</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>{isDriveMode ? 'Download via Google Drive' : 'Download APK'}</span>
              {isDriveMode && <ExternalLink className="w-4 h-4 ml-0.5 opacity-90" />}
              {fileSize && !isDriveMode ? (
                <span className="text-amber-200/90 text-sm font-mono font-medium ml-1">
                  ({formatBytes(fileSize)})
                </span>
              ) : null}
            </>
          )}
        </button>
        {state === 'error' && (
          <span className="text-xs text-rose-500 font-medium">{errorMessage}</span>
        )}
      </div>
    );
  }

  // Small variant for app cards
  return (
    <button
      id={`download-btn-sm-${appId}`}
      onClick={handleDownload}
      disabled={state === 'loading'}
      title={isDriveMode ? `Open ${appName} on Google Drive in new tab` : `Download ${appName} APK`}
      className={`p-2.5 rounded-xl border transition-all active:scale-95 shrink-0 ${
        state === 'success'
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
          : state === 'error'
          ? 'bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-400'
          : 'bg-[#ede4d2] hover:bg-[#e4d8c2] border-[#dacbb1] text-[#3d3329] dark:bg-[#25221d] dark:hover:bg-[#2e2a23] dark:border-[#383329] dark:text-amber-300'
      } ${className}`}
    >
      {state === 'loading' ? (
        <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
      ) : state === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      ) : state === 'error' ? (
        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
      ) : (
        <div className="flex items-center gap-1">
          <Download className="w-4 h-4" />
          {isDriveMode && <ExternalLink className="w-2.5 h-2.5 opacity-70" />}
        </div>
      )}
    </button>
  );
};
