import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  Plus, 
  Pencil, 
  Trash2, 
  Upload, 
  Check, 
  X, 
  AlertTriangle, 
  HardDrive, 
  FileCode, 
  ExternalLink, 
  Eye, 
  Download, 
  Smartphone, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Search,
  Terminal,
  Layers,
  KeyRound,
  Loader2,
  ArrowUp
} from 'lucide-react';
import { AppListing, AppCategory, APP_CATEGORIES, ApkDetectedInfo } from '../types';
import { 
  adminLogin, 
  adminSetup, 
  adminLogout, 
  createAppListing, 
  updateAppListing, 
  deleteAppListing, 
  uploadFile,
  getAssetUrl
} from '../api';

interface AdminViewProps {
  apps: AppListing[];
  isAuthenticated: boolean;
  hasConfiguredPassword: boolean;
  onRefreshApps: () => void;
  onAuthSuccess: () => void;
  onLogout: () => void;
  onSelectApp: (id: string) => void;
  onOpenDeployGuide: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  apps,
  isAuthenticated,
  hasConfiguredPassword,
  onRefreshApps,
  onAuthSuccess,
  onLogout,
  onSelectApp,
  onOpenDeployGuide,
}) => {
  // Login / Setup state
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(!hasConfiguredPassword);

  // App Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppListing | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingApp, setDeletingApp] = useState<AppListing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Table filter/search state
  const [adminSearch, setAdminSearch] = useState('');

  // Editor Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formPackageName, setFormPackageName] = useState('');
  const [formDeveloper, setFormDeveloper] = useState('');
  const [formCategory, setFormCategory] = useState<AppCategory>('Tools');
  const [formVersion, setFormVersion] = useState('1.0.0');
  const [formVersionCode, setFormVersionCode] = useState('1');
  const [formMinAndroid, setFormMinAndroid] = useState('Android 8.0 (Oreo)+');
  const [formArchitecture, setFormArchitecture] = useState('Universal');
  const [formFileSize, setFormFileSize] = useState('15.0 MB');
  const [formReleaseDate, setFormReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFeatures, setFormFeatures] = useState('');
  const [formChangelog, setFormChangelog] = useState('Initial public release.');
  const [formIconUrl, setFormIconUrl] = useState('');
  const [formScreenshots, setFormScreenshots] = useState<string[]>([]);
  const [formApkUrl, setFormApkUrl] = useState('');
  const [formApkFileName, setFormApkFileName] = useState('');
  const [formApkSha256, setFormApkSha256] = useState('');
  const [formIsVerified, setFormIsVerified] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  // Upload States
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingApk, setIsUploadingApk] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [isDraggingApk, setIsDraggingApk] = useState(false);
  const [detectedMeta, setDetectedMeta] = useState<ApkDetectedInfo | null>(null);
  const [apkUploadProgress, setApkUploadProgress] = useState<number>(0);
  const [apkUploadStatusText, setApkUploadStatusText] = useState<string>('');
  const [apkUploadSpeedText, setApkUploadSpeedText] = useState<string>('');
  const [apkUploadTransferredText, setApkUploadTransferredText] = useState<string>('');
  const [apkUploadEtaText, setApkUploadEtaText] = useState<string>('');
  const [apkUploadSuccess, setApkUploadSuccess] = useState<string | null>(null);
  const [apkUploadError, setApkUploadError] = useState<string | null>(null);
  const apkAbortControllerRef = useRef<AbortController | null>(null);
  const modalScrollContainerRef = useRef<HTMLDivElement>(null);

  // Prevent background page scrolling when Add App modal or Delete modal is open
  useEffect(() => {
    if (!isEditorOpen && !deletingApp) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Prevent layout shift from scrollbar disappearing
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditorOpen && !isSaving && !isUploadingApk) {
        setIsEditorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditorOpen, deletingApp, isSaving, isUploadingApk]);

  // Ensure modal scrolls to top when opened
  useEffect(() => {
    if (isEditorOpen) {
      requestAnimationFrame(() => {
        if (modalScrollContainerRef.current) {
          modalScrollContainerRef.current.scrollTop = 0;
          modalScrollContainerRef.current.focus();
        }
      });
    }
  }, [isEditorOpen]);

  // Field-specific validation errors for the editor modal
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    packageName?: string;
    version?: string;
    apkUrl?: string;
  }>({});

  useEffect(() => {
    setIsSetupMode(!hasConfiguredPassword);
  }, [hasConfiguredPassword]);

  // Open Editor for new or existing app
  const handleOpenEditor = (appToEdit?: AppListing) => {
    setEditorError(null);
    setFieldErrors({});
    setApkUploadError(null);
    setApkUploadSuccess(null);
    setDetectedMeta(null);
    setApkUploadProgress(0);
    setApkUploadStatusText('');
    setApkUploadSpeedText('');
    setApkUploadTransferredText('');
    setApkUploadEtaText('');
    setIsUploadingApk(false);
    setIsDraggingApk(false);
    if (apkAbortControllerRef.current) {
      apkAbortControllerRef.current.abort();
      apkAbortControllerRef.current = null;
    }
    if (appToEdit) {
      setEditingApp(appToEdit);
      setFormTitle(appToEdit.title);
      setFormPackageName(appToEdit.packageName);
      setFormDeveloper(appToEdit.developer);
      setFormCategory(appToEdit.category);
      setFormVersion(appToEdit.version);
      setFormVersionCode(String(appToEdit.versionCode || 1));
      setFormMinAndroid(appToEdit.minAndroid);
      setFormArchitecture(appToEdit.targetArchitecture);
      setFormFileSize(appToEdit.fileSize);
      setFormReleaseDate(appToEdit.releaseDate);
      setFormShortDesc(appToEdit.shortDescription);
      setFormDesc(appToEdit.description);
      setFormFeatures(appToEdit.features?.join('\n') || '');
      setFormChangelog(appToEdit.changelog);
      setFormIconUrl(appToEdit.iconUrl);
      setFormScreenshots(appToEdit.screenshots || []);
      setFormApkUrl(appToEdit.apkUrl);
      setFormApkFileName(appToEdit.apkFileName || '');
      setFormApkSha256(appToEdit.apkSha256 || '');
      setFormIsVerified(appToEdit.isVerified);
      setFormIsFeatured(appToEdit.isFeatured);
    } else {
      setEditingApp(null);
      setFormTitle('');
      setFormPackageName('');
      setFormDeveloper('WinterBuild Community');
      setFormCategory('Tools');
      setFormVersion('');
      setFormVersionCode('1');
      setFormMinAndroid('Android 8.0+');
      setFormArchitecture('Universal');
      setFormFileSize('');
      setFormReleaseDate(new Date().toISOString().split('T')[0]);
      setFormShortDesc('');
      setFormDesc('');
      setFormFeatures('');
      setFormChangelog('Initial release.');
      setFormIconUrl('');
      setFormScreenshots([]);
      setFormApkUrl('');
      setFormApkFileName('');
      setFormApkSha256('');
      setFormIsVerified(true);
      setFormIsFeatured(false);
    }
    setIsEditorOpen(true);
  };

  // Handle Authentication
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      if (isSetupMode) {
        if (passwordInput.length < 8) {
          throw new Error('Password must be at least 8 characters long for security.');
        }
        if (passwordInput !== confirmPasswordInput) {
          throw new Error('Passwords do not match. Please try again.');
        }
        await adminSetup(passwordInput);
      } else {
        await adminLogin(passwordInput);
      }
      setPasswordInput('');
      setConfirmPasswordInput('');
      onAuthSuccess();
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check your password.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Icon File Upload
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext || '')) {
      setEditorError(`Please select an image file (.png, .jpg, .webp, .svg) for the icon. Selected file was "${file.name}".`);
      return;
    }

    setIsUploadingIcon(true);
    setEditorError(null);
    try {
      const res = await uploadFile(file);
      setFormIconUrl(res.url);
    } catch (err: any) {
      setEditorError(err.message || 'Could not upload icon picture. Please try again.');
    } finally {
      setIsUploadingIcon(false);
    }
  };

  // Handle Screenshot File Upload
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext || '')) {
      setEditorError(`Please select an image file (.png, .jpg, .webp) for the screenshot. Selected file was "${file.name}".`);
      return;
    }

    setIsUploadingScreenshot(true);
    setEditorError(null);
    try {
      const res = await uploadFile(file);
      setFormScreenshots((prev) => [...prev, res.url]);
    } catch (err: any) {
      setEditorError(err.message || 'Could not upload screenshot picture. Please try again.');
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  // Format speed in Bps to KB/s or MB/s
  const formatSpeed = (bps?: number): string => {
    if (!bps || bps <= 0) return '';
    if (bps < 1024 * 1024) {
      return `${Math.round(bps / 1024)} KB/s`;
    }
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  // Process APK file upload (shared by file picker and drag-and-drop)
  const processApkFile = async (file: File) => {
    // 1. File type check
    const fileName = file.name || '';
    if (!fileName.toLowerCase().endsWith('.apk')) {
      setApkUploadError(`Only .apk files are allowed. Selected file was "${fileName}". Please select an Android .apk package.`);
      setApkUploadSuccess(null);
      return;
    }

    // 2. File size check (200MB limit)
    const MAX_SIZE_BYTES = 200 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setApkUploadError(`The selected file is too large (${sizeMB} MB). Maximum allowed size is 200 MB.`);
      setApkUploadSuccess(null);
      return;
    }

    // 3. Initiate high-speed concurrent upload
    setIsUploadingApk(true);
    setApkUploadProgress(0);
    setApkUploadStatusText('Starting upload...');
    setApkUploadSpeedText('');
    setApkUploadTransferredText('');
    setApkUploadEtaText('');
    setApkUploadError(null);
    setApkUploadSuccess(null);
    setEditorError(null);
    setFieldErrors({});

    const controller = new AbortController();
    apkAbortControllerRef.current = controller;

    try {
      const res = await uploadFile(file, {
        signal: controller.signal,
        timeoutMs: 180000, // 3 minutes timeout
        onProgress: (percent, loadedBytes, totalBytes, speedBps, etaSec) => {
          setApkUploadProgress(percent);
          if (speedBps) {
            setApkUploadSpeedText(formatSpeed(speedBps));
          }
          if (loadedBytes && totalBytes) {
            const loadedMB = (loadedBytes / (1024 * 1024)).toFixed(1);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            setApkUploadTransferredText(`${loadedMB} MB / ${totalMB} MB`);
          }
          if (etaSec !== undefined && etaSec > 0) {
            setApkUploadEtaText(`${etaSec}s remaining`);
          } else {
            setApkUploadEtaText('');
          }
          if (percent < 100) {
            setApkUploadStatusText(`Uploading ${percent}%`);
          } else {
            setApkUploadStatusText('Assembling APK and extracting metadata...');
            setApkUploadEtaText('');
          }
        },
      });

      setFormApkUrl(res.url);
      setFormApkFileName(res.fileName);
      setFormFileSize(res.sizeFormatted);
      if (res.sha256) {
        setFormApkSha256(res.sha256);
      }
      setFieldErrors({});

      // Apply detected APK metadata if extracted by server
      if (res.parsed) {
        setDetectedMeta(res.parsed);
        if (res.parsed.title && !formTitle.trim()) {
          setFormTitle(res.parsed.title);
        }
        if (res.parsed.packageName && !formPackageName.trim()) {
          setFormPackageName(res.parsed.packageName);
        }
        if (res.parsed.version && !formVersion.trim()) {
          setFormVersion(res.parsed.version);
        }
        if (res.parsed.versionCode && (!formVersionCode || formVersionCode === '1')) {
          setFormVersionCode(String(res.parsed.versionCode));
        }
        if (res.parsed.iconUrl && !formIconUrl.trim()) {
          setFormIconUrl(res.parsed.iconUrl);
        }
        setApkUploadSuccess(`APK uploaded and verified! Extracted: ${res.parsed.title || res.fileName} (v${res.parsed.version || '1.0.0'})`);
      } else {
        setDetectedMeta(null);
        setApkUploadSuccess(`APK uploaded successfully: ${res.fileName} (${res.sizeFormatted})`);
      }

      // Safe filename fallback if title is still empty
      const cleanBase = (res.fileName || file.name || '')
        .replace(/\.apk$/i, '')
        .replace(/[-_]/g, ' ')
        .trim();
      const capitalized = cleanBase ? cleanBase.charAt(0).toUpperCase() + cleanBase.slice(1) : '';

      if (!formTitle.trim() && capitalized) {
        setFormTitle(capitalized);
      }
      if (!formPackageName.trim() && cleanBase) {
        const safeSlug = cleanBase.toLowerCase().replace(/[^a-z0-9]/g, '');
        setFormPackageName(`com.winterbuild.${safeSlug || 'app'}`);
      }
      if (!formVersion.trim()) {
        setFormVersion('1.0.0');
      }
    } catch (err: any) {
      if (err.message === 'Upload was cancelled.') {
        setApkUploadError('Upload was cancelled. You can select another file or try again.');
      } else {
        setApkUploadError(err.message || 'Could not upload app file. Please check your connection and try again.');
      }
      setApkUploadSuccess(null);
    } finally {
      setIsUploadingApk(false);
      setApkUploadProgress(0);
      setApkUploadStatusText('');
      setApkUploadSpeedText('');
      setApkUploadTransferredText('');
      setApkUploadEtaText('');
      apkAbortControllerRef.current = null;
    }
  };

  // Handle APK File Upload via file selector
  const handleApkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      processApkFile(file);
    }
  };

  // Handle APK File Drag and Drop
  const handleApkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingApk(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processApkFile(file);
    }
  };

  // Cancel in-progress APK upload
  const handleCancelApkUpload = () => {
    if (apkAbortControllerRef.current) {
      apkAbortControllerRef.current.abort();
    }
  };

  // Save App Listing - Only APK is strictly required! All other details are optional with safe fallbacks
  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check APK requirement
    if (!formApkUrl.trim()) {
      setFieldErrors({ apkUrl: 'APK file or download link is required to publish.' });
      setEditorError('Please upload an APK file or enter a download link before publishing.');
      
      setTimeout(() => {
        const el = document.getElementById('field-apkUrl') || document.getElementById('drop-zone-apk');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    setEditorError(null);

    // Auto-derive title from APK filename if not provided
    let finalTitle = formTitle.trim();
    if (!finalTitle) {
      if (formApkFileName) {
        const cleaned = formApkFileName.replace(/\.apk$/i, '').replace(/[-_]/g, ' ').trim();
        finalTitle = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Untitled App';
      } else {
        finalTitle = 'Untitled App';
      }
    }

    // Auto-derive package name if not provided
    let finalPkg = formPackageName.trim();
    if (!finalPkg) {
      const slug = finalTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      finalPkg = `com.winterbuild.${slug || 'app'}`;
    }

    // Auto-derive version if not provided
    const finalVersion = formVersion.trim() || '1.0.0';

    const payload: Partial<AppListing> = {
      title: finalTitle,
      packageName: finalPkg,
      developer: formDeveloper.trim() || 'WinterBuild Community',
      category: formCategory || 'Tools',
      version: finalVersion,
      versionCode: Number(formVersionCode) || 1,
      minAndroid: formMinAndroid.trim() || 'Android 8.0+',
      targetArchitecture: formArchitecture.trim() || 'Universal',
      fileSize: formFileSize.trim() || 'APK',
      releaseDate: formReleaseDate || new Date().toISOString().split('T')[0],
      shortDescription: formShortDesc.trim() || 'Safe Android application package.',
      description: formDesc.trim() || 'Safe Android application package ready for fast download and installation.',
      features: formFeatures.split('\n').map((s) => s.trim()).filter(Boolean),
      changelog: formChangelog.trim() || 'Initial release.',
      iconUrl: formIconUrl.trim(),
      screenshots: formScreenshots,
      apkUrl: formApkUrl.trim(),
      apkFileName: formApkFileName.trim(),
      apkSha256: formApkSha256.trim(),
      isVerified: formIsVerified,
      isFeatured: formIsFeatured,
    };

    try {
      if (editingApp) {
        await updateAppListing(editingApp.id, payload);
      } else {
        await createAppListing(payload);
      }
      setIsEditorOpen(false);
      onRefreshApps();
    } catch (err: any) {
      setEditorError(err.message || 'Failed to save application listing.');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingApp) return;
    setIsDeleting(true);
    try {
      await deleteAppListing(deletingApp.id);
      setDeletingApp(null);
      onRefreshApps();
    } catch (err: any) {
      alert(`Delete error: ${err.message || 'Could not delete app.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter apps in admin view
  const filteredApps = apps.filter((app) => {
    const q = adminSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      app.title.toLowerCase().includes(q) ||
      app.packageName.toLowerCase().includes(q) ||
      app.developer.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q)
    );
  });

  // ==================== SCREEN 1: AUTHENTICATION / SETUP ====================
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="rounded-2xl border border-[#ded5c5] bg-[#ffffff] p-8 space-y-6 shadow-xs">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#f0e6d6] border border-[#d8c8b4] flex items-center justify-center mx-auto text-[#7c4d29]">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-[#281e16]">
              {isSetupMode ? 'Create Your Admin Password' : 'Admin Login'}
            </h1>
            <p className="text-xs text-[#6e5d4f] leading-relaxed">
              {isSetupMode
                ? 'Create a password to protect and manage your website and apps.'
                : 'Enter your password to manage your website and apps.'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-[#fcf0f0] border border-[#f0c8c8] text-[#8e2a2a] text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#8e2a2a] shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form id="form-admin-login" onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-xs font-medium text-[#4d3c2e]">
                {isSetupMode ? 'Create Password' : 'Password'}
              </label>
              <input
                id="admin-password"
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#faf7f2] border border-[#e2d8c7] text-[#281e16] text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#7c4d29] transition-all font-mono"
              />
            </div>

            {isSetupMode && (
              <div className="space-y-1.5">
                <label htmlFor="admin-confirm-password" className="text-xs font-medium text-[#4d3c2e]">
                  Confirm Password
                </label>
                <input
                  id="admin-confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full bg-[#faf7f2] border border-[#e2d8c7] text-[#281e16] text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#7c4d29] transition-all font-mono"
                />
              </div>
            )}

            <button
              id="btn-admin-login-submit"
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-3 rounded-xl bg-[#6b4423] hover:bg-[#543318] disabled:opacity-50 text-[#fdfcf9] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {isAuthLoading
                  ? 'Checking...'
                  : isSetupMode
                  ? 'Save Password & Enter'
                  : 'Log In'}
              </span>
            </button>
          </form>

          <div className="pt-2 border-t border-[#ded5c5] text-center">
            <button
              onClick={onOpenDeployGuide}
              className="text-xs text-[#6e5d4f] hover:text-[#281e16] transition-colors flex items-center justify-center gap-1.5 mx-auto"
            >
              <Terminal className="w-3.5 h-3.5 text-[#7c4d29]" />
              <span>View Setup Instructions</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ==================== SCREEN 2: AUTHENTICATED DASHBOARD ====================
  const totalDownloads = apps.reduce((acc, curr) => acc + (curr.downloadsCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 text-[#4d3c2e]">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ded5c5] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2d5c37]">
            <ShieldCheck className="w-4 h-4" />
            <span>Website Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#281e16] tracking-tight">
            Manage My Website
          </h1>
          <p className="text-xs text-[#6e5d4f]">
            Add new apps, update existing ones, and manage downloads.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-admin-add-app"
            onClick={() => handleOpenEditor()}
            className="px-4 py-2.5 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New App</span>
          </button>

          <button
            onClick={onOpenDeployGuide}
            className="px-3.5 py-2.5 rounded-xl bg-[#faf6f0] border border-[#ded5c5] hover:bg-[#f0e6d6] text-[#4d3c2e] hover:text-[#281e16] text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-4 h-4 text-[#7c4d29]" />
            <span className="hidden sm:inline">Setup Guide</span>
          </button>

          <button
            id="btn-admin-logout"
            onClick={onLogout}
            className="px-3.5 py-2.5 rounded-xl bg-[#faf6f0] border border-[#ded5c5] hover:bg-[#fcf0f0] hover:border-[#f0c8c8] text-[#6e5d4f] hover:text-[#8e2a2a] text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Log Out"
          >
            <Unlock className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#ffffff] border border-[#ded5c5] space-y-1 shadow-xs">
          <span className="text-xs text-[#6e5d4f]">Total Apps</span>
          <p className="text-2xl font-extrabold text-[#281e16]">{apps.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#ffffff] border border-[#ded5c5] space-y-1 shadow-xs">
          <span className="text-xs text-[#6e5d4f]">Total Downloads</span>
          <p className="text-2xl font-extrabold text-[#7c4d29]">{totalDownloads}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#ffffff] border border-[#ded5c5] space-y-1 shadow-xs">
          <span className="text-xs text-[#6e5d4f]">Featured Apps</span>
          <p className="text-2xl font-extrabold text-[#935b1d]">
            {apps.filter((a) => a.isFeatured).length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#ffffff] border border-[#ded5c5] space-y-1 shadow-xs">
          <span className="text-xs text-[#6e5d4f]">Storage Type</span>
          <p className="text-xs font-semibold text-[#2d5c37] truncate">Local Storage</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-[#ded5c5] bg-[#ffffff] overflow-hidden shadow-xs">
        
        {/* Table Search Header */}
        <div className="p-4 border-b border-[#ded5c5] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#faf6f0]">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search your apps..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-[#7c4d29]"
            />
            <Search className="w-4 h-4 text-[#9a897b] absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="text-xs text-[#6e5d4f] flex items-center gap-2">
            <span>{filteredApps.length === 1 ? '1 app found' : `${filteredApps.length} apps found`}</span>
            <button
              onClick={onRefreshApps}
              className="p-1.5 rounded-lg text-[#6e5d4f] hover:text-[#281e16] hover:bg-[#f0e6d6] transition-colors"
              title="Refresh app list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table or Empty State */}
        {filteredApps.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#f0e6d6] flex items-center justify-center mx-auto text-[#7c4d29]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#281e16]">No Apps Added Yet</h3>
            <p className="text-xs text-[#6e5d4f] max-w-sm mx-auto">
              Get started by adding your first Android app.
            </p>
            <button
              onClick={() => handleOpenEditor()}
              className="px-4 py-2 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add First App</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#ded5c5] text-[#6e5d4f] bg-[#f5efe6] uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">App</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Downloads</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece5d8] text-[#4d3c2e]">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-[#faf7f2] transition-colors">
                    
                    {/* App Icon + Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#f5eee3] border border-[#ded3c2] flex items-center justify-center overflow-hidden shrink-0">
                          {app.iconUrl ? (
                            <img src={getAssetUrl(app.iconUrl)} alt={app.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-[#7c4d29]">{app.title.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-[#281e16] hover:text-[#7c4d29] cursor-pointer" onClick={() => onSelectApp(app.id)}>
                            {app.title}
                          </p>
                          <p className="font-mono text-[11px] text-[#6e5d4f]">{app.packageName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Version */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[#281e16]">v{app.version}</span>
                      <p className="text-[11px] text-[#6e5d4f]">{app.minAndroid.split(' ')[0]}</p>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#faf6f0] border border-[#ded5c5] text-[#4d3c2e] text-[11px]">
                        {app.category}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-4 font-mono text-[#4d3c2e]">
                      {app.fileSize}
                    </td>

                    {/* Downloads */}
                    <td className="py-3 px-4 font-semibold text-[#281e16]">
                      {app.downloadsCount || 0}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {app.isFeatured && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fdf4e8] text-[#855416] border border-[#ecd4b4]">
                            Featured
                          </span>
                        )}
                        {app.isVerified && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#edf4ee] text-[#2d5c37] border border-[#cbe0ce]">
                            Verified
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`btn-admin-preview-${app.id}`}
                          onClick={() => onSelectApp(app.id)}
                          className="p-1.5 rounded-lg text-[#6e5d4f] hover:text-[#281e16] hover:bg-[#f0e6d6]"
                          title="View App Page"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-admin-edit-${app.id}`}
                          onClick={() => handleOpenEditor(app)}
                          className="p-1.5 rounded-lg text-[#6e5d4f] hover:text-[#7c4d29] hover:bg-[#f0e6d6]"
                          title="Edit App"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-admin-delete-${app.id}`}
                          onClick={() => setDeletingApp(app)}
                          className="p-1.5 rounded-lg text-[#6e5d4f] hover:text-[#8e2a2a] hover:bg-[#fcf0f0]"
                          title="Delete App"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ==================== MODAL: ADD / EDIT APP ==================== */}
      {isEditorOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-[#281e16]/70 backdrop-blur-xs overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving && !isUploadingApk) {
              setIsEditorOpen(false);
            }
          }}
        >
          <div 
            id="modal-app-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-editor-title"
            className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[#ffffff] border border-[#ded5c5] rounded-2xl shadow-2xl text-[#4d3c2e] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pinned Header */}
            <div className="shrink-0 px-5 py-4 sm:px-8 sm:py-5 border-b border-[#ded5c5] bg-[#ffffff] flex items-center justify-between gap-4 z-10">
              <div className="min-w-0">
                <h2 id="modal-editor-title" className="text-base sm:text-lg font-bold text-[#281e16] truncate">
                  {editingApp ? `Edit: ${editingApp.title}` : 'Add New App'}
                </h2>
                <p className="text-xs text-[#6e5d4f] truncate">
                  Upload your APK file and configure app details.
                </p>
              </div>
              <button
                type="button"
                id="btn-close-app-editor"
                onClick={() => {
                  if (!isSaving && !isUploadingApk) {
                    setIsEditorOpen(false);
                  }
                }}
                className="p-2 text-[#6e5d4f] hover:text-[#281e16] hover:bg-[#faf6f0] rounded-xl transition-colors shrink-0"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form containing scrollable body and pinned footer */}
            <form noValidate onSubmit={handleSaveApp} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              
              {/* Scrollable Form Body */}
              <div 
                ref={modalScrollContainerRef}
                tabIndex={0}
                className="flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6 space-y-6 overscroll-contain focus:outline-none"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {editorError && (
                  <div className="p-3.5 rounded-xl bg-[#fcf0f0] border border-[#f0c8c8] text-[#8e2a2a] text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#8e2a2a] shrink-0 mt-0.5" />
                    <span>{editorError}</span>
                  </div>
                )}

                {/* Quick Step Navigation Pill Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#faf6f0] border border-[#ded5c5] text-xs">
                  <span className="font-semibold text-[#6e5d4f]">Quick Navigation:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (modalScrollContainerRef.current) {
                          modalScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#ffffff] border border-[#ded5c5] text-[#281e16] hover:text-[#7c4d29] hover:border-[#7c4d29] font-medium text-[11px] transition-colors shadow-2xs"
                    >
                      Step 1: APK Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('section-step-2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#ffffff] border border-[#ded5c5] text-[#281e16] hover:text-[#7c4d29] hover:border-[#7c4d29] font-medium text-[11px] transition-colors shadow-2xs"
                    >
                      Step 2: App Details
                    </button>
                  </div>
                </div>
              
              {/* STEP 1: APK PACKAGE FILE (REQUIRED) */}
              <div 
                id="field-apkUrl"
                className={`p-5 rounded-2xl transition-all ${
                  fieldErrors.apkUrl 
                    ? 'bg-[#fcf0f0] border-2 border-[#d34545] shadow-xs' 
                    : 'bg-[#faf7f2] border border-[#ded5c5] shadow-xs'
                } space-y-4`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#6b4423] text-white font-black text-[10px] uppercase tracking-wide">
                        Step 1
                      </span>
                      <h3 className="text-sm font-bold text-[#281e16] flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-[#7c4d29]" />
                        Upload APK File <span className="text-[#7c4d29] text-xs font-semibold">(Required to Publish)</span>
                      </h3>
                    </div>
                    <p className="text-xs text-[#6e5d4f] mt-0.5">
                      Fast concurrent upload with automatic metadata extraction.
                    </p>
                  </div>
                  {fieldErrors.apkUrl && (
                    <span className="text-[#8e2a2a] text-xs font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#8e2a2a] shrink-0" />
                      {fieldErrors.apkUrl}
                    </span>
                  )}
                </div>

                {/* Drag and Drop Zone & File Selector */}
                <div
                  id="drop-zone-apk"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingApk(true);
                  }}
                  onDragLeave={() => setIsDraggingApk(false)}
                  onDrop={handleApkDrop}
                  className={`relative p-6 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-3 ${
                    isDraggingApk
                      ? 'border-[#7c4d29] bg-[#f5eee3] ring-4 ring-[#7c4d29]/20'
                      : isUploadingApk
                      ? 'border-[#7c4d29] bg-[#faf6f0]'
                      : formApkUrl
                      ? 'border-[#2d5c37] bg-[#edf4ee]'
                      : 'border-[#ded5c5] hover:border-[#7c4d29] bg-[#ffffff]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#f0e6d6] border border-[#d8c8b4] flex items-center justify-center text-[#7c4d29]">
                    {isUploadingApk ? (
                      <Loader2 className="w-6 h-6 animate-spin text-[#7c4d29]" />
                    ) : formApkUrl ? (
                      <Check className="w-6 h-6 text-[#2d5c37]" />
                    ) : (
                      <Upload className="w-6 h-6 text-[#7c4d29]" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#281e16]">
                      {isUploadingApk ? (
                        <span>{apkUploadStatusText || 'Uploading APK...'}</span>
                      ) : formApkUrl ? (
                        <span className="text-[#2d5c37]">APK is ready for publishing!</span>
                      ) : (
                        <span>Drag & drop your .apk file here, or click to browse</span>
                      )}
                    </p>
                    <p className="text-xs text-[#6e5d4f]">
                      Standard Android Packages (.apk) up to 200 MB supported
                    </p>
                  </div>

                  {/* Upload Progress & Transfer Details */}
                  {isUploadingApk && (
                    <div className="w-full max-w-md space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs text-[#4d3c2e]">
                        <span className="font-bold text-[#7c4d29] font-mono">{apkUploadProgress}%</span>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-[#6e5d4f]">
                          {apkUploadTransferredText && <span>{apkUploadTransferredText}</span>}
                          {apkUploadSpeedText && <span className="text-[#2d5c37]">({apkUploadSpeedText})</span>}
                          {apkUploadEtaText && <span>• {apkUploadEtaText}</span>}
                        </div>
                      </div>
                      <div className="w-full bg-[#e8decb] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#7c4d29] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(5, apkUploadProgress)}%` }}
                        />
                      </div>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleCancelApkUpload}
                          className="text-xs text-[#8e2a2a] hover:text-[#6a1d1d] underline font-medium"
                        >
                          Cancel Upload
                        </button>
                      </div>
                    </div>
                  )}

                  {!isUploadingApk && (
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] text-xs font-bold cursor-pointer shadow-xs transition-all active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formApkUrl ? 'Choose Different .apk File' : 'Select .apk File'}</span>
                      <input
                        type="file"
                        accept=".apk,application/vnd.android.package-archive"
                        onChange={handleApkUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Detected APK Information Banner */}
                {detectedMeta && (
                  <div className="p-3.5 rounded-xl bg-[#f5eee3] border border-[#ded5c5] text-xs text-[#4d3c2e] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#281e16] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#7c4d29]" />
                        Information Extracted from APK
                      </span>
                      <span className="text-[11px] text-[#7c4d29] bg-[#ebe0d0] px-2 py-0.5 rounded-full font-medium">
                        Auto-filled below
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="bg-[#ffffff] p-2 rounded-lg border border-[#ded5c5]">
                        <span className="text-[#6e5d4f] block text-[10px] uppercase">App Name</span>
                        <span className="font-semibold text-[#281e16] truncate block">{detectedMeta.title || 'Auto-derived from file'}</span>
                      </div>
                      <div className="bg-[#ffffff] p-2 rounded-lg border border-[#ded5c5]">
                        <span className="text-[#6e5d4f] block text-[10px] uppercase">Package ID</span>
                        <span className="font-mono text-[#281e16] truncate block">{detectedMeta.packageName || 'Auto-generated'}</span>
                      </div>
                      <div className="bg-[#ffffff] p-2 rounded-lg border border-[#ded5c5]">
                        <span className="text-[#6e5d4f] block text-[10px] uppercase">Version</span>
                        <span className="font-semibold text-[#2d5c37] block">{detectedMeta.version ? `v${detectedMeta.version}` : 'v1.0.0'}</span>
                      </div>
                      <div className="bg-[#ffffff] p-2 rounded-lg border border-[#ded5c5]">
                        <span className="text-[#6e5d4f] block text-[10px] uppercase">App Icon</span>
                        <span className="text-[#281e16] block truncate">{detectedMeta.iconUrl ? 'Extracted' : 'Standard'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Success Message */}
                {apkUploadSuccess && !detectedMeta && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#edf4ee] border border-[#cbe0ce] text-xs text-[#2d5c37]">
                    <div className="flex items-center gap-2 truncate">
                      <Check className="w-4 h-4 text-[#2d5c37] shrink-0" />
                      <span className="font-medium truncate">{apkUploadSuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApkUploadSuccess(null)}
                      className="text-[#2d5c37] hover:text-[#1c3f25] text-xs ml-2 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Upload Error Message */}
                {apkUploadError && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#fcf0f0] border border-[#f0c8c8] text-xs text-[#8e2a2a]">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#8e2a2a] shrink-0" />
                      <span>{apkUploadError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApkUploadError(null)}
                      className="text-[#8e2a2a] hover:text-[#6a1d1d] text-xs ml-2 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Direct Download URL Input (Alternative Option) */}
                <div className="pt-2 border-t border-[#ded5c5] space-y-1.5">
                  <label className="text-xs font-medium text-[#6e5d4f] flex items-center justify-between">
                    <span>Or enter direct APK download link</span>
                    <span className="text-[11px] text-[#6e5d4f] font-normal">Alternative</span>
                  </label>
                  <input
                    id="input-direct-apk-url"
                    name="apkUrl"
                    type="text"
                    placeholder="https://example.com/app.apk or /uploads/..."
                    value={formApkUrl}
                    onChange={(e) => {
                      setFormApkUrl(e.target.value);
                      if (fieldErrors.apkUrl) {
                        setFieldErrors((prev) => ({ ...prev, apkUrl: undefined }));
                      }
                      setApkUploadSuccess(null);
                      setApkUploadError(null);
                    }}
                    className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3.5 py-2.5 focus:border-[#7c4d29] focus:outline-none font-mono"
                  />
                  {formApkSha256 && (
                    <div className="text-[11px] text-[#6e5d4f] font-mono truncate pt-1">
                      SHA-256 Checksum: <span className="text-[#2d5c37]">{formApkSha256}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: OPTIONAL APP INFORMATION */}
              <div id="section-step-2" className="p-5 rounded-2xl bg-[#faf7f2] border border-[#ded5c5] space-y-5">
                <div className="border-b border-[#ded5c5] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#e8decb] text-[#4d3c2e] font-bold text-[10px] uppercase tracking-wide">
                      Step 2
                    </span>
                    <h3 className="text-sm font-bold text-[#281e16]">
                      App Information <span className="text-[#6e5d4f] text-xs font-normal">(Optional)</span>
                    </h3>
                  </div>
                  <p className="text-xs text-[#6e5d4f] mt-0.5">
                    All fields below are optional. You can publish right away or customize anything you want.
                  </p>
                </div>

                {/* Row 1: App Title, Package Name, Developer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="field-title" className="text-xs font-medium text-[#4d3c2e] flex items-center justify-between">
                      <span>App Name</span>
                      <span className="text-[10px] text-[#6e5d4f]">Optional</span>
                    </label>
                    <input
                      id="field-title"
                      name="title"
                      type="text"
                      placeholder="e.g. VLC Media Player (auto-named from APK if blank)"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] focus:border-[#7c4d29] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="field-packageName" className="text-xs font-medium text-[#4d3c2e] flex items-center justify-between">
                      <span>App Package ID</span>
                      <span className="text-[10px] text-[#6e5d4f]">Optional</span>
                    </label>
                    <input
                      id="field-packageName"
                      name="packageName"
                      type="text"
                      placeholder="e.g. org.videolan.vlc (auto-created if blank)"
                      value={formPackageName}
                      onChange={(e) => setFormPackageName(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] focus:border-[#7c4d29] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:outline-none font-mono transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#4d3c2e] flex items-center justify-between">
                      <span>Developer or Maker</span>
                      <span className="text-[10px] text-[#6e5d4f]">Optional</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WinterBuild Community"
                      value={formDeveloper}
                      onChange={(e) => setFormDeveloper(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Category, Version, VersionCode, Release Date */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#4d3c2e]">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as AppCategory)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none"
                    >
                      {APP_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="field-version" className="text-xs font-medium text-[#4d3c2e] flex items-center justify-between">
                      <span>Version Number</span>
                      <span className="text-[10px] text-[#6e5d4f]">Optional</span>
                    </label>
                    <input
                      id="field-version"
                      name="version"
                      type="text"
                      placeholder="e.g. 1.0.0"
                      value={formVersion}
                      onChange={(e) => setFormVersion(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] focus:border-[#7c4d29] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:outline-none font-mono transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#4d3c2e]">Version Code</label>
                    <input
                      type="number"
                      value={formVersionCode}
                      onChange={(e) => setFormVersionCode(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#4d3c2e]">Release Date</label>
                    <input
                      type="date"
                      value={formReleaseDate}
                      onChange={(e) => setFormReleaseDate(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 3: Minimum Android, Target Architecture, File Size */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#4d3c2e]">Android Version Needed</label>
                    <input
                      type="text"
                      placeholder="e.g. Android 8.0 or higher"
                      value={formMinAndroid}
                      onChange={(e) => setFormMinAndroid(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#4d3c2e]">Phone Processor</label>
                    <input
                      type="text"
                      placeholder="Universal (all phones)"
                      value={formArchitecture}
                      onChange={(e) => setFormArchitecture(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#4d3c2e]">File Size</label>
                    <input
                      type="text"
                      placeholder="Auto-detected on upload"
                      value={formFileSize}
                      onChange={(e) => setFormFileSize(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 4: Icon Upload / URL */}
                <div className="p-4 rounded-xl bg-[#ffffff] border border-[#ded5c5] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#4d3c2e]">
                      App Icon <span className="text-[10px] text-[#6e5d4f] font-normal lowercase">(optional - extracted from APK if available)</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#faf6f0] border border-[#ded5c5] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {formIconUrl ? (
                        <img src={getAssetUrl(formIconUrl)} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Smartphone className="w-6 h-6 text-[#9a897b]" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Icon image link or upload below..."
                        value={formIconUrl}
                        onChange={(e) => setFormIconUrl(e.target.value)}
                        className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2 focus:border-[#7c4d29] focus:outline-none"
                      />

                      <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        isUploadingIcon 
                          ? 'bg-[#f0e6d6] border border-[#7c4d29] text-[#7c4d29] cursor-wait' 
                          : 'bg-[#f0e6d6] hover:bg-[#e4d6c2] text-[#4d3c2e] border border-[#ded5c5] cursor-pointer'
                      }`}>
                        {isUploadingIcon ? (
                          <Loader2 className="w-3.5 h-3.5 text-[#7c4d29] animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-[#7c4d29]" />
                        )}
                        <span>{isUploadingIcon ? 'Uploading...' : 'Upload Custom Icon'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIconUpload}
                          disabled={isUploadingIcon}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Row 5: Screenshots */}
                <div className="p-4 rounded-xl bg-[#ffffff] border border-[#ded5c5] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#4d3c2e]">
                      App Pictures / Screenshots ({formScreenshots.length})
                    </label>
                    <label className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors ${
                      isUploadingScreenshot 
                        ? 'bg-[#f0e6d6] border border-[#7c4d29] text-[#7c4d29] cursor-wait' 
                        : 'bg-[#f0e6d6] hover:bg-[#e4d6c2] text-[#4d3c2e] border border-[#ded5c5] cursor-pointer'
                    }`}>
                      {isUploadingScreenshot ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#7c4d29] animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#7c4d29]" />
                      )}
                      <span>{isUploadingScreenshot ? 'Uploading...' : 'Upload Picture'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        disabled={isUploadingScreenshot}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {formScreenshots.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {formScreenshots.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-28 rounded-lg overflow-hidden border border-[#ded5c5] shrink-0 group">
                          <img src={getAssetUrl(url)} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormScreenshots(formScreenshots.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-[#281e16]/80 rounded text-white hover:text-[#e47676]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#6e5d4f] italic">No pictures uploaded yet (optional).</p>
                  )}
                </div>

                {/* Row 6: Descriptions & Features */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#4d3c2e] flex items-center justify-between">
                      <span>Short Summary</span>
                      <span className="text-[10px] text-[#6e5d4f]">Optional</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Brief 1-2 sentence description of the app..."
                      value={formShortDesc}
                      onChange={(e) => setFormShortDesc(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#4d3c2e] flex items-center justify-between">
                      <span>Full Description</span>
                      <span className="text-[10px] text-[#6e5d4f]">Optional</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tell people what your app does, its benefits, and how to use it..."
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#4d3c2e] flex items-center justify-between">
                        <span>Key Features (One per line)</span>
                        <span className="text-[10px] text-[#6e5d4f]">Optional</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Fast performance&#10;Dark mode supported&#10;Offline friendly"
                        value={formFeatures}
                        onChange={(e) => setFormFeatures(e.target.value)}
                        className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#4d3c2e] flex items-center justify-between">
                        <span>What's New in this Version</span>
                        <span className="text-[10px] text-[#6e5d4f]">Optional</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Bug fixes and improvements&#10;Updated UI"
                        value={formChangelog}
                        onChange={(e) => setFormChangelog(e.target.value)}
                        className="w-full bg-[#ffffff] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs rounded-xl px-3 py-2.5 focus:border-[#7c4d29] focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#4d3c2e]">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="rounded border-[#ded5c5] bg-[#ffffff] text-[#6b4423] focus:ring-[#6b4423]"
                    />
                    <span>Show in Featured Apps on homepage</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#4d3c2e]">
                    <input
                      type="checkbox"
                      checked={formIsVerified}
                      onChange={(e) => setFormIsVerified(e.target.checked)}
                      className="rounded border-[#ded5c5] bg-[#ffffff] text-[#2d5c37] focus:ring-[#2d5c37]"
                    />
                    <span>Mark as Verified Safe</span>
                  </label>
                </div>

                {/* Back to Step 1 shortcut */}
                <div className="flex items-center justify-between pt-2 border-t border-[#ded5c5]">
                  <span className="text-[11px] text-[#6e5d4f]">Need to re-upload APK or review top fields?</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalScrollContainerRef.current) {
                        modalScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="text-xs text-[#7c4d29] hover:text-[#543318] font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffffff] border border-[#ded5c5] hover:bg-[#f5eee3] hover:border-[#7c4d29] transition-colors shadow-2xs"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Back to Step 1 (Top)</span>
                  </button>
                </div>
              </div>

              {/* End of Scrollable Body */}
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className="shrink-0 px-5 py-3.5 sm:px-8 sm:py-4 border-t border-[#ded5c5] bg-[#faf7f2] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 z-10">
                <div className="text-xs text-[#6e5d4f]">
                  {formApkUrl ? (
                    <span className="text-[#2d5c37] font-medium flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      APK ready • Click Publish App to make it live
                    </span>
                  ) : (
                    <span>Upload an APK file above to publish</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#f0e6d6] hover:bg-[#e4d6c2] text-[#4d3c2e] text-xs font-semibold transition-colors border border-[#ded5c5]"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-publish-app-submit"
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-[#6b4423] hover:bg-[#543318] disabled:opacity-50 text-[#fdfcf9] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSaving ? 'Saving...' : editingApp ? 'Save Changes' : 'Publish App'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DELETE CONFIRMATION ==================== */}
      {deletingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#281e16]/60 backdrop-blur-xs">
          <div 
            id="modal-confirm-delete"
            className="w-full max-w-md bg-[#ffffff] border border-[#f0c8c8] rounded-2xl p-6 shadow-2xl space-y-4 text-[#4d3c2e]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fcf0f0] border border-[#f0c8c8] flex items-center justify-center text-[#8e2a2a] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#281e16]">Delete App</h3>
                <p className="text-xs text-[#6e5d4f]">This cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-[#4d3c2e] leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-[#281e16]">"{deletingApp.title}"</strong>? 
              Visitors will no longer be able to find or download this app.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setDeletingApp(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-[#f0e6d6] hover:bg-[#e4d6c2] text-[#4d3c2e] text-xs font-medium border border-[#ded5c5]"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-action"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-[#8e2a2a] hover:bg-[#731f1f] disabled:opacity-50 text-white text-xs font-bold shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete App'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
