import { AppListing, AppCategory, UploadResult, ApkDetectedInfo } from './types';

export type { UploadResult, ApkDetectedInfo };

/**
 * Configurable API Base URL.
 * 
 * - If VITE_API_BASE_URL is configured (e.g. in .env, .env.local, or hosting env variables),
 *   it will be used as the base URL for all frontend API calls.
 * - Sensible default for local development, Google AI Studio preview, and Vercel:
 *   Defaults to relative paths (""), so all requests hit same-origin /api/* routes directly
 *   without CORS issues or protocol mismatches.
 */
export function getApiBaseUrl(): string {
  const envUrl = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '').trim().replace(/\/+$/, '');
  
  if (envUrl) {
    if (typeof window !== 'undefined' && window.location) {
      // If configured URL matches the active origin, use relative paths for efficiency
      if (window.location.origin === envUrl) {
        return '';
      }
    }
    return envUrl;
  }

  // Sensible local development and co-located deployment default
  return '';
}

export const API_BASE_URL: string = getApiBaseUrl();

/**
 * Safely constructs an API URL by joining the API base URL and the endpoint path.
 * Normalizes leading slashes and prevents duplicate "/api" prefixes if the base URL already ends with "/api".
 */
export function apiUrl(endpoint: string): string {
  if (!endpoint) return getApiBaseUrl() || '/';

  // If endpoint is already an absolute HTTP/HTTPS URL, return as-is
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();

  if (!base) {
    return cleanPath;
  }

  // If base already ends with /api and cleanPath starts with /api/, avoid duplicate "/api/api/..."
  if (base.endsWith('/api') && cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.substring(4);
  } else if (base.endsWith('/api') && cleanPath === '/api') {
    cleanPath = '';
  }

  return `${base}${cleanPath}`;
}

/**
 * Helper to perform fetch with automatic relative fallback if external host is unreachable or returns 502/503.
 */
async function resilientFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const targetUrl = apiUrl(endpoint);
  const base = getApiBaseUrl();

  try {
    const res = await fetch(targetUrl, init);
    // If remote service returns 502/503 (e.g. suspended backend) and we used a remote base, attempt relative fallback
    if ((res.status === 502 || res.status === 503) && base && !endpoint.startsWith('http')) {
      const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      try {
        const localRes = await fetch(cleanPath, init);
        if (localRes.ok) return localRes;
      } catch {
        // Return original response if fallback fails
      }
    }
    return res;
  } catch (err) {
    // If network error (CORS failure, connection refused) and remote base was used, attempt relative fallback
    if (base && !endpoint.startsWith('http')) {
      const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      try {
        return await fetch(cleanPath, init);
      } catch {
        // Throw original error if relative also fails
      }
    }
    throw err;
  }
}

/**
 * Resolves static asset URLs (icons, screenshots, APKs) hosted on the backend.
 * Handles data URIs, absolute URLs, and relative /uploads/... paths.
 */
export function getAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (/^(https?:|\/\/|data:|blob:)/i.test(url)) {
    return url;
  }
  return apiUrl(url);
}

const ADMIN_TOKEN_KEY = 'winterbuild_admin_token';

