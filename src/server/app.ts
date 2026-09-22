import express, { Request, Response, NextFunction } from 'express';
import {
  listApplications,
  getApplicationBySlug,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
  incrementDownloadCount,
  getDashboardStats,
  verifyAdminAuthorization,
} from './services/database';
import {
  createUploadAuthorization,
  verifyAndResolveDownloadUrl,
  deleteStorageObject,
  generateApkDownloadFileName,
  formatCleanDownloadUrl,
  saveApkStorageMetadata,
} from './services/storage';
import { generateAppEnhancements } from '../lib/gemini';
import { isSupabaseConfigured } from '../lib/supabase';
import path from 'path';
import fs from 'fs';

const app = express();

// Standard middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS & Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Helper for consistent JSON error response
function sendError(res: Response, status: number, code: string, message: string, details?: any) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

// Helper for consistent JSON success response
function sendSuccess(res: Response, data: any, status: number = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

// Authentication middleware for admin routes
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const result = await verifyAdminAuthorization(authHeader);

  if (!result.authorized) {
    if (!authHeader) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required. Please sign in as an administrator.');
    }
    return sendError(res, 403, 'FORBIDDEN', 'Access denied. Your account is not authorized for administrator functions.');
  }

  (req as any).adminUser = result;
  next();
}

// -----------------------------------------------------------------------------
// PUBLIC API ROUTES
// -----------------------------------------------------------------------------

// Health check and environment status
app.get('/api/health', (req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    product: 'WinterBuilds',
    supabaseConnected: isSupabaseConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// List published apps (browse, search, filter, paginate)
app.get('/api/apps', async (req, res) => {
  try {
    const { category, search, sort, featured, limit, offset } = req.query;

    const result = await listApplications({
      status: 'published',
      category: category ? String(category) : undefined,
      search: search ? String(search) : undefined,
      sort: (sort as any) || 'latest',
      featured: featured === 'true' ? true : undefined,
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    sendSuccess(res, result);
  } catch (err: any) {
    console.error('Error in GET /api/apps:', err);
    sendError(res, 500, 'SERVER_ERROR', 'Unable to fetch applications catalog.');
  }
});

// Get app details by slug
app.get('/api/apps/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const appRecord = await getApplicationBySlug(slug);

    if (!appRecord) {
      return sendError(res, 404, 'APP_NOT_FOUND', `Application "${slug}" was not found.`);
    }

    sendSuccess(res, appRecord);
  } catch (err: any) {
    console.error('Error in GET /api/apps/:slug:', err);
    sendError(res, 500, 'SERVER_ERROR', 'Failed to retrieve application details.');
  }
});

// Atomic download counter increment & redirect/url return
app.post('/api/apps/:id/download', async (req, res) => {
  try {
    const id = req.params.id;
    const appRecord = await getApplicationById(id);

    if (!appRecord) {
      return sendError(res, 404, 'APP_NOT_FOUND', 'Application not found for download.');
    }

    // Atomic download increment
    const newCount = await incrementDownloadCount(id);

    // Generate intended clean download filename (e.g. "SensiShare.apk" or "My App.apk")
    const downloadFileName = generateApkDownloadFileName(appRecord.name, appRecord.apk_storage_path);

    // Resolve direct download URL with clean filename query parameter
    let downloadUrl = appRecord.apk_download_url;
    if (!downloadUrl || downloadUrl.startsWith('/api/')) {
      downloadUrl = await verifyAndResolveDownloadUrl(appRecord.apk_storage_path, appRecord.name);
    } else {
      downloadUrl = formatCleanDownloadUrl(downloadUrl, appRecord.apk_storage_path, appRecord.name);
    }

    sendSuccess(res, {
      id: appRecord.id,
      name: appRecord.name,
      filename: downloadFileName,
      version: appRecord.version_name,
      fileSize: appRecord.apk_file_size,
      downloadUrl,
      downloadsCount: newCount,
    });
  } catch (err: any) {
    console.error('Error in POST /api/apps/:id/download:', err);
    sendError(res, 500, 'DOWNLOAD_FAILED', 'Failed to initiate application download.');
  }
});

// -----------------------------------------------------------------------------
// ADMIN API ROUTES (Protected)
// -----------------------------------------------------------------------------

// Check admin verification status
app.get('/api/admin/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  const result = await verifyAdminAuthorization(authHeader);

  sendSuccess(res, {
    authenticated: result.authorized,
    email: result.email || null,
    supabaseConfigured: isSupabaseConfigured(),
  });
});

// Admin dashboard overview stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await getDashboardStats();
    sendSuccess(res, stats);
  } catch (err: any) {
    console.error('Error in GET /api/admin/stats:', err);
    sendError(res, 500, 'SERVER_ERROR', 'Failed to calculate dashboard statistics.');
  }
});

