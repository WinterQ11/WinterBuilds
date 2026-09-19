// src/serverApp.ts
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import dotenv from "dotenv";
import AppInfoParser from "app-info-parser";
dotenv.config();
var app = express();
var isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV
);
var BASE_STORAGE_DIR = isServerless ? "/tmp/winterbuild" : process.cwd();
var DATA_DIR = path.join(BASE_STORAGE_DIR, "data");
var APPS_FILE = path.join(DATA_DIR, "apps.json");
var ADMIN_FILE = path.join(DATA_DIR, "admin.json");
var UPLOADS_DIR = path.join(BASE_STORAGE_DIR, "uploads");
var CHUNKS_DIR = path.join(UPLOADS_DIR, ".temp_chunks");
function initStorage() {
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
    if (isServerless) {
      const repoData = path.join(process.cwd(), "data");
      const repoApps = path.join(repoData, "apps.json");
      const repoAdmin = path.join(repoData, "admin.json");
      if (!fs.existsSync(APPS_FILE) && fs.existsSync(repoApps)) {
        fs.copyFileSync(repoApps, APPS_FILE);
      }
      if (!fs.existsSync(ADMIN_FILE) && fs.existsSync(repoAdmin)) {
        fs.copyFileSync(repoAdmin, ADMIN_FILE);
      }
    }
  } catch (err) {
    console.warn("[Storage Init Warning]", err);
  }
}
initStorage();
var activeSessions = /* @__PURE__ */ new Map();
var SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "winterbuild_secure_session_token_secret_key_2026";
function createSessionToken(username) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1e3;
  const payloadStr = JSON.stringify({ username, expiresAt });
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
  const token = `${payloadB64}.${signature}`;
  activeSessions.set(token, { username, expiresAt });
  return token;
}
function verifySessionToken(token) {
  if (!token || typeof token !== "string") return { valid: false };
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return { valid: true, username: session.username };
  }
  const parts = token.split(".");
  if (parts.length === 2) {
    const [payloadB64, sig] = parts;
    const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");
    if (sig.length === expectedSig.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      try {
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
        if (payload && payload.expiresAt && payload.expiresAt > Date.now()) {
          return { valid: true, username: payload.username || "admin" };
        }
      } catch {
      }
    }
  }
  return { valid: false };
}
async function parseApkMetadata(apkFilePath) {
  try {
    const parser = new AppInfoParser(apkFilePath);
    const result = await parser.parse();
    if (!result) return null;
    let title;
    if (result.application && result.application.label) {
      if (Array.isArray(result.application.label) && result.application.label.length > 0) {
        title = String(result.application.label[0]).trim();
      } else if (typeof result.application.label === "string") {
        title = result.application.label.trim();
      }
    }
    let iconUrl;
    if (result.icon && typeof result.icon === "string" && result.icon.startsWith("data:image/")) {
      try {
        const match = result.icon.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (match) {
          const rawExt = match[1] === "jpeg" ? "jpg" : match[1];
          const buffer = Buffer.from(match[2], "base64");
          const iconFileName = `icon_extracted_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${rawExt}`;
          const iconPath = path.join(UPLOADS_DIR, iconFileName);
          fs.writeFileSync(iconPath, buffer);
          iconUrl = `/uploads/${iconFileName}`;
        }
      } catch (e) {
        console.error("Failed to save extracted APK icon:", e);
      }
    }
    const packageName = result.package ? String(result.package).trim() : void 0;
    const version = result.versionName ? String(result.versionName).trim() : result.versionCode ? String(result.versionCode).trim() : void 0;
    return {
      title,
      packageName,
      version,
      versionCode: typeof result.versionCode === "number" ? result.versionCode : void 0,
      iconUrl
    };
  } catch (err) {
    console.warn("APK metadata parsing skipped or failed:", err.message);
    return null;
  }
}
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    initStorage();
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    cb(null, `${safeBase}_${uniqueSuffix}${ext}`);
  }
});
var upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024
    // 200MB
  }
});
var chunkStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(CHUNKS_DIR)) {
      fs.mkdirSync(CHUNKS_DIR, { recursive: true });
    }
    cb(null, CHUNKS_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    cb(null, `chunk_raw_${unique}.tmp`);
  }
});
var chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});
function cleanOldTempChunks() {
  try {
    if (!fs.existsSync(CHUNKS_DIR)) return;
    const entries = fs.readdirSync(CHUNKS_DIR);
    const now = Date.now();
    for (const entry of entries) {
      const fullPath = path.join(CHUNKS_DIR, entry);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory() && now - stats.mtimeMs > 36e5) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else if (!stats.isDirectory() && now - stats.mtimeMs > 6e5) {
          fs.unlinkSync(fullPath);
        }
      } catch {
      }
    }
  } catch (err) {
    console.error("Error cleaning temp chunks:", err);
  }
}
function readApps() {
  try {
    if (fs.existsSync(APPS_FILE)) {
      const raw = fs.readFileSync(APPS_FILE, "utf-8");
      return JSON.parse(raw);
    }
    const repoApps = path.join(process.cwd(), "data", "apps.json");
    if (fs.existsSync(repoApps)) {
      const raw = fs.readFileSync(repoApps, "utf-8");
      return JSON.parse(raw);
    }
    return [];
  } catch (err) {
    console.error("Error reading apps.json:", err);
    return [];
  }
}
function saveApps(apps) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving apps.json:", err);
    if (!isServerless) {
      try {
        const fallbackDir = "/tmp/winterbuild/data";
        fs.mkdirSync(fallbackDir, { recursive: true });
        fs.writeFileSync(path.join(fallbackDir, "apps.json"), JSON.stringify(apps, null, 2), "utf-8");
        return;
      } catch {
      }
    }
    throw new Error("Failed to persist app catalog");
  }
}
function getAdminConfig() {
  try {
    if (fs.existsSync(ADMIN_FILE)) {
      const raw = fs.readFileSync(ADMIN_FILE, "utf-8");
      return JSON.parse(raw);
    }
    const repoAdmin = path.join(process.cwd(), "data", "admin.json");
    if (fs.existsSync(repoAdmin)) {
      const raw = fs.readFileSync(repoAdmin, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading admin.json:", e);
  }
  return null;
}
function saveAdminConfig(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(ADMIN_FILE, JSON.stringify({ passwordHash, salt }, null, 2), "utf-8");
}
function verifyPassword(password) {
  if (!password || typeof password !== "string") {
    return false;
  }
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword && envPassword.trim().length > 0) {
    const trimmed = envPassword.trim();
    if (password.length === trimmed.length) {
      return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(trimmed));
    }
    return false;
  }
  const config = getAdminConfig();
  if (config && config.salt && config.passwordHash) {
    const hash = crypto.pbkdf2Sync(password, config.salt, 1e3, 64, "sha512").toString("hex");
    if (hash.length === config.passwordHash.length) {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(config.passwordHash));
    }
  }
  return false;
}
function hasConfiguredPassword() {
  return Boolean(
    process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0 || getAdminConfig()
  );
}
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const tokenHeader = req.headers["x-admin-token"];
  let token = tokenHeader;
  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    res.status(401).json({ error: "Unauthorized: Admin authentication token required" });
    return;
  }
  const { valid } = verifySessionToken(token);
  if (!valid) {
    if (token) activeSessions.delete(token);
    res.status(403).json({ error: "Session expired or invalid. Please sign in again." });
    return;
  }
  next();
}
async function assembleChunks(uploadId, fileName, totalChunks, _totalSize) {
  const uploadDir = path.join(CHUNKS_DIR, uploadId);
  const ext = path.extname(fileName).toLowerCase();
  const missingChunks = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(uploadDir, `chunk_${i}`);
    if (!fs.existsSync(chunkPath)) {
      missingChunks.push(i);
    }
  }
  if (missingChunks.length > 0) {
    throw new Error(
      `Missing ${missingChunks.length} chunk(s): ${missingChunks.slice(0, 5).join(", ")}${missingChunks.length > 5 ? "..." : ""}`
    );
  }
  const safeBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const finalFileName = `${safeBase}_${uniqueSuffix}${ext}`;
  const finalFilePath = path.join(UPLOADS_DIR, finalFileName);
  const writeStream = fs.createWriteStream(finalFilePath);
  const hash = crypto.createHash("sha256");
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(uploadDir, `chunk_${i}`);
    await new Promise((resolvePipe, rejectPipe) => {
      const readStream = fs.createReadStream(chunkPath);
      readStream.on("data", (dataChunk) => hash.update(dataChunk));
      readStream.on("end", () => resolvePipe());
      readStream.on("error", (err) => rejectPipe(err));
      readStream.pipe(writeStream, { end: false });
    });
  }
  writeStream.end();
  await new Promise((resolvePromise, rejectPromise) => {
    writeStream.on("finish", () => resolvePromise());
    writeStream.on("error", (err) => rejectPromise(err));
  });
  const sha256 = hash.digest("hex");
  const stats = fs.statSync(finalFilePath);
  try {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  } catch (cleanErr) {
    console.error("Failed to clean temp chunks dir:", cleanErr);
  }
  const bytes = stats.size;
  let sizeStr = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes < 1024 * 1024) {
    sizeStr = `${Math.round(bytes / 1024)} KB`;
  }
  const isApk = ext === ".apk";
  let parsed = null;
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
    parsed: parsed || void 0,
    success: true,
    assembled: true,
    message: `${isApk ? "App APK" : "File"} uploaded successfully (${sizeStr}).`
  };
}
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
var isAllowedOrigin = (origin) => {
  if (!origin) return false;
  const rawConfig = (process.env.ALLOWED_ORIGINS || "").trim();
  if (rawConfig) {
    const allowedList = rawConfig.split(",").map((s) => s.trim()).filter(Boolean);
    for (const pattern of allowedList) {
      if (pattern === origin) return true;
      if (pattern.includes("*")) {
        try {
          const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
          const regex = new RegExp(`^${escaped}$`, "i");
          if (regex.test(origin)) return true;
        } catch {
        }
      }
    }
  }
  if (origin === "http://localhost:3000" || origin === "http://localhost:5173" || origin === "http://127.0.0.1:3000" || origin === "http://127.0.0.1:5173" || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
    return true;
  }
  return false;
};
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    if (isAllowedOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token"
    );
    res.header("Access-Control-Max-Age", "86400");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
  }
  next();
});
app.use("/uploads", express.static(UPLOADS_DIR));
var repoUploads = path.join(process.cwd(), "uploads");
if (repoUploads !== UPLOADS_DIR && fs.existsSync(repoUploads)) {
  app.use("/uploads", express.static(repoUploads));
}
var apiRouter = express.Router();
apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    runtime: isServerless ? "vercel-serverless" : "container"
  });
});
apiRouter.get("/system/status", (_req, res) => {
  const apps = readApps();
  const totalDownloads = apps.reduce((acc, curr) => acc + (curr.downloadsCount || 0), 0);
  const hasCustomPassword = hasConfiguredPassword();
  res.json({
    initialized: true,
    appsCount: apps.length,
    totalDownloads,
    storageType: isServerless ? "vercel_ephemeral_storage" : "local_container",
    firebaseConfigured: false,
    hasCustomPassword,
    version: "1.2.0"
  });
});
apiRouter.get("/admin/status", (req, res) => {
  const token = req.headers["x-admin-token"] || req.headers.authorization?.replace("Bearer ", "");
  let isAuthenticated = false;
  let username;
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
    hasConfiguredPassword: hasConfiguredPassword()
  });
});
apiRouter.post("/admin/setup", (req, res) => {
  if (hasConfiguredPassword()) {
    const token2 = req.headers["x-admin-token"] || req.headers.authorization?.replace("Bearer ", "");
    const { valid } = verifySessionToken(token2 || "");
    if (!valid) {
      res.status(403).json({
        error: "Admin password has already been configured. Please log in with your existing password or update ADMIN_PASSWORD."
      });
      return;
    }
  }
  const { password } = req.body;
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters long for security." });
    return;
  }
  saveAdminConfig(password);
  const token = createSessionToken("admin");
  res.json({
    success: true,
    message: "Admin passphrase successfully saved",
    token,
    username: "admin"
  });
});
apiRouter.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Password is required" });
    return;
  }
  if (!hasConfiguredPassword()) {
    res.status(401).json({
      error: "No admin password has been configured yet. Please complete initial setup or configure ADMIN_PASSWORD."
    });
    return;
  }
  if (!verifyPassword(password)) {
    res.status(401).json({ error: "Invalid admin credentials" });
    return;
  }
  const token = createSessionToken("admin");
  res.json({
    success: true,
    token,
    username: "admin",
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1e3
  });
});
apiRouter.post("/admin/logout", (req, res) => {
  const token = req.headers["x-admin-token"] || req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true });
});
apiRouter.post("/upload", requireAdmin, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: "The uploaded file exceeds the 200MB maximum size limit. Please choose a smaller APK file."
          });
          return;
        }
        res.status(400).json({ error: `Upload error: ${err.message}` });
        return;
      }
      res.status(400).json({
        error: err.message || "An error occurred while uploading the file."
      });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file was provided for upload." });
      return;
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExts = [".apk", ".png", ".jpg", ".jpeg", ".webp", ".svg"];
    if (!allowedExts.includes(ext)) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupErr) {
        console.error("Failed to clean up invalid file:", cleanupErr);
      }
      res.status(400).json({
        error: `File type "${ext}" is not allowed. Only .apk files (or image files for icons and pictures) are supported.`
      });
      return;
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const isApk = ext === ".apk";
    let sha256;
    if (isApk) {
      try {
        const hash = crypto.createHash("sha256");
        await new Promise((resolveHash, rejectHash) => {
          const stream = fs.createReadStream(req.file.path);
          stream.on("data", (chunk) => hash.update(chunk));
          stream.on("end", () => {
            sha256 = hash.digest("hex");
            resolveHash();
          });
          stream.on("error", (hashErr) => rejectHash(hashErr));
        });
      } catch (e) {
        console.error("Failed to compute sha256 checksum", e);
      }
    }
    let parsed = null;
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
      parsed: parsed || void 0,
      success: true,
      message: `${isApk ? "App APK" : "File"} uploaded successfully (${sizeStr}).`
    });
  });
});
apiRouter.post("/upload-chunk", requireAdmin, (req, res) => {
  chunkUpload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: `Chunk upload error: ${err.message}` });
        return;
      }
      res.status(400).json({ error: err.message || "Failed to upload chunk." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No chunk data received." });
      return;
    }
    const { uploadId, fileName } = req.body;
    const chunkIndex = Number(req.body.chunkIndex);
    const totalChunks = Number(req.body.totalChunks);
    const totalSize = Number(req.body.totalSize);
    if (!uploadId || typeof uploadId !== "string" || !/^[a-zA-Z0-9_-]{6,64}$/.test(uploadId) || isNaN(chunkIndex) || isNaN(totalChunks) || chunkIndex < 0 || chunkIndex >= totalChunks || totalChunks < 1 || totalChunks > 200 || !fileName || typeof fileName !== "string") {
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
        }
      }
      res.status(400).json({ error: "Invalid chunk upload parameters." });
      return;
    }
    const ext = path.extname(fileName).toLowerCase();
    const allowedExts = [".apk", ".png", ".jpg", ".jpeg", ".webp", ".svg"];
    if (!allowedExts.includes(ext)) {
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
        }
      }
      res.status(400).json({
        error: `File type "${ext}" is not allowed. Only .apk files (or image files) are supported.`
      });
      return;
    }
    if (totalSize > 200 * 1024 * 1024) {
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
        }
      }
      res.status(413).json({
        error: "File exceeds the 200MB limit. Please choose a smaller APK."
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
      try {
        fs.unlinkSync(req.file.path);
      } catch {
      }
    }
    const shouldAutoAssemble = req.query.autoAssemble === "true";
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
        } catch (assemblyErr) {
          res.status(500).json({ error: assemblyErr.message });
          return;
        }
      }
    }
    res.json({
      success: true,
      assembled: false,
      chunkIndex,
      totalChunks
    });
  });
});
apiRouter.post("/upload-complete", requireAdmin, async (req, res) => {
  const { uploadId, fileName, totalChunks, totalSize } = req.body;
  if (!uploadId || !fileName || typeof uploadId !== "string" || !/^[a-zA-Z0-9_-]{6,64}$/.test(uploadId) || !Number.isInteger(Number(totalChunks)) || Number(totalChunks) < 1) {
    res.status(400).json({ error: "Missing or invalid parameters to complete chunked upload." });
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
  } catch (err) {
    console.error("Error in /api/upload-complete:", err);
    res.status(400).json({ error: err.message || "Failed to assemble uploaded chunks." });
  }
});
apiRouter.post("/upload-cancel", requireAdmin, (req, res) => {
  const { uploadId } = req.body;
  if (uploadId && typeof uploadId === "string" && /^[a-zA-Z0-9_-]{6,64}$/.test(uploadId)) {
    const uploadDir = path.join(CHUNKS_DIR, uploadId);
    if (fs.existsSync(uploadDir)) {
      try {
        fs.rmSync(uploadDir, { recursive: true, force: true });
      } catch {
      }
    }
  }
  res.json({ success: true });
});
apiRouter.get("/apps", (req, res) => {
  const apps = readApps();
  const { category, search, featured, sort } = req.query;
  let filtered = [...apps];
  if (category && category !== "All") {
    filtered = filtered.filter(
      (appItem) => appItem.category.toLowerCase() === String(category).toLowerCase()
    );
  }
  if (featured === "true") {
    filtered = filtered.filter((appItem) => appItem.isFeatured);
  }
  if (search && typeof search === "string" && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (appItem) => appItem.title.toLowerCase().includes(q) || appItem.packageName.toLowerCase().includes(q) || appItem.developer.toLowerCase().includes(q) || appItem.shortDescription.toLowerCase().includes(q) || appItem.category.toLowerCase().includes(q)
    );
  }
  if (sort === "popular") {
    filtered.sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0));
  } else if (sort === "name") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    filtered.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }
  res.json(filtered);
});
apiRouter.get("/apps/:id", (req, res) => {
  const apps = readApps();
  const appItem = apps.find((a) => a.id === req.params.id);
  if (!appItem) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json(appItem);
});
apiRouter.post("/apps/:id/download", (req, res) => {
  const apps = readApps();
  const index = apps.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  apps[index].downloadsCount = (apps[index].downloadsCount || 0) + 1;
  saveApps(apps);
  res.json({
    success: true,
    downloadsCount: apps[index].downloadsCount,
    apkUrl: apps[index].apkUrl,
    fileName: apps[index].apkFileName || `${apps[index].title}-${apps[index].version}.apk`,
    sha256: apps[index].apkSha256
  });
});
apiRouter.get("/download-apk/:id", (req, res) => {
  const apps = readApps();
  const appItem = apps.find((a) => a.id === req.params.id);
  if (!appItem) {
    res.status(404).send("Application not found");
    return;
  }
  appItem.downloadsCount = (appItem.downloadsCount || 0) + 1;
  saveApps(apps);
  if (appItem.apkUrl.startsWith("/uploads/")) {
    const filename = path.basename(appItem.apkUrl);
    const candidatePaths = [
      path.join(UPLOADS_DIR, filename),
      path.join(process.cwd(), "uploads", filename),
      path.join(process.cwd(), appItem.apkUrl.replace(/^\//, ""))
    ];
    for (const localPath of candidatePaths) {
      if (fs.existsSync(localPath)) {
        const cleanTitle = (appItem.title || "App").replace(/[^a-zA-Z0-9_-]/g, "_");
        const cleanVer = (appItem.version || "1.0").replace(/[^a-zA-Z0-9._-]/g, "_");
        const downloadName = appItem.apkFileName || `${cleanTitle}_v${cleanVer}.apk`;
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
        res.download(localPath, downloadName);
        return;
      }
    }
  }
  res.redirect(appItem.apkUrl);
});
apiRouter.post("/apps", requireAdmin, (req, res) => {
  const data = req.body;
  if (!data.apkUrl || typeof data.apkUrl !== "string" || !data.apkUrl.trim()) {
    res.status(400).json({
      error: "APK file or download link is required to publish an app."
    });
    return;
  }
  const apps = readApps();
  const newId = `app_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  let title = data.title?.trim();
  if (!title) {
    if (data.apkFileName) {
      const cleaned = data.apkFileName.replace(/\.apk$/i, "").replace(/[-_]/g, " ").trim();
      title = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "Untitled App";
    } else {
      title = "Untitled App";
    }
  }
  let packageName = data.packageName?.trim();
  if (!packageName) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    packageName = `com.winterbuild.${slug || "app"}`;
  }
  const version = data.version?.trim() || "1.0.0";
  let fileSize = data.fileSize?.trim();
  let fileSizeBytes = data.fileSizeBytes;
  if (!fileSize && data.apkUrl.startsWith("/uploads/")) {
    const filename = path.basename(data.apkUrl);
    const candidatePaths = [
      path.join(UPLOADS_DIR, filename),
      path.join(process.cwd(), "uploads", filename)
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const sz = fs.statSync(p).size;
        fileSizeBytes = sz;
        fileSize = sz < 1024 * 1024 ? `${Math.round(sz / 1024)} KB` : `${(sz / (1024 * 1024)).toFixed(1)} MB`;
        break;
      }
    }
  }
  if (!fileSize) {
    fileSize = "APK";
  }
  const newApp = {
    id: newId,
    title,
    packageName,
    developer: data.developer?.trim() || "WinterBuild Community",
    version,
    versionCode: Number(data.versionCode) || 1,
    category: data.category || "Tools",
    shortDescription: data.shortDescription?.trim() || "Safe Android application package.",
    description: data.description?.trim() || "Safe Android application package ready for fast download and installation.",
    features: Array.isArray(data.features) ? data.features.filter(Boolean) : data.features ? String(data.features).split("\n").map((s) => s.trim()).filter(Boolean) : [],
    changelog: data.changelog?.trim() || "Initial release.",
    minAndroid: data.minAndroid?.trim() || "Android 5.0+",
    targetArchitecture: data.targetArchitecture?.trim() || "Universal",
    fileSize,
    fileSizeBytes,
    iconUrl: data.iconUrl?.trim() || "",
    screenshots: Array.isArray(data.screenshots) ? data.screenshots.filter(Boolean) : [],
    apkUrl: data.apkUrl.trim(),
    apkFileName: data.apkFileName?.trim(),
    apkSha256: data.apkSha256?.trim(),
    isVerified: data.isVerified ?? true,
    isFeatured: Boolean(data.isFeatured),
    downloadsCount: 0,
    releaseDate: data.releaseDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  apps.unshift(newApp);
  saveApps(apps);
  res.status(201).json(newApp);
});
apiRouter.put("/apps/:id", requireAdmin, (req, res) => {
  const apps = readApps();
  const index = apps.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "App listing not found" });
    return;
  }
  const current = apps[index];
  const data = req.body;
  const updatedApp = {
    ...current,
    title: data.title !== void 0 ? data.title.trim() : current.title,
    packageName: data.packageName !== void 0 ? data.packageName.trim() : current.packageName,
    developer: data.developer !== void 0 ? data.developer.trim() : current.developer,
    version: data.version !== void 0 ? data.version.trim() : current.version,
    versionCode: data.versionCode !== void 0 ? Number(data.versionCode) : current.versionCode,
    category: data.category !== void 0 ? data.category : current.category,
    shortDescription: data.shortDescription !== void 0 ? data.shortDescription.trim() : current.shortDescription,
    description: data.description !== void 0 ? data.description.trim() : current.description,
    features: Array.isArray(data.features) ? data.features.filter(Boolean) : data.features !== void 0 ? String(data.features).split("\n").map((s) => s.trim()).filter(Boolean) : current.features,
    changelog: data.changelog !== void 0 ? data.changelog.trim() : current.changelog,
    minAndroid: data.minAndroid !== void 0 ? data.minAndroid.trim() : current.minAndroid,
    targetArchitecture: data.targetArchitecture !== void 0 ? data.targetArchitecture.trim() : current.targetArchitecture,
    fileSize: data.fileSize !== void 0 ? data.fileSize.trim() : current.fileSize,
    fileSizeBytes: data.fileSizeBytes !== void 0 ? data.fileSizeBytes : current.fileSizeBytes,
    iconUrl: data.iconUrl !== void 0 ? data.iconUrl.trim() : current.iconUrl,
    screenshots: Array.isArray(data.screenshots) ? data.screenshots.filter(Boolean) : current.screenshots,
    apkUrl: data.apkUrl !== void 0 ? data.apkUrl.trim() : current.apkUrl,
    apkFileName: data.apkFileName !== void 0 ? data.apkFileName.trim() : current.apkFileName,
    apkSha256: data.apkSha256 !== void 0 ? data.apkSha256.trim() : current.apkSha256,
    isVerified: data.isVerified !== void 0 ? Boolean(data.isVerified) : current.isVerified,
    isFeatured: data.isFeatured !== void 0 ? Boolean(data.isFeatured) : current.isFeatured,
    releaseDate: data.releaseDate || current.releaseDate,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  apps[index] = updatedApp;
  saveApps(apps);
  res.json(updatedApp);
});
apiRouter.delete("/apps/:id", requireAdmin, (req, res) => {
  const apps = readApps();
  const appItem = apps.find((a) => a.id === req.params.id);
  if (!appItem) {
    res.status(404).json({ error: "App listing not found" });
    return;
  }
  const filtered = apps.filter((a) => a.id !== req.params.id);
  saveApps(filtered);
  res.json({
    success: true,
    message: `Application "${appItem.title}" successfully deleted.`
  });
});
apiRouter.post("/contact", (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ error: "Name, email, and message are required." });
    return;
  }
  console.log(`[Contact Submission] from ${name} <${email}>: [${subject || "General"}] ${message}`);
  res.json({
    success: true,
    message: "Your inquiry has been received. The WinterBuild team will review your message."
  });
});
app.get("/download-apk/:id", (req, res) => {
  res.redirect(`/api/download-apk/${encodeURIComponent(req.params.id)}`);
});
app.use("/api", apiRouter);
if (isServerless) {
  app.use(apiRouter);
}
apiRouter.all("*", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});
app.use((err, _req, res, _next) => {
  console.error("Unhandled Server Error:", err);
  res.status(err?.status || 500).json({
    error: err?.message || "An unexpected error occurred on the server."
  });
});
var serverApp_default = app;
export {
  apiRouter,
  app,
  cleanOldTempChunks,
  createSessionToken,
  serverApp_default as default,
  getAdminConfig,
  hasConfiguredPassword,
  isServerless,
  readApps,
  requireAdmin,
  saveAdminConfig,
  saveApps,
  verifyPassword,
  verifySessionToken
};