export function getStoredAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setStoredAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearStoredAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredAdminToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['x-admin-token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchApps(params?: {
  category?: string;
  search?: string;
  featured?: boolean;
  sort?: 'newest' | 'popular' | 'name';
}): Promise<AppListing[]> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== 'All') {
    query.set('category', params.category);
  }
  if (params?.search) {
    query.set('search', params.search);
  }
  if (params?.featured) {
    query.set('featured', 'true');
  }
  if (params?.sort) {
    query.set('sort', params.sort);
  }

  const queryString = query.toString();
  const endpoint = queryString ? `/api/apps?${queryString}` : '/api/apps';
  try {
    const res = await resilientFetch(endpoint);
    if (!res.ok) {
      throw new Error(`Failed to fetch apps: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Failed to load apps:', err);
    return [];
  }
}

export async function fetchAppById(id: string): Promise<AppListing> {
  const res = await resilientFetch(`/api/apps/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error('Application not found');
  }
  return res.json();
}

export async function triggerAppDownload(id: string): Promise<{
  downloadUrl: string;
  fileName: string;
  downloadsCount: number;
  sha256?: string;
}> {
  const res = await resilientFetch(`/api/apps/${encodeURIComponent(id)}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Failed to initiate download');
  }
  const data = await res.json();
  return {
    downloadUrl: data.apkUrl ? getAssetUrl(data.apkUrl) : apiUrl(`/api/download-apk/${encodeURIComponent(id)}`),
    fileName: data.fileName,
    downloadsCount: data.downloadsCount,
    sha256: data.sha256,
  };
}

export async function checkAdminStatus(): Promise<{
  isAuthenticated: boolean;
  username?: string;
  hasConfiguredPassword: boolean;
}> {
  const headers: HeadersInit = {};
  const token = getStoredAdminToken();
  if (token) {
    headers['x-admin-token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await resilientFetch('/api/admin/status', { headers });
    if (!res.ok) {
      return { isAuthenticated: false, hasConfiguredPassword: true };
    }
    return await res.json();
  } catch (err) {
    console.warn('Admin status check note:', err);
    return { isAuthenticated: false, hasConfiguredPassword: true };
  }
}

export async function adminLogin(password: string): Promise<{
  success: boolean;
  token: string;
  username: string;
}> {
  const res = await resilientFetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Authentication failed');
  }
  setStoredAdminToken(data.token);
  return data;
}

export async function adminSetup(password: string): Promise<{
  success: boolean;
  token: string;
  username: string;
}> {
  const res = await resilientFetch('/api/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to setup password');
  }
  setStoredAdminToken(data.token);
  return data;
}

export async function adminLogout(): Promise<void> {
  try {
    await resilientFetch('/api/admin/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
    // Ignore logout failure
  } finally {
    clearStoredAdminToken();
  }
}

export async function createAppListing(appData: Partial<AppListing>): Promise<AppListing> {
  const res = await resilientFetch('/api/apps', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(appData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create app listing');
  }
  return data;
}

export async function updateAppListing(
  id: string,
  appData: Partial<AppListing>
): Promise<AppListing> {
  const res = await resilientFetch(`/api/apps/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(appData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update app listing');
  }
  return data;
}

export async function deleteAppListing(id: string): Promise<void> {
  const res = await resilientFetch(`/api/apps/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete app listing');
  }
}

export interface UploadOptions {
  onProgress?: (
    percent: number,
    loadedBytes: number,
    totalBytes: number,
    speedBps?: number,
    estimatedSecondsRemaining?: number
  ) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function uploadInChunks(
  file: File,
  options?: UploadOptions,
  chunkSize = 2.5 * 1024 * 1024
): Promise<UploadResult> {
  const token = getStoredAdminToken();
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / chunkSize);
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const startTime = Date.now();
  const loadedPerChunk: number[] = new Array(totalChunks).fill(0);
  const activeXhrs = new Set<XMLHttpRequest>();

  // Report aggregated progress smoothly
  const reportProgress = () => {
    if (!options?.onProgress) return;
    const totalLoaded = Math.min(totalSize, loadedPerChunk.reduce((acc, n) => acc + n, 0));
    const percent = totalSize > 0 ? Math.min(99, Math.round((totalLoaded / totalSize) * 100)) : 0;
    const elapsedSec = (Date.now() - startTime) / 1000;
    const speedBps = elapsedSec > 0.3 ? totalLoaded / elapsedSec : 0;
    const remainingBytes = Math.max(0, totalSize - totalLoaded);
    const etaSec = speedBps > 0 ? Math.round(remainingBytes / speedBps) : undefined;
    options.onProgress(percent, totalLoaded, totalSize, speedBps, etaSec);
  };

  // Upload a single chunk with up to 3 retries
  const uploadSingleChunk = async (chunkIndex: number): Promise<void> => {
    if (options?.signal?.aborted) {
      throw new Error('Upload was cancelled.');
    }

    const start = chunkIndex * chunkSize;
    const end = Math.min(totalSize, start + chunkSize);
    const chunkBlob = file.slice(start, end);
    const expectedChunkBytes = end - start;

    let attempts = 0;
    while (attempts < 3) {
      if (options?.signal?.aborted) {
        throw new Error('Upload was cancelled.');
      }
      attempts++;
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          activeXhrs.add(xhr);
          xhr.withCredentials = true;
          xhr.timeout = 60000; // 60s per 2.5MB chunk

          const handleAbort = () => {
            xhr.abort();
            reject(new Error('Upload was cancelled.'));
          };

          if (options?.signal) {
            options.signal.addEventListener('abort', handleAbort, { once: true });
          }

          if (xhr.upload) {
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                loadedPerChunk[chunkIndex] = e.loaded;
                reportProgress();
              }
            };
          }

          xhr.onload = () => {
            activeXhrs.delete(xhr);
            if (options?.signal) {
              options.signal.removeEventListener('abort', handleAbort);
            }
            if (xhr.status >= 200 && xhr.status < 300) {
              loadedPerChunk[chunkIndex] = expectedChunkBytes;
              reportProgress();
              resolve();
            } else {
              let errMsg = `Part ${chunkIndex + 1}/${totalChunks} failed (HTTP ${xhr.status})`;
              try {
                const parsed = JSON.parse(xhr.responseText);
                if (parsed.error) errMsg = parsed.error;
              } catch {}
              reject(new Error(errMsg));
            }
          };

          xhr.onerror = () => {
            activeXhrs.delete(xhr);
            if (options?.signal) options.signal.removeEventListener('abort', handleAbort);
            reject(new Error(`Network error uploading part ${chunkIndex + 1} of ${totalChunks}.`));
          };

          xhr.ontimeout = () => {
            activeXhrs.delete(xhr);
            if (options?.signal) options.signal.removeEventListener('abort', handleAbort);
            reject(new Error(`Part ${chunkIndex + 1} of ${totalChunks} timed out.`));
          };

          xhr.onabort = () => {
            activeXhrs.delete(xhr);
            if (options?.signal) options.signal.removeEventListener('abort', handleAbort);
            reject(new Error('Upload was cancelled.'));
          };

          const formData = new FormData();
          formData.append('uploadId', uploadId);
          formData.append('chunkIndex', String(chunkIndex));
          formData.append('totalChunks', String(totalChunks));
          formData.append('fileName', file.name);
          formData.append('totalSize', String(totalSize));
          formData.append('file', chunkBlob, file.name);

          xhr.open('POST', apiUrl('/api/upload-chunk'));
          if (token) {
            xhr.setRequestHeader('x-admin-token', token);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          xhr.send(formData);
        });

        // Succeeded
        return;
      } catch (chunkErr: any) {
        if (options?.signal?.aborted || chunkErr.message?.includes('cancelled')) {
          throw new Error('Upload was cancelled.');
        }
        if (attempts >= 3) {
          throw chunkErr;
        }
        // Small exponential delay before retry
        await new Promise((r) => setTimeout(r, attempts * 500));
      }
    }
  };

  // Run up to 3 parallel chunk upload workers
  const concurrency = Math.min(3, totalChunks);
  let nextChunkIndex = 0;
  let hasError: Error | null = null;

  const worker = async () => {
    while (nextChunkIndex < totalChunks && !hasError && !options?.signal?.aborted) {
      const currentIndex = nextChunkIndex++;
      try {
        await uploadSingleChunk(currentIndex);
      } catch (err: any) {
        hasError = err;
        for (const xhr of activeXhrs) {
          try { xhr.abort(); } catch {}
        }
        break;
      }
    }
  };

  try {
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    if (hasError) {
      throw hasError;
    }
    if (options?.signal?.aborted) {
      throw new Error('Upload was cancelled.');
    }

    // Call /api/upload-complete to finalize and parse metadata
    const completeRes = await resilientFetch('/api/upload-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token, Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        uploadId,
        fileName: file.name,
        totalChunks,
        totalSize,
      }),
      signal: options?.signal,
    });

    const completeJson = await completeRes.json();
    if (!completeRes.ok) {
      throw new Error(completeJson.error || 'Failed to assemble uploaded file chunks on server.');
    }

    // Complete 100% progress
    const elapsedTotal = Math.max(0.1, (Date.now() - startTime) / 1000);
    const finalSpeed = totalSize / elapsedTotal;
    options?.onProgress?.(100, totalSize, totalSize, finalSpeed, 0);

    return completeJson as UploadResult;
  } catch (err: any) {
    // Notify server to clean up temp chunks
    resilientFetch('/api/upload-cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token, Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ uploadId }),
    }).catch(() => {});
    throw err;
  }
}

function uploadDirect(
  file: File,
  options?: UploadOptions
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const token = getStoredAdminToken();
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    const timeoutMs = options?.timeoutMs || 120000;
    xhr.timeout = timeoutMs;

    if (options?.signal) {
      if (options.signal.aborted) {
        return reject(new Error('Upload was cancelled.'));
      }
      options.signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload was cancelled.'));
      });
    }

    if (xhr.upload && options?.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
          options.onProgress?.(percent, e.loaded, e.total);
        }
      };
    }

    xhr.onload = () => {
      let parsedResponse: any = null;
      try {
        parsedResponse = JSON.parse(xhr.responseText);
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300) {
        if (parsedResponse) {
          resolve(parsedResponse as UploadResult);
        } else {
          reject(new Error('Received an invalid response from the server.'));
        }
      } else {
        if (xhr.status === 413) {
          reject(
            new Error(
              parsedResponse?.error ||
                'The file is too large for the server. Maximum allowed size is 200MB.'
            )
          );
        } else if (xhr.status === 401 || xhr.status === 403) {
          reject(
            new Error(
              parsedResponse?.error ||
                'Your admin session expired. Please sign in again.'
            )
          );
        } else if (parsedResponse?.error) {
          reject(new Error(parsedResponse.error));
        } else {
          reject(
            new Error(
              `Upload failed with server status ${xhr.status}. Please check your connection and try again.`
            )
          );
        }
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Network connection error during upload. Please check your connection and try again.'
        )
      );
    };

    xhr.ontimeout = () => {
      reject(
        new Error(
          'Upload timed out. The file took longer than expected to upload. Please try again.'
        )
      );
    };

    xhr.onabort = () => {
      reject(new Error('Upload was cancelled.'));
    };

    xhr.open('POST', apiUrl('/api/upload'));
    if (token) {
      xhr.setRequestHeader('x-admin-token', token);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}

export function uploadFile(
  file: File,
  options?: UploadOptions
): Promise<UploadResult> {
  const CHUNK_SIZE = Math.round(2.5 * 1024 * 1024); // 2.5MB chunk size for optimal speed & Cloud Run safety
  const isApk = file.name.toLowerCase().endsWith('.apk');

  // Always use chunked parallel upload for APKs or any file larger than 2.5MB
  if (isApk || file.size > CHUNK_SIZE) {
    return uploadInChunks(file, options, CHUNK_SIZE);
  }

  return uploadDirect(file, options);
}

export async function submitContact(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await resilientFetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to send message');
  }
  return json;
}

export async function fetchSystemStatus(): Promise<{
  initialized: boolean;
  appsCount: number;
  totalDownloads: number;
  storageType: string;
  hasCustomPassword: boolean;
  version: string;
}> {
  const res = await resilientFetch('/api/system/status');
  if (!res.ok) {
    throw new Error('Failed to fetch system status');
  }
  return res.json();
}