// Admin list all apps (including drafts)
app.get('/api/admin/apps', requireAdmin, async (req, res) => {
  try {
    const { status, category, search, sort, limit, offset } = req.query;

    const result = await listApplications({
      status: (status as any) || 'all',
      category: category ? String(category) : undefined,
      search: search ? String(search) : undefined,
      sort: (sort as any) || 'updated',
      limit: limit ? parseInt(String(limit), 10) : 100,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    sendSuccess(res, result);
  } catch (err: any) {
    console.error('Error in GET /api/admin/apps:', err);
    sendError(res, 500, 'SERVER_ERROR', 'Failed to retrieve application list.');
  }
});

// Create new application record
app.post('/api/apps', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !body.package_name || !body.apk_storage_path) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Missing required application fields: name, package_name, apk_storage_path.');
    }

    const created = await createApplication({
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      package_name: body.package_name,
      version_name: body.version_name || '1.0.0',
      version_code: Number(body.version_code) || 1,
      description: body.description || '',
      short_description: body.short_description || '',
      category: body.category || 'Utilities',
      icon_url: body.icon_url || '',
      screenshots: Array.isArray(body.screenshots) ? body.screenshots : [],
      apk_storage_path: body.apk_storage_path,
      apk_download_url: formatCleanDownloadUrl(body.apk_download_url, body.apk_storage_path, body.name),
      apk_file_size: Number(body.apk_file_size) || 0,
      apk_sha256: body.apk_sha256 || '',
      min_sdk: Number(body.min_sdk) || 21,
      target_sdk: Number(body.target_sdk) || 34,
      downloads_count: 0,
      status: body.status || 'draft',
      featured: Boolean(body.featured),
    });

    sendSuccess(res, created, 201);
  } catch (err: any) {
    console.error('Error in POST /api/apps:', err);
    sendError(res, 500, 'CREATION_FAILED', err.message || 'Failed to create application.');
  }
});

// Update application
app.patch('/api/apps/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    if (updates.apk_download_url && updates.apk_storage_path) {
      updates.apk_download_url = formatCleanDownloadUrl(updates.apk_download_url, updates.apk_storage_path, updates.name);
    }

    const updated = await updateApplication(id, updates);
    sendSuccess(res, updated);
  } catch (err: any) {
    console.error('Error in PATCH /api/apps/:id:', err);
    sendError(res, 500, 'UPDATE_FAILED', err.message || 'Failed to update application.');
  }
});

// Publish application
app.post('/api/apps/:id/publish', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateApplication(id, {
      status: 'published',
      published_at: new Date().toISOString(),
    });
    sendSuccess(res, updated);
  } catch (err: any) {
    console.error('Error in POST /api/apps/:id/publish:', err);
    sendError(res, 500, 'PUBLISH_FAILED', err.message || 'Failed to publish application.');
  }
});

// Unpublish application
app.post('/api/apps/:id/unpublish', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateApplication(id, {
      status: 'draft',
    });
    sendSuccess(res, updated);
  } catch (err: any) {
    console.error('Error in POST /api/apps/:id/unpublish:', err);
    sendError(res, 500, 'UNPUBLISH_FAILED', err.message || 'Failed to unpublish application.');
  }
});

// Delete application and associated storage objects
app.delete('/api/apps/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const appToDelete = await getApplicationById(id);

    if (!appToDelete) {
      return sendError(res, 404, 'NOT_FOUND', 'Application not found.');
    }

    // 1. Delete database record
    await deleteApplication(id);

    // 2. Clean up storage object (non-blocking)
    if (appToDelete.apk_storage_path) {
      deleteStorageObject(appToDelete.apk_storage_path).catch(err => {
        console.warn('Storage cleanup warning:', err);
      });
    }

    sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    console.error('Error in DELETE /api/apps/:id:', err);
    sendError(res, 500, 'DELETE_FAILED', err.message || 'Failed to delete application.');
  }
});

