import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import dotenv from 'dotenv';
import AppInfoParser from 'app-info-parser';
import { AppListing, AppCategory, ApkDetectedInfo } from './types.ts';

dotenv.config();

export const app = express();

// Runtime detection: Vercel serverless / AWS Lambda vs traditional container
export const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.VERCEL_ENV
);

// In serverless environments, process.cwd() is read-only.
// Only /tmp is writable for temporary operations.
const BASE_STORAGE_DIR = isServerless ? '/tmp/winterbuild' : process.cwd();
const DATA_DIR = path.join(BASE_STORAGE_DIR, 'data');
const APPS_FILE = path.join(DATA_DIR, 'apps.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const UPLOADS_DIR = path.join(BASE_STORAGE_DIR, 'uploads');
const CHUNKS_DIR = path.join(UPLOADS_DIR, '.temp_chunks');

// Initialize storage directories & seed files safely
function initStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(CHUNKS_DIR)) {
      fs.mkdirSync(CHUNKS_DIR, { recursive: true });
    }

    // When running in /tmp, copy initial catalog and admin config if available in repository
    if (isServerless) {
      const repoData = path.join(process.cwd(), 'data');
      const repoApps = path.join(repoData, 'apps.json');
      const repoAdmin = path.join(repoData, 'admin.json');

      if (!fs.existsSync(APPS_FILE) && fs.existsSync(repoApps)) {
        fs.copyFileSync(repoApps, APPS_FILE);
      }
      if (!fs.existsSync(ADMIN_FILE) && fs.existsSync(repoAdmin)) {
        fs.copyFileSync(repoAdmin, ADMIN_FILE);
      }
    }
  } catch (err) {
    console.warn('[Storage Init Warning]', err);
  }
}

initStorage();

// Active admin sessions in memory (for stateful container processes)
const activeSessions = new Map<string, { username: string; expiresAt: number }>();

// Session Secret for stateless HMAC-SHA256 signed session tokens (crucial across Vercel serverless functions)
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.ADMIN_PASSWORD ||
  'winterbuild_secure_session_token_secret_key_2026';

export function createSessionToken(username: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payloadStr = JSON.stringify({ username, expiresAt });
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  const token = `${payloadB64}.${signature}`;
  activeSessions.set(token, { username, expiresAt });
  return token;
}

export function verifySessionToken(token: string): { valid: boolean; username?: string } {
  if (!token || typeof token !== 'string') return { valid: false };

  // 1. In-memory check (fast-path for persistent server)
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return { valid: true, username: session.username };
  }

  // 2. Cryptographic signature check (stateless validation across Vercel instances)
  const parts = token.split('.');
  if (parts.length === 2) {
    const [payloadB64, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
    if (
      sig.length === expectedSig.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    ) {
      try {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        if (payload && payload.expiresAt && payload.expiresAt > Date.now()) {
          return { valid: true, username: payload.username || 'admin' };
        }
      } catch {}
    }
  }

  return { valid: false };
}

// Safe APK Metadata Extraction
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

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    initStorage();
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
    fileSize: 200 * 1024 * 1024, // 200MB
  },
});

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
    fileSize: 15 * 1024 * 1024,
  },
});

