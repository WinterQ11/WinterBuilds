export interface ApkDetectedInfo {
  title?: string;
  packageName?: string;
  version?: string;
  versionCode?: number;
  iconUrl?: string;
}

export interface UploadResult {
  url: string;
  fileName: string;
  storedName: string;
  sizeBytes: number;
  sizeFormatted: string;
  isApk: boolean;
  sha256?: string;
  parsed?: ApkDetectedInfo;
  success: boolean;
  message?: string;
}

export interface AppListing {
  id: string;
  title: string;
  packageName: string;
  developer: string;
  version: string;
  versionCode?: number;
  category: AppCategory;
  shortDescription: string;
  description: string;
  features: string[];
  changelog: string;
  minAndroid: string;
  targetArchitecture: string;
  fileSize: string;
  fileSizeBytes?: number;
  iconUrl: string;
  screenshots: string[];
  apkUrl: string;
  apkFileName?: string;
  apkSha256?: string;
  isVerified: boolean;
  isFeatured: boolean;
  downloadsCount: number;
  releaseDate: string;
  updatedAt: string;
  createdAt: string;
}

export type AppCategory = 
  | 'All'
  | 'Tools'
  | 'Productivity'
  | 'Media & Video'
  | 'Games'
  | 'Communication'
  | 'Customization'
  | 'Utilities'
  | 'Security';

export const APP_CATEGORIES: AppCategory[] = [
  'Tools',
  'Productivity',
  'Media & Video',
  'Games',
  'Communication',
  'Customization',
  'Utilities',
  'Security'
];

export interface AdminSession {
  token: string;
  username: string;
  expiresAt: number;
}

export interface SystemStatus {
  initialized: boolean;
  appsCount: number;
  totalDownloads: number;
  storageType: 'local_container' | 'firebase';
  firebaseConfigured: boolean;
  version: string;
}
