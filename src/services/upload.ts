import { api, getAuthToken } from './api';
import type { UploadProgressInfo } from '../types';

export interface UploadOptions {
  file: File;
  appId?: string;
  appName?: string;
  onProgress?: (info: UploadProgressInfo) => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  storagePath: string;
  downloadUrl: string;
  fileSize: number;
  originalFileName?: string;
  downloadFileName?: string;
}

/**
 * Uploads an APK file directly to object storage (Supabase Storage or authorized endpoint)
 * with precise byte-accurate progress, upload speed (MB/s), and calculated ETA.
 */
export async function uploadApkDirect(options: UploadOptions): Promise<UploadResult> {
  const { file, appId, appName, onProgress, signal } = options;

  // 1. Authorizing state
  onProgress?.({
    state: 'authorizing',
    transferredBytes: 0,
    totalBytes: file.size,
    percentage: 0,
    speedBytesPerSec: 0,
    estimatedRemainingSec: 0,
  });

  // Step 1: Request signed upload authorization from backend
  const auth = await api.authorizeUpload({
    appId: appId || 'pending',
    fileName: file.name,
    contentType: file.type || 'application/vnd.android.package-archive',
    appName,
  });

  // 2. Uploading state
  onProgress?.({
    state: 'uploading',
    transferredBytes: 0,
    totalBytes: file.size,
    percentage: 0,
    speedBytesPerSec: 0,
    estimatedRemainingSec: 0,
    storagePath: auth.path,
  });

  // Step 2: Direct browser-to-storage upload using XHR for accurate byte-progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;
    let rollingSpeed = 0;

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload was cancelled by user.'));
      });
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;

        if (timeDiff >= 0.2 || event.loaded === event.total) {
          const bytesDiff = event.loaded - lastLoaded;
          const instantSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

          // Rolling weighted average for smooth speed and ETA
          rollingSpeed = rollingSpeed === 0 ? instantSpeed : rollingSpeed * 0.7 + instantSpeed * 0.3;
          lastLoaded = event.loaded;
          lastTime = now;

          const remainingBytes = Math.max(0, event.total - event.loaded);
          const eta = rollingSpeed > 0 ? remainingBytes / rollingSpeed : 0;
          const pct = Math.round((event.loaded / event.total) * 100);

          onProgress?.({
            state: 'uploading',
            transferredBytes: event.loaded,
            totalBytes: event.total,
            percentage: pct,
            speedBytesPerSec: rollingSpeed,
            estimatedRemainingSec: eta,
            storagePath: auth.path,
          });
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        if (xhr.status === 401) {
          reject(new Error('Your admin session has expired. Please sign in again.'));
        } else if (xhr.status === 403) {
          reject(new Error("You don't have permission to upload this app."));
        } else if (xhr.status === 413) {
          reject(new Error('Your hosting/storage provider rejected this request size.'));
        } else {
          let errText = xhr.statusText;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed.error?.message) errText = parsed.error.message;
            if (parsed.message) errText = parsed.message;
          } catch {
            // keep statusText
          }
          reject(new Error(errText || `Storage rejected upload with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Could not connect to the upload service. Check your connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Please try again.'));
    };

    xhr.open(auth.method, auth.uploadUrl, true);

    // Apply custom headers if provider specifies (e.g. Supabase signed upload token or Content-Type)
    if (auth.headers) {
      for (const [key, val] of Object.entries(auth.headers)) {
        xhr.setRequestHeader(key, val);
      }
    } else {
      xhr.setRequestHeader('Content-Type', file.type || 'application/vnd.android.package-archive');
    }

    // Direct binary stream transmission — no base64 conversion!
    xhr.send(file);
  });

  // 3. Verifying state
  onProgress?.({
    state: 'verifying',
    transferredBytes: file.size,
    totalBytes: file.size,
    percentage: 100,
    speedBytesPerSec: 0,
    estimatedRemainingSec: 0,
    storagePath: auth.path,
  });

  // Step 3: Complete upload and obtain verified download URL
  const completed = await api.completeUpload({
    storagePath: auth.path,
    originalFileName: file.name,
    appName,
  });

  onProgress?.({
    state: 'completed',
    transferredBytes: file.size,
    totalBytes: file.size,
    percentage: 100,
    speedBytesPerSec: 0,
    estimatedRemainingSec: 0,
    storagePath: auth.path,
    downloadUrl: completed.downloadUrl,
  });

  return {
    storagePath: auth.path,
    downloadUrl: completed.downloadUrl,
    fileSize: file.size,
    originalFileName: file.name,
    downloadFileName: completed.downloadFileName,
  };
}
