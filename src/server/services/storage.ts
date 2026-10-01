import {
  getServerSupabaseClient,
  isDnsOrNetworkError,
  markSupabaseHostUnreachable,
} from '../../lib/supabase';
import { createAdminSessionToken } from './auth';
import path from 'path';
import fs from 'fs';

export interface UploadAuthorization {
  uploadUrl: string;
  method: 'PUT' | 'POST';
  path: string;
  token?: string;
  provider: 'supabase' | 'direct';
  headers?: Record<string, string>;
  originalFileName?: string;
}

export interface ApkStorageMeta {
  originalFileName: string;
  sanitizedStorageName: string;
  storagePath: string;
  uploadedAt: string;
  preferredDownloadName?: string;
}

export function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join('/tmp', 'winterbuilds_data');
    if (!fs.existsSync(tmpDir)) {
      try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
    }
    return tmpDir;
  }

  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    const tmpDir = path.join('/tmp', 'winterbuilds_data');
    if (!fs.existsSync(tmpDir)) {
      try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
    }
    return tmpDir;
  }
}

export function getStorageDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join('/tmp', 'winterbuilds_storage');
    if (!fs.existsSync(tmpDir)) {
      try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
    }
    return tmpDir;
  }

  const localDir = path.join(process.cwd(), 'data', 'storage');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    const tmpDir = path.join('/tmp', 'winterbuilds_storage');
    if (!fs.existsSync(tmpDir)) {
      try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
    }
    return tmpDir;
  }
}

function getApkMetadataPath(): string {
  return path.join(getDataDir(), 'apk_storage_metadata.json');
}

let inMemoryStorageMeta: Record<string, ApkStorageMeta> = {};

/**
 * Persists mapping of storage object path to original uploaded filename.
 */
export function saveApkStorageMetadata(storagePath: string, meta: Partial<ApkStorageMeta>): void {
  const metaObj: ApkStorageMeta = {
    originalFileName: meta.originalFileName || path.basename(storagePath),
    sanitizedStorageName: meta.sanitizedStorageName || path.basename(storagePath),
    storagePath,
    uploadedAt: meta.uploadedAt || new Date().toISOString(),
    preferredDownloadName: meta.preferredDownloadName,
  };

  inMemoryStorageMeta[storagePath] = metaObj;

  try {
    const metaPath = getApkMetadataPath();
    let map: Record<string, ApkStorageMeta> = {};
    if (fs.existsSync(metaPath)) {
      try {
        map = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch {}
    }
    map[storagePath] = metaObj;
    fs.writeFileSync(metaPath, JSON.stringify(map, null, 2));
  } catch (err) {
    // In-memory fallback
  }
}

/**
 * Retrieves stored metadata for an APK storage object path.
 */
export function getApkStorageMetadata(storagePath: string): ApkStorageMeta | null {
  if (inMemoryStorageMeta[storagePath]) {
    return inMemoryStorageMeta[storagePath];
  }

  try {
    const metaPath = getApkMetadataPath();
    if (fs.existsSync(metaPath)) {
      const map: Record<string, ApkStorageMeta> = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      if (map[storagePath]) {
        inMemoryStorageMeta[storagePath] = map[storagePath];
        return map[storagePath];
      }
    }
  } catch (err) {
    // In-memory fallback
  }
  return null;
}

/**
 * Generates a clean, user-friendly APK download filename based on the application name.
 * Handles spaces and forbidden path characters safely.
 * Example: "SensiShare" -> "SensiShare.apk"
 * Example: "My App" -> "My App.apk"
 */
export function generateApkDownloadFileName(appName?: string, fallbackPathOrOriginal?: string): string {
  if (appName && appName.trim()) {
    // Strip slashes and illegal path characters, preserve spaces, letters, numbers, hyphens, and dots
    let clean = appName.trim().replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').trim();
    if (!clean.toLowerCase().endsWith('.apk')) {
      clean = `${clean}.apk`;
    }
    return clean;
  }

  if (fallbackPathOrOriginal) {
    const base = path.basename(fallbackPathOrOriginal);
    // Strip timestamp or uuid prefix if present (e.g. 1790090967921_sensishare.apk -> sensishare.apk)
    const cleaned = base.replace(/^\d+[-_]/, '');
    if (!cleaned.toLowerCase().endsWith('.apk')) {
      return `${cleaned}.apk`;
    }
    return cleaned;
  }

  return 'application.apk';
}

/**
 * Formats a download URL so that it returns the intended clean filename via Content-Disposition.
 * For Supabase Storage URLs, sets the `?download=<filename>` parameter.
 * For local fallback URLs, sets the `?filename=<filename>` parameter.
 */
export function formatCleanDownloadUrl(
  rawUrl: string | undefined,
  storagePath: string,
  preferredName?: string
): string {
  const downloadFileName = generateApkDownloadFileName(preferredName, storagePath);

  if (!rawUrl || rawUrl.startsWith('/api/')) {
    return `/api/downloads/${encodeURIComponent(storagePath)}?filename=${encodeURIComponent(downloadFileName)}`;
  }

  if (rawUrl.includes('/storage/v1/object/public/')) {
    try {
      const url = new URL(rawUrl);
      url.searchParams.set('download', downloadFileName);
      return url.toString();
    } catch {
      const separator = rawUrl.includes('?') ? '&' : '?';
      return `${rawUrl}${separator}download=${encodeURIComponent(downloadFileName)}`;
    }
  }

  return rawUrl;
}

export function sanitizeStorageFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/_{2,}/g, '_');
}

