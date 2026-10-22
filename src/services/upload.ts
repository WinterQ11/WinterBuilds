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
    fileSize: file.size,
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

  // Step 2: Direct browser-to-storage upload
  if (auth.provider === 'chunked') {
    const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB chunks (well below Vercel's 4.5 MB limit)
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedBytes = 0;
    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;
    let rollingSpeed = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (signal?.aborted) {
        throw new Error('Upload was cancelled by user.');
      }

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);

      const chunkUrl = `${auth.uploadUrl}?path=${encodeURIComponent(auth.path)}&chunk=${chunkIndex}&total=${totalChunks}&original=${encodeURIComponent(file.name)}`;

      const token = auth.token || (await getAuthToken());
      const response = await fetch(chunkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: chunkBlob,
        signal,
      });

      if (!response.ok) {
        let errText = '';
        try {
          const json = await response.json();
          errText = json.error?.message || json.message;
        } catch {
          errText = await response.text();
        }
        throw new Error(errText || `Chunk ${chunkIndex + 1}/${totalChunks} upload failed (${response.status})`);
      }

      uploadedBytes = end;
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      if (timeDiff > 0) {
        const instantSpeed = (uploadedBytes - lastLoaded) / timeDiff;
        rollingSpeed = rollingSpeed === 0 ? instantSpeed : rollingSpeed * 0.7 + instantSpeed * 0.3;
        lastLoaded = uploadedBytes;
        lastTime = now;
      }

      const remainingBytes = file.size - uploadedBytes;
      const eta = rollingSpeed > 0 ? remainingBytes / rollingSpeed : 0;
      const pct = Math.round((uploadedBytes / file.size) * 100);

      onProgress?.({
        state: 'uploading',
        transferredBytes: uploadedBytes,
        totalBytes: file.size,
        percentage: pct,
        speedBytesPerSec: rollingSpeed,
        estimatedRemainingSec: eta,
        storagePath: auth.path,
      });
    }
  } else {
    // Direct browser-to-storage upload using XHR for accurate byte-progress
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
          let errMessage = '';
          try {
            const parsed = JSON.parse(xhr.responseText);
            errMessage = parsed.error?.message || parsed.message || (typeof parsed.error === 'string' ? parsed.error : '');
          } catch {
            if (xhr.responseText && xhr.responseText.length < 300) {
              errMessage = xhr.responseText.trim();
            }
          }

          if (xhr.status === 401) {
            reject(new Error(errMessage || 'Authentication required to store APK file. Please sign in again.'));
          } else if (xhr.status === 403) {
            reject(new Error(errMessage || "You don't have permission to upload this app."));
          } else if (xhr.status === 413) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            reject(new Error(
              errMessage ||
              `Storage provider rejected file size (${sizeMb} MB). In Supabase Dashboard, open Storage -> Buckets -> "apks" -> Edit Bucket, and increase "Maximum file size" to 500 MB (or leave blank for unlimited).`
            ));
          } else {
            reject(new Error(errMessage || xhr.statusText || `Storage rejected upload with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Could not connect to the upload service. Check your connection.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timed out. Please try again.'));
      };

      const targetUrl = auth.uploadUrl.startsWith('http') || auth.uploadUrl.startsWith('/')
        ? auth.uploadUrl
        : `/${auth.uploadUrl}`;

      xhr.open(auth.method, targetUrl, true);

      // Apply custom headers if provider specifies (e.g. Supabase signed upload token or Content-Type)
      let hasContentType = false;
      let hasAuth = false;
      if (auth.headers) {
        for (const [key, val] of Object.entries(auth.headers)) {
          xhr.setRequestHeader(key, val);
          if (key.toLowerCase() === 'content-type') hasContentType = true;
          if (key.toLowerCase() === 'authorization') hasAuth = true;
        }
      }

      if (!hasAuth && auth.token && auth.provider === 'direct') {
        xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`);
      }

      if (!hasContentType) {
        xhr.setRequestHeader('Content-Type', file.type || 'application/vnd.android.package-archive');
      }

      // Direct binary stream transmission — no base64 conversion!
      xhr.send(file);
    });
  }

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