// Authorize direct-to-storage upload
app.post('/api/upload/authorize', requireAdmin, async (req, res) => {
  try {
    const { appId, fileName, contentType, appName } = req.body;

    if (!fileName) {
      return sendError(res, 400, 'BAD_REQUEST', 'fileName is required.');
    }

    const auth = await createUploadAuthorization({
      appId: appId || 'pending',
      fileName,
      contentType,
      appName,
    });

    sendSuccess(res, auth);
  } catch (err: any) {
    console.error('Error in POST /api/upload/authorize:', err);
    sendError(res, 500, 'STORAGE_AUTH_FAILED', err.message || 'Failed to authorize storage upload.');
  }
});

// Complete upload & verify object
app.post('/api/upload/complete', requireAdmin, async (req, res) => {
  try {
    const { storagePath, originalFileName, appName } = req.body;

    if (!storagePath) {
      return sendError(res, 400, 'BAD_REQUEST', 'storagePath is required.');
    }

    if (originalFileName) {
      saveApkStorageMetadata(storagePath, {
        originalFileName,
        preferredDownloadName: appName,
      });
    }

    const downloadFileName = generateApkDownloadFileName(appName, originalFileName || storagePath);
    const downloadUrl = await verifyAndResolveDownloadUrl(storagePath, appName);

    sendSuccess(res, {
      verified: true,
      storagePath,
      downloadUrl,
      originalFileName: originalFileName || path.basename(storagePath),
      downloadFileName,
    });
  } catch (err: any) {
    console.error('Error in POST /api/upload/complete:', err);
    sendError(res, 500, 'VERIFY_FAILED', err.message || 'Failed to verify uploaded storage object.');
  }
});

// Local fallback direct upload endpoint (used when Supabase storage is not yet provisioned)
app.post('/api/upload/direct', requireAdmin, express.raw({ type: '*/*', limit: '2000mb' }), async (req, res) => {
  try {
    const storagePath = req.query.path as string;
    const originalParam = (req.query.original as string) || '';
    if (!storagePath) {
      return sendError(res, 400, 'BAD_REQUEST', 'Missing storage path parameter.');
    }

    const localDir = path.join(process.cwd(), 'data', 'storage');
    const fullPath = path.join(localDir, storagePath);
    const parentDir = path.dirname(fullPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, req.body);
    if (originalParam) {
      saveApkStorageMetadata(storagePath, { originalFileName: originalParam });
    }

    const downloadFileName = generateApkDownloadFileName(undefined, originalParam || storagePath);
    const downloadUrl = `/api/downloads/${encodeURIComponent(storagePath)}?filename=${encodeURIComponent(downloadFileName)}`;

    sendSuccess(res, {
      uploaded: true,
      storagePath,
      downloadUrl,
      originalFileName: originalParam || path.basename(storagePath),
      downloadFileName,
    });
  } catch (err: any) {
    console.error('Direct upload error:', err);
    sendError(res, 500, 'UPLOAD_FAILED', 'Failed to store file.');
  }
});

// Local fallback download endpoint
app.get('/api/downloads/:path', (req, res) => {
  try {
    const storagePath = decodeURIComponent(req.params.path);
    const fullPath = path.join(process.cwd(), 'data', 'storage', storagePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('APK file not found on storage.');
    }

    const requestedName = (req.query.filename as string) || (req.query.name as string);
    const filename = generateApkDownloadFileName(requestedName, storagePath);

    // RFC 5987 / RFC 6266 encoding for safe spaces and unicode
    const safeAsciiFilename = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"');
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    res.status(500).send('Error reading APK from storage.');
  }
});

// AI description and feature enhancement endpoint
app.post('/api/ai/enhance', requireAdmin, async (req, res) => {
  try {
    const { appName, packageName, category, rawDescription } = req.body;
    const enhancements = await generateAppEnhancements({
      appName: appName || 'Android Application',
      packageName: packageName || 'com.example.app',
      category,
      rawDescription,
    });
    sendSuccess(res, enhancements);
  } catch (err: any) {
    console.error('Error in /api/ai/enhance:', err);
    sendError(res, 500, 'AI_ENHANCE_FAILED', 'Failed to generate AI enhancements.');
  }
});

export default app;
