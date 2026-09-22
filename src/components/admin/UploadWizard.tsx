import React, { useState, useRef } from 'react';
import type { Application, AppCategory, UploadProgressInfo } from '../../types';
import { APP_CATEGORIES } from '../../types';
import { extractApkMetadata } from '../../lib/apk-parser';
import { uploadApkDirect } from '../../services/upload';
import { api } from '../../services/api';
import { formatBytes, formatSpeed, formatDuration, slugify } from '../../lib/formatters';
import { Badge } from '../common/Badge';
import { AppCard } from '../apps/AppCard';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  RotateCcw,
  Smartphone,
  ShieldCheck,
  Loader2,
  Eye,
} from 'lucide-react';

interface UploadWizardProps {
  existingApp?: Application | null; // For editing or replacing APK
  mode?: 'create' | 'edit' | 'replace-apk';
  onSuccess: (app: Application) => void;
  onCancel: () => void;
}

export const UploadWizard: React.FC<UploadWizardProps> = ({
  existingApp,
  mode = 'create',
  onSuccess,
  onCancel,
}) => {
  // Wizard steps: 1: Upload, 2: Details, 3: Preview, 4: Publish
  const [step, setStep] = useState<number>(mode === 'edit' ? 2 : 1);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Extracted and form data
  const [name, setName] = useState(existingApp?.name || '');
  const [slug, setSlug] = useState(existingApp?.slug || '');
  const [packageName, setPackageName] = useState(existingApp?.package_name || '');
  const [versionName, setVersionName] = useState(existingApp?.version_name || '1.0.0');
  const [versionCode, setVersionCode] = useState<number>(existingApp?.version_code || 1);
  const [shortDescription, setShortDescription] = useState(existingApp?.short_description || '');
  const [description, setDescription] = useState(existingApp?.description || '');
  const [category, setCategory] = useState<AppCategory>(existingApp?.category || 'Utilities');
  const [iconUrl, setIconUrl] = useState(existingApp?.icon_url || '');
  const [screenshotsText, setScreenshotsText] = useState(
    existingApp?.screenshots?.join('\n') || ''
  );
  const [featured, setFeatured] = useState(existingApp?.featured || false);

  // Storage info
  const [apkStoragePath, setApkStoragePath] = useState(existingApp?.apk_storage_path || '');
  const [apkDownloadUrl, setApkDownloadUrl] = useState(existingApp?.apk_download_url || '');
  const [apkFileSize, setApkFileSize] = useState<number>(existingApp?.apk_file_size || 0);
  const [apkSha256, setApkSha256] = useState(existingApp?.apk_sha256 || '');

  // AI enhance state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File selection & processing
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setUploadError(null);

    // 1. Client-side extraction and validation
    try {
      setUploadProgress({
        state: 'validating',
        transferredBytes: 0,
        totalBytes: file.size,
        percentage: 0,
        speedBytesPerSec: 0,
        estimatedRemainingSec: 0,
      });

      const metadata = await extractApkMetadata(file, file.name);

      // Pre-fill extracted values
      if (!name || mode === 'create' || mode === 'replace-apk') {
        setName(metadata.name);
        setSlug(slugify(metadata.name));
      }
      setPackageName(metadata.packageName);
      setVersionName(metadata.versionName);
      setVersionCode(metadata.versionCode);
      setApkFileSize(metadata.fileSize);
      setApkSha256(metadata.sha256);

      if (metadata.iconDataUrl && (!iconUrl || mode === 'create')) {
        setIconUrl(metadata.iconDataUrl);
      }

      // Automatically trigger upload direct to storage
      await startDirectUpload(file, metadata.name);
    } catch (err: any) {
      console.error('File validation/extraction error:', err);
      setUploadError(err.message || 'Invalid Android package file.');
      setUploadProgress(null);
    }
  };

  const startDirectUpload = async (file: File, extractedName?: string) => {
    setIsUploading(true);
    setUploadError(null);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const result = await uploadApkDirect({
        file,
        appId: existingApp?.id,
        appName: name || extractedName || file.name.replace(/\.apk$/i, ''),
        signal: abortCtrl.signal,
        onProgress: (info) => {
          setUploadProgress(info);
        },
      });

      setApkStoragePath(result.storagePath);
      setApkDownloadUrl(result.downloadUrl);
      setIsUploading(false);
    } catch (err: any) {
      console.error('Direct upload failed:', err);
      setIsUploading(false);
      setUploadError(err.message || 'Upload failed.');
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setUploadProgress(null);
      setUploadError('Upload was cancelled.');
    }
  };

  const retryUpload = () => {
    if (selectedFile) {
      startDirectUpload(selectedFile);
    }
  };

  const handleAiEnhance = async () => {
    if (!name || !packageName) return;
    setIsEnhancing(true);
    try {
      const enhanced = await api.enhanceWithAi({
        appName: name,
        packageName,
        category,
        rawDescription: description || shortDescription,
      });

      if (enhanced.shortDescription) setShortDescription(enhanced.shortDescription);
      if (enhanced.description) setDescription(enhanced.description);
      if (enhanced.suggestedCategory) setCategory(enhanced.suggestedCategory as AppCategory);
    } catch (err) {
      console.warn('AI enhancement error:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSaveApp = async (status: 'draft' | 'published') => {
    if (!name || !packageName || !apkStoragePath) {
      setUploadError('Please complete all required fields and upload an APK file.');
      return;
    }

    setIsSubmitting(true);
    try {
      const screenshots = screenshotsText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload = {
        name,
        slug: slug || slugify(name),
        package_name: packageName,
        version_name: versionName,
        version_code: versionCode,
        short_description: shortDescription,
        description,
        category,
        icon_url: iconUrl,
        screenshots,
        apk_storage_path: apkStoragePath,
        apk_download_url: apkDownloadUrl,
        apk_file_size: apkFileSize,
        apk_sha256: apkSha256,
        status,
        featured,
      };

      let result: Application;
      if (existingApp && (mode === 'edit' || mode === 'replace-apk')) {
        result = await api.updateApp(existingApp.id, payload);
      } else {
        result = await api.createApp(payload);
      }

      onSuccess(result);
    } catch (err: any) {
      console.error('Failed to save application:', err);
      setUploadError(err.message || 'Failed to save application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview mock application object
  const previewApp: Application = {
    id: existingApp?.id || 'preview-id',
    name: name || 'Untitled App',
    slug: slug || 'untitled-app',
    package_name: packageName || 'com.example.app',
    version_name: versionName || '1.0.0',
    version_code: versionCode || 1,
    short_description: shortDescription || 'No description provided.',
    description: description || 'No detailed description provided.',
    category,
    icon_url: iconUrl,
    screenshots: screenshotsText.split('\n').filter(Boolean),
    apk_storage_path: apkStoragePath,
    apk_download_url: apkDownloadUrl,
    apk_file_size: apkFileSize,
    apk_sha256: apkSha256,
    downloads_count: existingApp?.downloads_count || 0,
    status: 'draft',
    featured,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="rounded-3xl border shadow-lg overflow-hidden bg-[#ffffff] border-[#e2d8c3] dark:bg-[#161412] dark:border-[#27231e]">
      {/* Wizard Header & Stepper */}
      <div className="border-b px-6 py-5 flex items-center justify-between bg-[#f7f1e6] border-[#e2d8c3] dark:bg-[#1b1916] dark:border-[#27231e]">
        <div>
          <h2 className="font-extrabold text-lg text-[#1f1914] dark:text-[#f8f5ee]">
            {mode === 'replace-apk'
              ? `Replace APK for ${existingApp?.name}`
              : mode === 'edit'
              ? `Edit ${existingApp?.name}`
              : 'Add New Android Application'}
          </h2>
          <p className="text-xs text-[#716556] dark:text-[#918576]">
            Step {step} of 4: {step === 1 ? 'APK Upload' : step === 2 ? 'App Details' : step === 3 ? 'Preview' : 'Publish'}
          </p>
        </div>

        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="p-2 rounded-xl text-[#716556] hover:bg-[#eae0ce] dark:text-[#8e8273] dark:hover:bg-[#25221e]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Steps Indicator */}
      <div className="flex border-b border-[#e2d8c3] dark:border-[#27231e] text-xs font-semibold">
        {[
          { num: 1, label: 'Upload APK' },
          { num: 2, label: 'Details' },
          { num: 3, label: 'Preview' },
          { num: 4, label: 'Publish' },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex-1 py-3 text-center border-r last:border-r-0 transition-colors ${
              step === s.num
                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-b-2 border-b-amber-600 font-bold'
                : step > s.num
                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/5'
                : 'text-[#85786a] dark:text-[#766c61]'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* Wizard Body */}
      <div className="p-6">
        {uploadError && (
          <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="flex-1">{uploadError}</p>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: APK UPLOAD */}
        {/* ------------------------------------------------------------- */}
        {step === 1 && (
          <div className="space-y-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-amber-600 bg-amber-500/10'
                  : 'border-[#dacdb6] hover:border-amber-600/50 bg-[#faf6ee] dark:border-[#2f2b25] dark:bg-[#191714] dark:hover:border-amber-400/40'
              }`}
              onClick={() => {
                const input = document.getElementById('wizard-apk-file-input');
                input?.click();
              }}
            >
              <input
                id="wizard-apk-file-input"
                type="file"
                accept=".apk,.xapk"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
                <UploadCloud className="w-8 h-8" />
              </div>

              <h3 className="font-extrabold text-base mb-1 text-[#1f1914] dark:text-[#f8f5ee]">
                Choose an Android APK to Upload
              </h3>
              <p className="text-xs text-[#716556] dark:text-[#918576] max-w-sm mx-auto mb-4">
                Drag and drop your <span className="font-mono font-bold">.apk</span> package here, or click to browse files. Direct browser-to-storage upload ensures high throughput.
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white dark:bg-amber-500 dark:text-neutral-950">
                Browse Files
              </div>
            </div>

            {/* Upload Progress Display */}
            {uploadProgress && (
              <div className="rounded-2xl p-5 border space-y-3 bg-[#f5efe3] border-[#e0d5c0] dark:bg-[#1a1815] dark:border-[#2a2620]">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    {uploadProgress.state === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
                    )}
                    <span className="capitalize text-[#261f19] dark:text-[#f5f1e8]">
                      {uploadProgress.state === 'authorizing'
                        ? 'Authorizing direct storage upload...'
                        : uploadProgress.state === 'uploading'
                        ? 'Uploading APK directly to storage'
                        : uploadProgress.state === 'verifying'
                        ? 'Verifying package and checksum...'
                        : 'Upload completed!'}
                    </span>
                  </div>
                  <span className="font-mono text-[#5c4f42] dark:text-[#a09485]">
                    {uploadProgress.percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 rounded-full overflow-hidden bg-[#e0d4be] dark:bg-[#28241e]">
                  <div
                    className="h-full transition-all duration-200 bg-amber-600 dark:bg-amber-400"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </div>

                {/* Accurate Metrics: Transferred / Total, Speed, ETA */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#786b5c] dark:text-[#8c8072] pt-1">
                  <span>
                    {formatBytes(uploadProgress.transferredBytes)} / {formatBytes(uploadProgress.totalBytes)}
                  </span>
                  {uploadProgress.state === 'uploading' && (
                    <>
                      <span>Speed: {formatSpeed(uploadProgress.speedBytesPerSec)}</span>
                      <span>ETA: {formatDuration(uploadProgress.estimatedRemainingSec)}</span>
                    </>
                  )}
                </div>

                {/* Cancel / Retry buttons */}
                {isUploading && (
                  <button
                    onClick={cancelUpload}
                    className="text-xs text-rose-600 hover:underline pt-1"
                  >
                    Cancel Upload
                  </button>
                )}
                {uploadError && selectedFile && (
                  <button
                    onClick={retryUpload}
                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline pt-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry Upload
                  </button>
                )}
              </div>
            )}

            {/* Extracted Metadata Summary Card */}
            {apkStoragePath && (
              <div className="rounded-2xl p-5 border space-y-3 bg-emerald-500/5 border-emerald-500/30 text-[#1f1914] dark:text-[#f8f5ee]">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>APK Successfully Processed & Extracted</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[#7d7060] dark:text-[#8a7e70] block">Name</span>
                    <span className="font-semibold">{name}</span>
                  </div>
                  <div>
                    <span className="text-[#7d7060] dark:text-[#8a7e70] block">Package</span>
                    <span className="font-mono truncate block">{packageName}</span>
                  </div>
                  <div>
                    <span className="text-[#7d7060] dark:text-[#8a7e70] block">Version</span>
                    <span className="font-mono">v{versionName} ({versionCode})</span>
                  </div>
                  <div>
                    <span className="text-[#7d7060] dark:text-[#8a7e70] block">SHA-256</span>
                    <span className="font-mono truncate block">{apkSha256.slice(0, 10)}...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2: APP DETAILS */}
        {/* ------------------------------------------------------------- */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#7d7060] dark:text-[#8a7e70]">
                Application Metadata
              </h3>
              <button
                type="button"
                onClick={handleAiEnhance}
                disabled={isEnhancing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-500/30 transition-colors"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enhancing with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Auto-Enhance with Gemini</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3b3127] dark:text-[#c4b7a6]">
                  Application Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!existingApp) setSlug(slugify(e.target.value));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3b3127] dark:text-[#c4b7a6]">
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3b3127] dark:text-[#c4b7a6]">
                  Package Name *
                </label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3b3127] dark:text-[#c4b7a6]">
                  Version Name
                </label>
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3b3127] dark:text-[#c4b7a6]">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AppCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                >
                  {APP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[#3b3127] dark:text-[#c4b7a6]">
                Short Description (Catchy 1-sentence summary)
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="e.g. Fast, secure and private messaging app for Android"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[#3b3127] dark:text-[#c4b7a6]">
                Full Description (Features, overview, installation notes)
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm leading-relaxed bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3b3127] dark:text-[#c4b7a6]">
                  App Icon URL (Auto-extracted or external image)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center bg-[#eae0cf] border-[#dacdb7] dark:bg-[#201d19] dark:border-[#332f28]">
                    {iconUrl ? (
                      <img src={iconUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Smartphone className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="https://... or data:image/..."
                    className="w-full px-3.5 py-2 rounded-xl border text-xs font-mono bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#3b3127] dark:text-[#c4b7a6]">
                  Screenshots URLs (one URL per line)
                </label>
                <textarea
                  rows={2}
                  value={screenshotsText}
                  onChange={(e) => setScreenshotsText(e.target.value)}
                  placeholder="https://example.com/shot1.png&#10;https://example.com/shot2.png"
                  className="w-full px-3 py-1.5 rounded-xl border text-xs font-mono bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                id="wizard-featured-checkbox"
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
              />
              <label htmlFor="wizard-featured-checkbox" className="text-xs font-semibold text-[#3b3127] dark:text-[#c4b7a6] cursor-pointer">
                Feature this application on the WinterBuilds homepage hero
              </label>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 3: PREVIEW */}
        {/* ------------------------------------------------------------- */}
        {step === 3 && (
          <div className="space-y-6">
            <p className="text-xs text-[#716556] dark:text-[#918576]">
              This is a live preview of how this application will render in the public catalog and detail page:
            </p>

            <div className="max-w-md mx-auto">
              <AppCard app={previewApp} onSelect={() => {}} />
            </div>

            {/* Technical Verification Details */}
            <div className="rounded-2xl p-4 border text-xs font-mono space-y-1.5 bg-[#f5efe3] border-[#e0d5c0] dark:bg-[#191714] dark:border-[#28241e]">
              <div className="flex justify-between">
                <span className="text-[#7d7060] dark:text-[#887c6e]">Storage Path:</span>
                <span className="truncate max-w-[280px]">{apkStoragePath}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d7060] dark:text-[#887c6e]">SHA-256 Hash:</span>
                <span className="truncate max-w-[280px]">{apkSha256}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d7060] dark:text-[#887c6e]">File Size:</span>
                <span>{formatBytes(apkFileSize)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 4: PUBLISH */}
        {/* ------------------------------------------------------------- */}
        {step === 4 && (
          <div className="space-y-6 text-center py-6">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-extrabold text-lg text-[#1f1914] dark:text-[#f8f5ee]">
                Ready to Publish {name}
              </h3>
              <p className="text-xs text-[#716556] dark:text-[#918576] leading-relaxed">
                You can publish the app immediately so visitors can download it, or save it as a draft to edit and review later.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveApp('draft')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold border transition-colors bg-[#ede2cf] border-[#dacbb1] text-[#4d4032] hover:bg-[#e4d7c0] dark:bg-[#1f1d19] dark:border-[#352f27] dark:text-[#d0c5b4] dark:hover:bg-[#28241f]"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveApp('published')}
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-900/20"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </span>
                ) : (
                  'Publish Application Now'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Navigation Controls */}
      <div className="border-t px-6 py-4 flex items-center justify-between bg-[#f8f3ea] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#27231e]">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border bg-[#ede2cf] border-[#dacbb1] text-[#4d4032] hover:bg-[#e4d7c0] dark:bg-[#1f1d19] dark:border-[#352f27] dark:text-[#d0c5b4]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous Step
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !apkStoragePath) {
                setUploadError('Please select and upload an APK file before proceeding.');
                return;
              }
              setUploadError(null);
              setStep(step + 1);
            }}
            disabled={step === 1 && !apkStoragePath}
            className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${
              step === 1 && !apkStoragePath
                ? 'opacity-50 cursor-not-allowed bg-[#ddd1be] text-[#716454] dark:bg-[#25221d] dark:text-[#6a6053]'
                : 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-neutral-950'
            }`}
          >
            Continue
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};