export function cleanOldTempChunks(): void {
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

// Database helper functions
export function readApps(): AppListing[] {
  try {
    if (fs.existsSync(APPS_FILE)) {
      const raw = fs.readFileSync(APPS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
    const repoApps = path.join(process.cwd(), 'data', 'apps.json');
    if (fs.existsSync(repoApps)) {
      const raw = fs.readFileSync(repoApps, 'utf-8');
      return JSON.parse(raw);
    }
    return [];
  } catch (err) {
    console.error('Error reading apps.json:', err);
    return [];
  }
}

export function saveApps(apps: AppListing[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving apps.json:', err);
    // If standard write failed, attempt fallback into /tmp
    if (!isServerless) {
      try {
        const fallbackDir = '/tmp/winterbuild/data';
        fs.mkdirSync(fallbackDir, { recursive: true });
        fs.writeFileSync(path.join(fallbackDir, 'apps.json'), JSON.stringify(apps, null, 2), 'utf-8');
        return;
      } catch {}
    }
    throw new Error('Failed to persist app catalog');
  }
}

export function getAdminConfig(): { passwordHash: string; salt: string } | null {
  try {
    if (fs.existsSync(ADMIN_FILE)) {
      const raw = fs.readFileSync(ADMIN_FILE, 'utf-8');
      return JSON.parse(raw);
    }
    const repoAdmin = path.join(process.cwd(), 'data', 'admin.json');
    if (fs.existsSync(repoAdmin)) {
      const raw = fs.readFileSync(repoAdmin, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading admin.json:', e);
  }
  return null;
}

export function saveAdminConfig(password: string): void {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(ADMIN_FILE, JSON.stringify({ passwordHash, salt }, null, 2), 'utf-8');
}

/**
 * Validates admin password.
 * Strictly forbids insecure default passwords like 'admin123'.
 * Requires configured ADMIN_PASSWORD env var or PBKDF2 hash stored via setup.
 */
export function verifyPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // 1. Check environment variable first (timing-safe comparison)
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword && envPassword.trim().length > 0) {
    const trimmed = envPassword.trim();
    if (password.length === trimmed.length) {
      return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(trimmed));
    }
    return false;
  }

  // 2. Check saved file config (salted PBKDF2 hash)
  const config = getAdminConfig();
  if (config && config.salt && config.passwordHash) {
    const hash = crypto.pbkdf2Sync(password, config.salt, 1000, 64, 'sha512').toString('hex');
    if (hash.length === config.passwordHash.length) {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(config.passwordHash));
    }
  }

  return false;
}

export function hasConfiguredPassword(): boolean {
  return Boolean(
    (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0) ||
    getAdminConfig()
  );
}

// Authentication Middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
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

  const { valid } = verifySessionToken(token);
  if (!valid) {
    if (token) activeSessions.delete(token);
    res.status(403).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  next();
}

// Assemble uploaded chunks
async function assembleChunks(
  uploadId: string,
  fileName: string,
  totalChunks: number,
  _totalSize: number
) {
  const uploadDir = path.join(CHUNKS_DIR, uploadId);
  const ext = path.extname(fileName).toLowerCase();

  const missingChunks: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(uploadDir, `chunk_${i}`);
    if (!fs.existsSync(chunkPath)) {
      missingChunks.push(i);
    }
  }

  if (missingChunks.length > 0) {
    throw new Error(
      `Missing ${missingChunks.length} chunk(s): ${missingChunks.slice(0, 5).join(', ')}${
        missingChunks.length > 5 ? '...' : ''
      }`
    );
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

// Middleware Configuration
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return false;

  const rawConfig = (process.env.ALLOWED_ORIGINS || '').trim();
  if (rawConfig) {
    const allowedList = rawConfig.split(',').map((s) => s.trim()).filter(Boolean);
    for (const pattern of allowedList) {
      if (pattern === origin) return true;
      if (pattern.includes('*')) {
        try {
          const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
          const regex = new RegExp(`^${escaped}$`, 'i');
          if (regex.test(origin)) return true;
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

// CORS
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

// Static uploads serving (serves both primary uploads dir and repo uploads if present)
app.use('/uploads', express.static(UPLOADS_DIR));
const repoUploads = path.join(process.cwd(), 'uploads');
if (repoUploads !== UPLOADS_DIR && fs.existsSync(repoUploads)) {
  app.use('/uploads', express.static(repoUploads));
}

// Router containing all WinterBuild API endpoints
const apiRouter = express.Router();

// Health Check
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: isServerless ? 'vercel-serverless' : 'container',
  });
});

// System & Backend Status
apiRouter.get('/system/status', (_req, res) => {
  const apps = readApps();
  const totalDownloads = apps.reduce((acc, curr) => acc + (curr.downloadsCount || 0), 0);
  const hasCustomPassword = hasConfiguredPassword();

  res.json({
    initialized: true,
    appsCount: apps.length,
    totalDownloads,
    storageType: isServerless ? 'vercel_ephemeral_storage' : 'local_container',
    firebaseConfigured: false,
    hasCustomPassword,
    version: '1.2.0',
  });
});

// Admin Auth Status
apiRouter.get('/admin/status', (req, res) => {
  const token =
    (req.headers['x-admin-token'] as string) || req.headers.authorization?.replace('Bearer ', '');
  let isAuthenticated = false;
  let username: string | undefined;

  if (token) {
    const session = verifySessionToken(token);
    if (session.valid) {
      isAuthenticated = true;
      username = session.username;
    }
  }

  res.json({
    isAuthenticated,
    username,
    hasConfiguredPassword: hasConfiguredPassword(),
  });
});

// Admin Setup (Initial Password Configuration)
apiRouter.post('/admin/setup', (req, res) => {
  // If an admin password is already configured, protect it from unauthorized overwrite
  if (hasConfiguredPassword()) {
    const token =
      (req.headers['x-admin-token'] as string) || req.headers.authorization?.replace('Bearer ', '');
    const { valid } = verifySessionToken(token || '');
    if (!valid) {
      res.status(403).json({
        error:
          'Admin password has already been configured. Please log in with your existing password or update ADMIN_PASSWORD.',
      });
      return;
    }
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long for security.' });
    return;
  }

  saveAdminConfig(password);
  const token = createSessionToken('admin');

  res.json({
    success: true,
    message: 'Admin passphrase successfully saved',
    token,
    username: 'admin',
  });
});

// Admin Login
apiRouter.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  if (!hasConfiguredPassword()) {
    res.status(401).json({
      error:
        'No admin password has been configured yet. Please complete initial setup or configure ADMIN_PASSWORD.',
    });
    return;
  }

  if (!verifyPassword(password)) {
    res.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }

  const token = createSessionToken('admin');

  res.json({
    success: true,
    token,
    username: 'admin',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
});

// Admin Logout
apiRouter.post('/admin/logout', (req, res) => {
  const token =
    (req.headers['x-admin-token'] as string) || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// File Upload (Icons, Screenshots, direct APK files)
apiRouter.post('/upload', requireAdmin, (req: Request, res: Response) => {
  upload.single('file')(req, res, async (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({
            error:
              'The uploaded file exceeds the 200MB maximum size limit. Please choose a smaller APK file.',
          });
          return;
        }
        res.status(400).json({ error: `Upload error: ${err.message}` });
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
      } catch (e) {
        console.error('Failed to compute sha256 checksum', e);
      }
    }

    let parsed: ApkDetectedInfo | null = null;
    if (isApk) {
      parsed = await parseApkMetadata(req.file.path);
    }

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

// Chunked Upload Endpoint for large files
apiRouter.post('/upload-chunk', requireAdmin, (req: Request, res: Response) => {
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

// Explicit Chunked Upload Complete
apiRouter.post('/upload-complete', requireAdmin, async (req: Request, res: Response) => {
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

// Cancel chunked upload
apiRouter.post('/upload-cancel', requireAdmin, (req: Request, res: Response) => {
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
apiRouter.get('/apps', (req, res) => {
  const apps = readApps();
  const { category, search, featured, sort } = req.query;

  let filtered = [...apps];

  if (category && category !== 'All') {
    filtered = filtered.filter(
      (appItem) => appItem.category.toLowerCase() === String(category).toLowerCase()
    );
  }

  if (featured === 'true') {
    filtered = filtered.filter((appItem) => appItem.isFeatured);
  }

  if (search && typeof search === 'string' && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (appItem) =>
        appItem.title.toLowerCase().includes(q) ||
        appItem.packageName.toLowerCase().includes(q) ||
        appItem.developer.toLowerCase().includes(q) ||
        appItem.shortDescription.toLowerCase().includes(q) ||
        appItem.category.toLowerCase().includes(q)
    );
  }

  if (sort === 'popular') {
    filtered.sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0));
  } else if (sort === 'name') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    filtered.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  res.json(filtered);
});

// Public: Get Single App Details
apiRouter.get('/apps/:id', (req, res) => {
  const apps = readApps();
  const appItem = apps.find((a) => a.id === req.params.id);
  if (!appItem) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }
  res.json(appItem);
});

// Public: Trigger Download & Increment Count
apiRouter.post('/apps/:id/download', (req, res) => {
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

// Direct APK file stream download
apiRouter.get('/download-apk/:id', (req, res) => {
  const apps = readApps();
  const appItem = apps.find((a) => a.id === req.params.id);
  if (!appItem) {
    res.status(404).send('Application not found');
    return;
  }

  appItem.downloadsCount = (appItem.downloadsCount || 0) + 1;
  saveApps(apps);

  if (appItem.apkUrl.startsWith('/uploads/')) {
    const filename = path.basename(appItem.apkUrl);
    const candidatePaths = [
      path.join(UPLOADS_DIR, filename),
      path.join(process.cwd(), 'uploads', filename),
      path.join(process.cwd(), appItem.apkUrl.replace(/^\//, '')),
    ];

    for (const localPath of candidatePaths) {
      if (fs.existsSync(localPath)) {
        const cleanTitle = (appItem.title || 'App').replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanVer = (appItem.version || '1.0').replace(/[^a-zA-Z0-9._-]/g, '_');
        const downloadName = appItem.apkFileName || `${cleanTitle}_v${cleanVer}.apk`;
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.download(localPath, downloadName);
        return;
      }
    }
  }

  res.redirect(appItem.apkUrl);
});

// Admin: Create App Listing
apiRouter.post('/apps', requireAdmin, (req, res) => {
  const data = req.body;

  if (!data.apkUrl || typeof data.apkUrl !== 'string' || !data.apkUrl.trim()) {
    res.status(400).json({
      error: 'APK file or download link is required to publish an app.',
    });
    return;
  }

  const apps = readApps();
  const newId = `app_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  let title = data.title?.trim();
  if (!title) {
    if (data.apkFileName) {
      const cleaned = data.apkFileName.replace(/\.apk$/i, '').replace(/[-_]/g, ' ').trim();
      title = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Untitled App';
    } else {
      title = 'Untitled App';
    }
  }

  let packageName = data.packageName?.trim();
  if (!packageName) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    packageName = `com.winterbuild.${slug || 'app'}`;
  }

  const version = data.version?.trim() || '1.0.0';

  let fileSize = data.fileSize?.trim();
  let fileSizeBytes = data.fileSizeBytes;
  if (!fileSize && data.apkUrl.startsWith('/uploads/')) {
    const filename = path.basename(data.apkUrl);
    const candidatePaths = [
      path.join(UPLOADS_DIR, filename),
      path.join(process.cwd(), 'uploads', filename),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const sz = fs.statSync(p).size;
        fileSizeBytes = sz;
        fileSize =
          sz < 1024 * 1024 ? `${Math.round(sz / 1024)} KB` : `${(sz / (1024 * 1024)).toFixed(1)} MB`;
        break;
      }
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
    description:
      data.description?.trim() ||
      'Safe Android application package ready for fast download and installation.',
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
apiRouter.put('/apps/:id', requireAdmin, (req, res) => {
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
    shortDescription:
      data.shortDescription !== undefined ? data.shortDescription.trim() : current.shortDescription,
    description: data.description !== undefined ? data.description.trim() : current.description,
    features: Array.isArray(data.features)
      ? data.features.filter(Boolean)
      : data.features !== undefined
      ? String(data.features).split('\n').map((s) => s.trim()).filter(Boolean)
      : current.features,
    changelog: data.changelog !== undefined ? data.changelog.trim() : current.changelog,
    minAndroid: data.minAndroid !== undefined ? data.minAndroid.trim() : current.minAndroid,
    targetArchitecture:
      data.targetArchitecture !== undefined
        ? data.targetArchitecture.trim()
        : current.targetArchitecture,
    fileSize: data.fileSize !== undefined ? data.fileSize.trim() : current.fileSize,
    fileSizeBytes: data.fileSizeBytes !== undefined ? data.fileSizeBytes : current.fileSizeBytes,
    iconUrl: data.iconUrl !== undefined ? data.iconUrl.trim() : current.iconUrl,
    screenshots: Array.isArray(data.screenshots)
      ? data.screenshots.filter(Boolean)
      : current.screenshots,
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
apiRouter.delete('/apps/:id', requireAdmin, (req, res) => {
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

// Contact Form Endpoint
apiRouter.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ error: 'Name, email, and message are required.' });
    return;
  }

  console.log(`[Contact Submission] from ${name} <${email}>: [${subject || 'General'}] ${message}`);
  res.json({
    success: true,
    message: 'Your inquiry has been received. The WinterBuild team will review your message.',
  });
});

// Convenience alias for direct download link without /api prefix
app.get('/download-apk/:id', (req, res) => {
  res.redirect(`/api/download-apk/${encodeURIComponent(req.params.id)}`);
});

// Mount API router strictly under '/api'
// IMPORTANT: Do NOT mount apiRouter at root ('/') in persistent/container dev environments.
// In container/local dev environments, mounting at '/' caused apiRouter.all('*')
// to catch non-API paths (including '/', '/index.html', and Vite assets) and return
// {"error":"API endpoint not found"}, breaking the web application.
app.use('/api', apiRouter);

// In Vercel serverless environments, Vercel routes only /api requests to the serverless function,
// but path rewrites might strip the /api prefix. Mounting apiRouter as fallback is safe only when isServerless is true.
if (isServerless) {
  app.use(apiRouter);
}

// 404 handler strictly for unknown API routes under '/api'
apiRouter.all('*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global API Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err?.status || 500).json({
    error: err?.message || 'An unexpected error occurred on the server.',
  });
});

export { apiRouter };
export default app;