export async function createUploadAuthorization(params: {
  appId: string;
  fileName: string;
  contentType?: string;
  appName?: string;
}): Promise<UploadAuthorization> {
  const supabase = getServerSupabaseClient();
  const originalFileName = path.basename(params.fileName || 'application.apk');
  const sanitizedName = sanitizeStorageFileName(originalFileName);
  const storagePath = `apps/${params.appId}/apk/${Date.now()}_${sanitizedName}`;

  // Preserve the original filename mapping
  saveApkStorageMetadata(storagePath, {
    originalFileName,
    sanitizedStorageName: sanitizedName,
    preferredDownloadName: params.appName,
  });

  if (supabase) {
    try {
      const bucket = process.env.VITE_SUPABASE_APK_BUCKET || 'apks';
      
      // Create signed upload URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(storagePath);

      if (error) {
        if (isDnsOrNetworkError(error)) {
          markSupabaseHostUnreachable(error.message);
        } else {
          console.error('Supabase createSignedUploadUrl error:', error);
          throw new Error(`Storage authorization failed: ${error.message}`);
        }
      } else if (data) {
        return {
          uploadUrl: data.signedUrl,
          token: data.token,
          path: storagePath,
          method: 'PUT',
          provider: 'supabase',
          originalFileName,
          headers: {
            'Content-Type': params.contentType || 'application/vnd.android.package-archive',
          },
        };
      }
    } catch (err: any) {
      if (isDnsOrNetworkError(err)) {
        markSupabaseHostUnreachable(err.message);
      } else {
        throw err;
      }
    }
  }

  // Fallback direct storage handler with signed upload token
  const uploadToken = createAdminSessionToken('winterbuilds99@gmail.com');
  return {
    uploadUrl: `/api/upload/direct?path=${encodeURIComponent(storagePath)}&original=${encodeURIComponent(originalFileName)}&token=${encodeURIComponent(uploadToken)}`,
    path: storagePath,
    method: 'POST',
    provider: 'direct',
    token: uploadToken,
    originalFileName,
    headers: {
      'Authorization': `Bearer ${uploadToken}`,
    },
  };
}

export async function verifyAndResolveDownloadUrl(
  storagePath: string,
  preferredName?: string
): Promise<string> {
  const meta = getApkStorageMetadata(storagePath);
  const downloadFileName = generateApkDownloadFileName(
    preferredName || meta?.preferredDownloadName,
    meta?.originalFileName || storagePath
  );

  const supabase = getServerSupabaseClient();
  if (supabase) {
    const bucket = process.env.VITE_SUPABASE_APK_BUCKET || 'apks';
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath, {
      download: downloadFileName,
    });
    return data.publicUrl;
  }

  return `/api/downloads/${encodeURIComponent(storagePath)}?filename=${encodeURIComponent(downloadFileName)}`;
}

export async function deleteStorageObject(storagePath: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  if (!storagePath) return true;

  if (supabase) {
    const bucket = process.env.VITE_SUPABASE_APK_BUCKET || 'apks';
    const { error } = await supabase.storage.from(bucket).remove([storagePath]);
    if (error) {
      console.warn('Failed to remove storage object from Supabase:', error);
      return false;
    }
    return true;
  }

  // Local fallback cleanup
  try {
    const localDir = path.join(process.cwd(), 'data', 'storage');
    const fullPath = path.join(localDir, storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return true;
  } catch {
    return false;
  }
}
