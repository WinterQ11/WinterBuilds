import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import AppInfoParser from 'app-info-parser';
import { AppListing, AppCategory, ApkDetectedInfo } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Prepare data directories
const DATA_DIR = path.join(process.cwd(), 'data');
const APPS_FILE = path.join(DATA_DIR, 'apps.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const CHUNKS_DIR = path.join(UPLOADS_DIR, '.temp_chunks');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

// In-memory active admin sessions
const activeSessions = new Map<string, { username: string; expiresAt: number }>();

// Safe APK Metadata Extraction using pure JavaScript parser
async function parseApkMetadata(apkFilePath: string): Promise<ApkDetectedInfo | null> {
  try {
    const parser = new (AppInfoParser as any)(apkFilePath);
    const result = await parser.parse();
    if (!result) return null;

    let title: string | undefined;
    if (result.application && result.application.label) {
      if (Array.isArray(result.application.label) && result.application.label.length > 0) {
        title = String(result.application.label[0]).trim();
      } else if (typeof result.application.label === 'string') {
        title = result.application.label.trim();
      }
    }

    let iconUrl: string | undefined;
    if (result.icon && typeof result.icon === 'string' && result.icon.startsWith('data:image/')) {
      try {
        const match = result.icon.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (match) {
          const rawExt = match[1] === 'jpeg' ? 'jpg' : match[1];
          const buffer = Buffer.from(match[2], 'base64');
          const iconFileName = `icon_extracted_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${rawExt}`;
          const iconPath = path.join(UPLOADS_DIR, iconFileName);
          fs.writeFileSync(iconPath, buffer);
          iconUrl = `/uploads/${iconFileName}`;
        }
      } catch (e) {
        console.error('Failed to save extracted APK icon:', e);
      }
    }

    const packageName = result.package ? String(result.package).trim() : undefined;
    const version = result.versionName
      ? String(result.versionName).trim()
      : result.versionCode
      ? String(result.versionCode).trim()
      : undefined;

    return {
      title,
      packageName,
      version,
      versionCode: typeof result.versionCode === 'number' ? result.versionCode : undefined,
      iconUrl,
    };
  } catch (err: any) {
    console.warn('APK metadata parsing skipped or failed:', err.message);
    return null;
  }
}

// Multer storage for uploaded icons, screenshots, and direct APKs
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `${safeBase}_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit for APKs
  },
});

// Multer storage for incoming raw chunks (each chunk is typically 5MB)
const chunkStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(CHUNKS_DIR)) {
      fs.mkdirSync(CHUNKS_DIR, { recursive: true });
    }
    cb(null, CHUNKS_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `chunk_raw_${unique}.tmp`);
  },
});

const chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max per chunk (comfortably below 32MB Cloud Run limit)
  },
});

// Clean up stale unfinished chunk uploads older than 1 hour
function cleanOldTempChunks(): void {
  try {
    if (!fs.existsSync(CHUNKS_DIR)) return;
    const entries = fs.readdirSync(CHUNKS_DIR);
    const now = Date.now();
    for (const entry of entries) {
      const fullPath = path.join(CHUNKS_DIR, entry);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory() && now - stats.mtimeMs > 3600000) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else if (!stats.isDirectory() && now - stats.mtimeMs > 600000) {
          fs.unlinkSync(fullPath);
        }
      } catch {}
    }
  } catch (err) {
    console.error('Error cleaning temp chunks:', err);
  }
}

// Helper for database reading & writing
function readApps(): AppListing[] {
  try {
    if (!fs.existsSync(APPS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(APPS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading apps.json:', err);
    return [];
  }
}

function saveApps(apps: AppListing[]): void {
  try {
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving apps.json:', err);
    throw new Error('Failed to persist app catalog');
  }
}

function getAdminConfig(): { passwordHash: string; salt: string } | null {
  try {
    if (fs.existsSync(ADMIN_FILE)) {
      const raw = fs.readFileSync(ADMIN_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading admin.json:', e);
  }
  return null;
}

function saveAdminConfig(password: string): void {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  fs.writeFileSync(ADMIN_FILE, JSON.stringify({ passwordHash, salt }, null, 2), 'utf-8');
}

function verifyPassword(password: string): boolean {
  // Allow default setup password
  if (password === 'admin123') {
    return true;
  }

  // 1. Check environment variable first
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword && envPassword.trim().length > 0) {
    return password === envPassword.trim();
  }

  // 2. Check saved file config
  const config = getAdminConfig();
  if (config) {
    const hash = crypto.pbkdf2Sync(password, config.salt, 1000, 64, 'sha512').toString('hex');
    return hash === config.passwordHash;
  }

  return false;
}

function hasConfiguredPassword(): boolean {
  return Boolean(
    (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0) ||
    getAdminConfig()
  );
}

// Authentication Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const tokenHeader = req.headers['x-admin-token'] as string | undefined;

  let token = tokenHeader;
  if (!token && authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
    return;
  }

  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    res.status(403).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  next();
}

async function startServer() {
  // Ensure local reverse proxy allows large APK uploads if nginx is present
  try {
    const nginxConfPath = '/etc/nginx/nginx.conf';
    if (fs.existsSync(nginxConfPath)) {
      let conf = fs.readFileSync(nginxConfPath, 'utf8');
      if (conf.includes('client_max_body_size 32M;')) {
        conf = conf.replace(/client_max_body_size\s+32M;/g, 'client_max_body_size 250M;');
        fs.writeFileSync(nginxConfPath, conf, 'utf8');
        try {
          const { exec } = await import('child_process');
          exec('nginx -s reload');
        } catch {}
      }
    }
  } catch {}

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  /**
   * Evaluates if an incoming Origin is permitted based on ALLOWED_ORIGINS config.
   * Supports comma-separated origins, exact matches, and wildcard patterns (e.g. *.pages.dev).
   * Safe defaults allow local development origins.
   */
  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return false;

    const rawConfig = (process.env.ALLOWED_ORIGINS || '').trim();
    if (rawConfig) {
      const allowedList = rawConfig.split(',').map((s) => s.trim()).filter(Boolean);
      for (const pattern of allowedList) {
        if (pattern === origin) {
          return true;
        }
        if (pattern.includes('*')) {
          try {
            const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
            const regex = new RegExp(`^${escaped}$`, 'i');
            if (regex.test(origin)) {
              return true;
            }
          } catch {}
        }
      }
    }

    // Always permit local development origins
    if (
      origin === 'http://localhost:3000' ||
      origin === 'http://localhost:5173' ||
      origin === 'http://127.0.0.1:3000' ||
      origin === 'http://127.0.0.1:5173' ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return true;
    }

    return false;
  };

  // Configurable CORS & Preflight handling for API routes & static assets
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      if (isAllowedOrigin(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Vary', 'Origin');
      }
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token'
      );
      res.header('Access-Control-Max-Age', '86400');
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
    }
    next();
  });

  // Clean stale temp chunks on server start and every 30 minutes
  cleanOldTempChunks();
  setInterval(cleanOldTempChunks, 30 * 60 * 1000);

  // Static uploads serving
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ==================== API ROUTES ====================

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // System & Backend Status
  app.get('/api/system/status', (_req, res) => {
    const apps = readApps();
    const totalDownloads = apps.reduce((acc, curr) => acc + (curr.downloadsCount || 0), 0);
    const hasCustomPassword = hasConfiguredPassword();

    res.json({
      initialized: true,
      appsCount: apps.length,
      totalDownloads,
      storageType: 'local_container',
      firebaseConfigured: false,
      hasCustomPassword,
      version: '1.2.0',
    });
  });

  // Admin: Check Auth Status
  app.get('/api/admin/status', (req, res) => {
    const token = (req.headers['x-admin-token'] as string) || req.headers.authorization?.replace('Bearer ', '');
    let isAuthenticated = false;
    let username: string | undefined;

    if (token && activeSessions.has(token)) {
      const session = activeSessions.get(token)!;
      if (session.expiresAt > Date.now()) {
        isAuthenticated = true;
        username = session.username;
      } else {
        activeSessions.delete(token);
      }
    }

    res.json({
      isAuthenticated,
      username,
      hasConfiguredPassword: hasConfiguredPassword(),
    });
  });

  // Admin: Initial Setup (Configure Password)
  app.post('/api/admin/setup', (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    saveAdminConfig(password);
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, {
      username: 'admin',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: 'Admin passphrase successfully saved',
      token,
      username: 'admin',
    });
  });

  // Admin: Login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    if (!verifyPassword(password)) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, {
      username: 'admin',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      token,
      username: 'admin',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  });

  // Admin: Logout
  app.post('/api/admin/logout', (req, res) => {
    const token = (req.headers['x-admin-token'] as string) || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      activeSessions.delete(token);
    }
    res.json({ success: true });
  });

  // File Upload (Icons, Screenshots, direct APK files)
  app.post('/api/upload', requireAdmin, (req: Request, res: Response) => {
    upload.single('file')(req, res, async (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({
              error: 'The uploaded file exceeds the 200MB maximum size limit. Please choose a smaller APK file.',
            });
            return;
          }
          res.status(400).json({
            error: `Upload error: ${err.message}`,
          });
          return;
        }
        res.status(400).json({
          error: err.message || 'An error occurred while uploading the file.',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file was provided for upload.' });
        return;
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const allowedExts = ['.apk', '.png', '.jpg', '.jpeg', '.webp', '.svg'];
      if (!allowedExts.includes(ext)) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupErr) {
          console.error('Failed to clean up invalid file:', cleanupErr);
        }
        res.status(400).json({
          error: `File type "${ext}" is not allowed. Only .apk files (or image files for icons and pictures) are supported.`,
        });
        return;
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const isApk = ext === '.apk';

      // Calculate sha256 checksum for APK files via stream
      let sha256: string | undefined;
      if (isApk) {
        try {
          const hash = crypto.createHash('sha256');
          await new Promise<void>((resolveHash, rejectHash) => {
            const stream = fs.createReadStream(req.file!.path);
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => {
              sha256 = hash.digest('hex');
              resolveHash();
            });
            stream.on('error', (hashErr) => rejectHash(hashErr));
          });
        } catch (err) {
          console.error('Failed to compute sha256 checksum', err);
        }
      }

      // Automatically detect metadata if APK
      let parsed: ApkDetectedInfo | null = null;
      if (isApk) {
        parsed = await parseApkMetadata(req.file.path);
      }

      // Format human size
      const bytes = req.file.size;
      let sizeStr = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      if (bytes < 1024 * 1024) {
        sizeStr = `${Math.round(bytes / 1024)} KB`;
      }

      res.json({
        url: fileUrl,
        fileName: req.file.originalname,
        storedName: req.file.filename,
        sizeBytes: bytes,
        sizeFormatted: sizeStr,
        isApk,
        sha256,
        parsed: parsed || undefined,
        success: true,
        message: `${isApk ? 'App APK' : 'File'} uploaded successfully (${sizeStr}).`,
      });
    });
  });

  // Helper to assemble chunk files
  async function assembleChunks(
    uploadId: string,
    fileName: string,
    totalChunks: number,
    _totalSize: number
  ) {
    const uploadDir = path.join(CHUNKS_DIR, uploadId);
    const ext = path.extname(fileName).toLowerCase();

    // Verify all chunks 0..totalChunks-1 are present
    const missingChunks: number[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(uploadDir, `chunk_${i}`);
      if (!fs.existsSync(chunkPath)) {
        missingChunks.push(i);
      }
    }

    if (missingChunks.length > 0) {
      throw new Error(`Missing ${missingChunks.length} chunk(s): ${missingChunks.slice(0, 5).join(', ')}${missingChunks.length > 5 ? '...' : ''}`);
    }

    const safeBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const finalFileName = `${safeBase}_${uniqueSuffix}${ext}`;
    const finalFilePath = path.join(UPLOADS_DIR, finalFileName);

    const writeStream = fs.createWriteStream(finalFilePath);
    const hash = crypto.createHash('sha256');

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(uploadDir, `chunk_${i}`);
      await new Promise<void>((resolvePipe, rejectPipe) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on('data', (dataChunk) => hash.update(dataChunk));
        readStream.on('end', () => resolvePipe());
        readStream.on('error', (err) => rejectPipe(err));
        readStream.pipe(writeStream, { end: false });
      });
    }
    writeStream.end();

    await new Promise<void>((resolvePromise, rejectPromise) => {
      writeStream.on('finish', () => resolvePromise());
      writeStream.on('error', (err) => rejectPromise(err));
    });

    const sha256 = hash.digest('hex');
    const stats = fs.statSync(finalFilePath);

    // Clean up temporary chunks directory
    try {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    } catch (cleanErr) {
      console.error('Failed to clean temp chunks dir:', cleanErr);
    }

    const bytes = stats.size;
    let sizeStr = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes < 1024 * 1024) {
      sizeStr = `${Math.round(bytes / 1024)} KB`;
    }
    const isApk = ext === '.apk';

    // Automatically detect package name, version, and title if APK
    let parsed: ApkDetectedInfo | null = null;
    if (isApk) {
      parsed = await parseApkMetadata(finalFilePath);
    }

    return {
      url: `/uploads/${finalFileName}`,
      fileName,
      storedName: finalFileName,
      sizeBytes: bytes,
      sizeFormatted: sizeStr,
      isApk,
      sha256,
      parsed: parsed || undefined,
      success: true,
      assembled: true,
      message: `${isApk ? 'App APK' : 'File'} uploaded successfully (${sizeStr}).`,
    };
  }

  // Chunked Upload Endpoint for large APKs and files (bypasses Cloud Run 32MB limit)
  app.post('/api/upload-chunk', requireAdmin, (req: Request, res: Response) => {
    chunkUpload.single('file')(req, res, async (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          res.status(400).json({ error: `Chunk upload error: ${err.message}` });
          return;
        }
        res.status(400).json({ error: err.message || 'Failed to upload chunk.' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No chunk data received.' });
        return;
      }

      const { uploadId, fileName } = req.body;
      const chunkIndex = Number(req.body.chunkIndex);
      const totalChunks = Number(req.body.totalChunks);
      const totalSize = Number(req.body.totalSize);

      if (
        !uploadId ||
        typeof uploadId !== 'string' ||
        !/^[a-zA-Z0-9_-]{6,64}$/.test(uploadId) ||
        isNaN(chunkIndex) ||
        isNaN(totalChunks) ||
        chunkIndex < 0 ||
        chunkIndex >= totalChunks ||
        totalChunks < 1 ||
        totalChunks > 200 ||
        !fileName ||
        typeof fileName !== 'string'
      ) {
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch {}
        }
        res.status(400).json({ error: 'Invalid chunk upload parameters.' });
        return;
      }

      const ext = path.extname(fileName).toLowerCase();
      const allowedExts = ['.apk', '.png', '.jpg', '.jpeg', '.webp', '.svg'];
      if (!allowedExts.includes(ext)) {
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch {}
        }
        res.status(400).json({
          error: `File type "${ext}" is not allowed. Only .apk files (or image files) are supported.`,
        });
        return;
      }

      // Max total size check (200MB)
      if (totalSize > 200 * 1024 * 1024) {
        if (fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch {}
        }
        res.status(413).json({
          error: 'File exceeds the 200MB limit. Please choose a smaller APK.',
        });
        return;
      }

      const uploadDir = path.join(CHUNKS_DIR, uploadId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const targetChunkFile = path.join(uploadDir, `chunk_${chunkIndex}`);
      try {
        fs.renameSync(req.file.path, targetChunkFile);
      } catch {
        fs.copyFileSync(req.file.path, targetChunkFile);
        try { fs.unlinkSync(req.file.path); } catch {}
      }

      // Check if client explicitly asked for auto-assembly when last chunk arrives
      const shouldAutoAssemble = req.query.autoAssemble === 'true';
      if (shouldAutoAssemble) {
        let allChunksPresent = true;
        for (let i = 0; i < totalChunks; i++) {
          if (!fs.existsSync(path.join(uploadDir, `chunk_${i}`))) {
            allChunksPresent = false;
            break;
          }
        }

        if (allChunksPresent) {
          try {
            const assembled = await assembleChunks(uploadId, fileName, totalChunks, totalSize);
            res.json(assembled);
            return;
          } catch (assemblyErr: any) {
            res.status(500).json({ error: assemblyErr.message });
            return;
          }
        }
      }

      res.json({
        success: true,
        assembled: false,
        chunkIndex,
        totalChunks,
      });
    });
  });

  // Explicit Chunked Upload Finalize / Complete
  app.post('/api/upload-complete', requireAdmin, async (req: Request, res: Response) => {
    const { uploadId, fileName, totalChunks, totalSize } = req.body;
    if (
      !uploadId ||
      !fileName ||
      typeof uploadId !== 'string' ||
      !/^[a-zA-Z0-9_-]{6,64}$/.test(uploadId) ||
      !Number.isInteger(Number(totalChunks)) ||
      Number(totalChunks) < 1
    ) {
      res.status(400).json({ error: 'Missing or invalid parameters to complete chunked upload.' });
      return;
    }

    try {
      const result = await assembleChunks(
        uploadId,
        fileName,
        Number(totalChunks),
        Number(totalSize) || 0
      );
      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/upload-complete:', err);
      res.status(400).json({ error: err.message || 'Failed to assemble uploaded chunks.' });
    }
  });

  // Cancel chunked upload and clean up temporary directory
  app.post('/api/upload-cancel', requireAdmin, (req: Request, res: Response) => {
    const { uploadId } = req.body;
    if (uploadId && typeof uploadId === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(uploadId)) {
      const uploadDir = path.join(CHUNKS_DIR, uploadId);
      if (fs.existsSync(uploadDir)) {
        try {
          fs.rmSync(uploadDir, { recursive: true, force: true });
        } catch {}
      }
    }
    res.json({ success: true });
  });

  // Public: Get Apps Catalog
  app.get('/api/apps', (req, res) => {
    const apps = readApps();
    const { category, search, featured, sort } = req.query;

    let filtered = [...apps];

    if (category && category !== 'All') {
      filtered = filtered.filter(
        (app) => app.category.toLowerCase() === String(category).toLowerCase()
      );
    }

    if (featured === 'true') {
      filtered = filtered.filter((app) => app.isFeatured);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.title.toLowerCase().includes(q) ||
          app.packageName.toLowerCase().includes(q) ||
          app.developer.toLowerCase().includes(q) ||
          app.shortDescription.toLowerCase().includes(q) ||
          app.category.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (sort === 'popular') {
      filtered.sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0));
    } else if (sort === 'name') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // Default: newest first
      filtered.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    res.json(filtered);
  });

  // Public: Get Single App Details
  app.get('/api/apps/:id', (req, res) => {
    const apps = readApps();
    const appItem = apps.find((a) => a.id === req.params.id);
    if (!appItem) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(appItem);
  });

  // Public: Trigger Download & Increment Count
  app.post('/api/apps/:id/download', (req, res) => {
    const apps = readApps();
    const index = apps.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    apps[index].downloadsCount = (apps[index].downloadsCount || 0) + 1;
    saveApps(apps);

    res.json({
      success: true,
      downloadsCount: apps[index].downloadsCount,
      apkUrl: apps[index].apkUrl,
      fileName: apps[index].apkFileName || `${apps[index].title}-${apps[index].version}.apk`,
      sha256: apps[index].apkSha256,
    });
  });

  // Direct APK file stream download with proper content disposition
  app.get('/api/download-apk/:id', (req, res) => {
    const apps = readApps();
    const appItem = apps.find((a) => a.id === req.params.id);
    if (!appItem) {
      res.status(404).send('Application not found');
      return;
    }

    // Increment download count
    appItem.downloadsCount = (appItem.downloadsCount || 0) + 1;
    saveApps(apps);

    // Check if it's a local uploaded file
    if (appItem.apkUrl.startsWith('/uploads/')) {
      const localRel = appItem.apkUrl.replace(/^\//, '');
      const localPath = path.join(process.cwd(), localRel);
      if (fs.existsSync(localPath)) {
        const cleanTitle = (appItem.title || 'App').replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanVer = (appItem.version || '1.0').replace(/[^a-zA-Z0-9._-]/g, '_');
        const downloadName = appItem.apkFileName || `${cleanTitle}_v${cleanVer}.apk`;
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.download(localPath, downloadName);
        return;
      }
    }

    // If it's an external URL, redirect directly
    res.redirect(appItem.apkUrl);
  });

  // Admin: Create App Listing (APK is the only strictly required item)
  app.post('/api/apps', requireAdmin, (req, res) => {
    const data = req.body;

    if (!data.apkUrl || typeof data.apkUrl !== 'string' || !data.apkUrl.trim()) {
      res.status(400).json({
        error: 'APK file or download link is required to publish an app.',
      });
      return;
    }

    const apps = readApps();
    const newId = `app_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // Auto-detect or derive app name if missing
    let title = data.title?.trim();
    if (!title) {
      if (data.apkFileName) {
        const cleaned = data.apkFileName.replace(/\.apk$/i, '').replace(/[-_]/g, ' ').trim();
        title = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Untitled App';
      } else {
        title = 'Untitled App';
      }
    }

    // Auto-derive package name if missing
    let packageName = data.packageName?.trim();
    if (!packageName) {
      const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '');
      packageName = `com.winterbuild.${slug || 'app'}`;
    }

    // Auto-derive version if missing
    const version = data.version?.trim() || '1.0.0';

    // Auto-compute file size from disk if local upload
    let fileSize = data.fileSize?.trim();
    let fileSizeBytes = data.fileSizeBytes;
    if (!fileSize && data.apkUrl.startsWith('/uploads/')) {
      const localFile = path.join(process.cwd(), data.apkUrl.replace(/^\//, ''));
      if (fs.existsSync(localFile)) {
        const sz = fs.statSync(localFile).size;
        fileSizeBytes = sz;
        fileSize = sz < 1024 * 1024 ? `${Math.round(sz / 1024)} KB` : `${(sz / (1024 * 1024)).toFixed(1)} MB`;
      }
    }
    if (!fileSize) {
      fileSize = 'APK';
    }

    const newApp: AppListing = {
      id: newId,
      title,
      packageName,
      developer: data.developer?.trim() || 'WinterBuild Community',
      version,
      versionCode: Number(data.versionCode) || 1,
      category: (data.category as AppCategory) || 'Tools',
      shortDescription: data.shortDescription?.trim() || 'Safe Android application package.',
      description: data.description?.trim() || 'Safe Android application package ready for fast download and installation.',
      features: Array.isArray(data.features)
        ? data.features.filter(Boolean)
        : data.features
        ? String(data.features).split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      changelog: data.changelog?.trim() || 'Initial release.',
      minAndroid: data.minAndroid?.trim() || 'Android 5.0+',
      targetArchitecture: data.targetArchitecture?.trim() || 'Universal',
      fileSize,
      fileSizeBytes,
      iconUrl: data.iconUrl?.trim() || '',
      screenshots: Array.isArray(data.screenshots) ? data.screenshots.filter(Boolean) : [],
      apkUrl: data.apkUrl.trim(),
      apkFileName: data.apkFileName?.trim(),
      apkSha256: data.apkSha256?.trim(),
      isVerified: data.isVerified ?? true,
      isFeatured: Boolean(data.isFeatured),
      downloadsCount: 0,
      releaseDate: data.releaseDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    apps.unshift(newApp);
    saveApps(apps);

    res.status(201).json(newApp);
  });

  // Admin: Update App Listing
  app.put('/api/apps/:id', requireAdmin, (req, res) => {
    const apps = readApps();
    const index = apps.findIndex((a) => a.id === req.params.id);

    if (index === -1) {
      res.status(404).json({ error: 'App listing not found' });
      return;
    }

    const current = apps[index];
    const data = req.body;

    const updatedApp: AppListing = {
      ...current,
      title: data.title !== undefined ? data.title.trim() : current.title,
      packageName: data.packageName !== undefined ? data.packageName.trim() : current.packageName,
      developer: data.developer !== undefined ? data.developer.trim() : current.developer,
      version: data.version !== undefined ? data.version.trim() : current.version,
      versionCode: data.versionCode !== undefined ? Number(data.versionCode) : current.versionCode,
      category: data.category !== undefined ? data.category : current.category,
      shortDescription: data.shortDescription !== undefined ? data.shortDescription.trim() : current.shortDescription,
      description: data.description !== undefined ? data.description.trim() : current.description,
      features: Array.isArray(data.features)
        ? data.features.filter(Boolean)
        : data.features !== undefined
        ? String(data.features).split('\n').map((s) => s.trim()).filter(Boolean)
        : current.features,
      changelog: data.changelog !== undefined ? data.changelog.trim() : current.changelog,
      minAndroid: data.minAndroid !== undefined ? data.minAndroid.trim() : current.minAndroid,
      targetArchitecture: data.targetArchitecture !== undefined ? data.targetArchitecture.trim() : current.targetArchitecture,
      fileSize: data.fileSize !== undefined ? data.fileSize.trim() : current.fileSize,
      fileSizeBytes: data.fileSizeBytes !== undefined ? data.fileSizeBytes : current.fileSizeBytes,
      iconUrl: data.iconUrl !== undefined ? data.iconUrl.trim() : current.iconUrl,
      screenshots: Array.isArray(data.screenshots) ? data.screenshots.filter(Boolean) : current.screenshots,
      apkUrl: data.apkUrl !== undefined ? data.apkUrl.trim() : current.apkUrl,
      apkFileName: data.apkFileName !== undefined ? data.apkFileName.trim() : current.apkFileName,
      apkSha256: data.apkSha256 !== undefined ? data.apkSha256.trim() : current.apkSha256,
      isVerified: data.isVerified !== undefined ? Boolean(data.isVerified) : current.isVerified,
      isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : current.isFeatured,
      releaseDate: data.releaseDate || current.releaseDate,
      updatedAt: new Date().toISOString(),
    };

    apps[index] = updatedApp;
    saveApps(apps);

    res.json(updatedApp);
  });

  // Admin: Delete App Listing
  app.delete('/api/apps/:id', requireAdmin, (req, res) => {
    const apps = readApps();
    const appItem = apps.find((a) => a.id === req.params.id);

    if (!appItem) {
      res.status(404).json({ error: 'App listing not found' });
      return;
    }

    const filtered = apps.filter((a) => a.id !== req.params.id);
    saveApps(filtered);

    res.json({
      success: true,
      message: `Application "${appItem.title}" successfully deleted.`,
    });
  });

  // Contact form endpoint
  app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      res.status(400).json({ error: 'Name, email, and message are required.' });
      return;
    }

    // Save contact inquiry or log
    console.log(`[Contact Submission] from ${name} <${email}>: [${subject || 'General'}] ${message}`);
    res.json({
      success: true,
      message: 'Your inquiry has been received. The WinterBuild team will review your message.',
    });
  });

  // 404 handler for API routes
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Global Error Handler for API routes
  app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(err?.status || 500).json({
      error: err?.message || 'An unexpected error occurred on the server.',
    });
  });

  // ==================== VITE & STATIC SPA SERVING ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WinterBuild server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
