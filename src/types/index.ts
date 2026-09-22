export type AppStatus = 'draft' | 'published' | 'archived';

export type AppCategory = 
  | 'Games'
  | 'Tools'
  | 'Productivity'
  | 'Education'
  | 'Entertainment'
  | 'Photography'
  | 'Social'
  | 'Utilities'
  | 'Communication'
  | 'Media & Video'
  | 'Other';

export const APP_CATEGORIES: AppCategory[] = [
  'Games',
  'Tools',
  'Productivity',
  'Education',
  'Entertainment',
  'Photography',
  'Social',
  'Utilities',
  'Communication',
  'Media & Video',
  'Other',
];

export interface Application {
  id: string;
  name: string;
  slug: string;
  package_name: string;
  version_name: string;
  version_code: number;
  description: string;
  short_description: string;
  category: AppCategory;
  icon_url: string;
  screenshots: string[];
  apk_storage_path: string;
  apk_download_url: string;
  apk_file_size: number;
  apk_sha256: string;
  min_sdk?: number;
  target_sdk?: number;
  downloads_count: number;
  status: AppStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

export interface ApkMetadata {
  name: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  minSdkVersion?: number;
  targetSdkVersion?: number;
  fileSize: number;
  sha256: string;
  iconDataUrl?: string;
  rawPermissions?: string[];
}

export interface UploadProgressInfo {
  state: 'idle' | 'validating' | 'authorizing' | 'uploading' | 'verifying' | 'completed' | 'error';
  transferredBytes: number;
  totalBytes: number;
  percentage: number;
  speedBytesPerSec: number;
  estimatedRemainingSec: number;
  error?: string;
  storagePath?: string;
  downloadUrl?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  created_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface DashboardStats {
  totalApps: number;
  publishedApps: number;
  draftApps: number;
  totalDownloads: number;
  recentlyAdded: Application[];
  recentlyUpdated: Application[];
}
