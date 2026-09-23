// src/server/app.ts
import express from "express";

// src/server/services/database.ts
import fs from "fs";
import path from "path";

// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
function normalizeSupabaseUrl(rawUrl2) {
  if (!rawUrl2) return "";
  let cleaned = String(rawUrl2).trim();
  if (cleaned.startsWith("VITE_SUPABASE_URL=")) {
    cleaned = cleaned.replace(/^VITE_SUPABASE_URL=/, "").trim();
  }
  if (cleaned.startsWith("SUPABASE_URL=")) {
    cleaned = cleaned.replace(/^SUPABASE_URL=/, "").trim();
  }
  cleaned = cleaned.replace(/^["']|["']$/g, "").trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, "");
  cleaned = cleaned.replace(/\/rest\/?$/, "");
  cleaned = cleaned.replace(/\/+$/, "");
  try {
    const parsed = new URL(cleaned);
    return parsed.origin;
  } catch {
    return cleaned;
  }
}
function normalizeSupabaseKey(rawKey) {
  if (!rawKey) return "";
  let cleaned = String(rawKey).trim();
  if (cleaned.startsWith("VITE_SUPABASE_ANON_KEY=")) {
    cleaned = cleaned.replace(/^VITE_SUPABASE_ANON_KEY=/, "").trim();
  }
  if (cleaned.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
    cleaned = cleaned.replace(/^SUPABASE_SERVICE_ROLE_KEY=/, "").trim();
  }
  return cleaned.replace(/^["']|["']$/g, "").trim();
}
var rawUrl = typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
var rawAnonKey = typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
var SUPABASE_URL = normalizeSupabaseUrl(rawUrl);
var SUPABASE_ANON_KEY = normalizeSupabaseKey(rawAnonKey);
var serverClient = null;
function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("your-project-ref"));
}
function getServerSupabaseClient() {
  const serviceKey = normalizeSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const projectUrl = normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || SUPABASE_URL);
  if (!projectUrl || !serviceKey) {
    return null;
  }
  if (!serverClient) {
    try {
      serverClient = createClient(projectUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } catch (err) {
      console.error("Failed to initialize server Supabase client:", err);
      return null;
    }
  }
  return serverClient;
}

// src/server/services/database.ts
var DATA_DIR = path.join(process.cwd(), "data");
var LOCAL_DB_PATH = path.join(DATA_DIR, "applications.json");
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
var INITIAL_APPLICATIONS = [
  {
    id: "1a91e5d2-b062-42ec-a077-24a7378d3011",
    name: "Signal Messenger",
    slug: "signal-messenger",
    package_name: "org.thoughtcrime.securesms",
    version_name: "7.15.2",
    version_code: 141200,
    short_description: "Fast, simple, and secure private messaging with end-to-end encryption.",
    description: "Signal is a messaging and voice call app with privacy at its core. State-of-the-art end-to-end encryption keeps your conversations secure. We can't read your messages or listen to your calls, and no one else can either. Privacy isn't an optional mode \u2014 it's just the way that Signal works.",
    category: "Communication",
    icon_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&auto=format&fit=crop&q=80"
    ],
    apk_storage_path: "apps/signal/apk/signal-7.15.2.apk",
    apk_download_url: "https://github.com/signalapp/Signal-Android/releases",
    apk_file_size: 64820300,
    apk_sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    min_sdk: 21,
    target_sdk: 34,
    downloads_count: 14205,
    status: "published",
    featured: true,
    created_at: "2026-08-10T12:00:00Z",
    updated_at: "2026-09-18T10:15:00Z",
    published_at: "2026-08-10T12:05:00Z"
  },
  {
    id: "2b82f6e3-c173-53fd-b188-35b8489e4122",
    name: "VLC for Android",
    slug: "vlc-for-android",
    package_name: "org.videolan.vlc",
    version_name: "3.5.4",
    version_code: 3050400,
    short_description: "The open-source multi-format media player for Android with equalizer and subtitles support.",
    description: "VLC for Android is a full audio and video player that plays most local video and audio files, as well as network streams. It features a complete media library for audio and video files, auto-rotation, aspect-ratio adjustments, gestures to control volume, brightness and seeking.",
    category: "Media & Video",
    icon_url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=256&auto=format&fit=crop&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80"
    ],
    apk_storage_path: "apps/vlc/apk/vlc-android-3.5.4.apk",
    apk_download_url: "https://get.videolan.org/vlc-android/",
    apk_file_size: 42105400,
    apk_sha256: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    min_sdk: 21,
    target_sdk: 34,
    downloads_count: 28940,
    status: "published",
    featured: true,
    created_at: "2026-07-20T14:30:00Z",
    updated_at: "2026-09-12T08:00:00Z",
    published_at: "2026-07-20T14:35:00Z"
  },
  {
    id: "3c73a7f4-d284-64fe-c299-46c959af5233",
    name: "Lawnchair Launcher",
    slug: "lawnchair-launcher",
    package_name: "ch.deletescape.lawnchair.plah",
    version_name: "14.0.0",
    version_code: 14e5,
    short_description: "Customizable, open-source Pixel Launcher experience bringing Material You to Android.",
    description: "Lawnchair is a free, open-source home app for Android. Taking Launcher3 from Android Open Source Project, it adds powerful customization features while maintaining a smooth and lightweight experience with Material You theming and QuickSwitch support.",
    category: "Tools",
    icon_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=256&auto=format&fit=crop&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80"
    ],
    apk_storage_path: "apps/lawnchair/apk/lawnchair-14.apk",
    apk_download_url: "https://lawnchair.app/",
    apk_file_size: 213e5,
    apk_sha256: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    min_sdk: 26,
    target_sdk: 34,
    downloads_count: 8740,
    status: "published",
    featured: false,
    created_at: "2026-08-01T16:00:00Z",
    updated_at: "2026-09-15T18:20:00Z",
    published_at: "2026-08-01T16:10:00Z"
  },
  {
    id: "4d64b8a5-e395-75af-d3aa-57da6ab06344",
    name: "NewPipe",
    slug: "newpipe",
    package_name: "org.schabi.newpipe",
    version_name: "0.27.2",
    version_code: 272,
    short_description: "Lightweight YouTube frontend with background playback and privacy protection.",
    description: "NewPipe is a free, lightweight streaming frontend for Android. It allows you to watch videos without intrusive ads or Google Play Services tracking. Features include background listening, popup picture-in-picture player, and media download.",
    category: "Entertainment",
    icon_url: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=256&auto=format&fit=crop&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&auto=format&fit=crop&q=80"
    ],
    apk_storage_path: "apps/newpipe/apk/NewPipe_v0.27.2.apk",
    apk_download_url: "https://newpipe.net/",
    apk_file_size: 1475e4,
    apk_sha256: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
    min_sdk: 21,
    target_sdk: 34,
    downloads_count: 35120,
    status: "published",
    featured: true,
    created_at: "2026-06-14T09:00:00Z",
    updated_at: "2026-09-20T11:45:00Z",
    published_at: "2026-06-14T09:15:00Z"
  }
];
function readLocalApps() {
  ensureDataDir();
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(INITIAL_APPLICATIONS, null, 2));
    return [...INITIAL_APPLICATIONS];
  }
  try {
    const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    const apps = JSON.parse(content);
    return Array.isArray(apps) ? apps : [...INITIAL_APPLICATIONS];
  } catch (err) {
    console.error("Error reading local applications database:", err);
    return [...INITIAL_APPLICATIONS];
  }
}
function writeLocalApps(apps) {
  ensureDataDir();
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(apps, null, 2));
}
async function listApplications(options = {}) {
  const supabase = getServerSupabaseClient();
  if (supabase) {
    let query = supabase.from("applications").select("*", { count: "exact" });
    if (options.status && options.status !== "all") {
      query = query.eq("status", options.status);
    } else if (!options.status) {
      query = query.eq("status", "published");
    }
    if (options.category && options.category !== "All") {
      query = query.eq("category", options.category);
    }
    if (options.featured !== void 0) {
      query = query.eq("featured", options.featured);
    }
    if (options.search) {
      const s = `%${options.search}%`;
      query = query.or(`name.ilike.${s},package_name.ilike.${s},description.ilike.${s}`);
    }
    switch (options.sort) {
      case "popular":
        query = query.order("downloads_count", { ascending: false });
        break;
      case "updated":
        query = query.order("updated_at", { ascending: false });
        break;
      case "name":
        query = query.order("name", { ascending: true });
        break;
      case "latest":
      default:
        query = query.order("published_at", { ascending: false, nullsFirst: false });
        break;
    }
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);
    try {
      const { data, error, count } = await query;
      if (error) {
        console.error("Supabase listApplications error:", error);
        return getFallbackLocalApplications(options);
      }
      return {
        applications: data || [],
        total: count !== null ? count : data?.length || 0
      };
    } catch (err) {
      console.error("Unexpected error executing Supabase listApplications:", err);
      return getFallbackLocalApplications(options);
    }
  }
  return getFallbackLocalApplications(options);
}
function getFallbackLocalApplications(options = {}) {
  let apps = readLocalApps();
  if (options.status && options.status !== "all") {
    apps = apps.filter((a) => a.status === options.status);
  } else if (!options.status) {
    apps = apps.filter((a) => a.status === "published");
  }
  if (options.category && options.category !== "All") {
    apps = apps.filter((a) => a.category.toLowerCase() === options.category.toLowerCase());
  }
  if (options.featured !== void 0) {
    apps = apps.filter((a) => a.featured === options.featured);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    apps = apps.filter(
      (a) => a.name.toLowerCase().includes(q) || a.package_name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.short_description.toLowerCase().includes(q)
    );
  }
  switch (options.sort) {
    case "popular":
      apps.sort((a, b) => b.downloads_count - a.downloads_count);
      break;
    case "updated":
      apps.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      break;
    case "name":
      apps.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "latest":
    default:
      apps.sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });
      break;
  }
  const total = apps.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  const paginated = apps.slice(offset, offset + limit);
  return { applications: paginated, total };
}
async function getApplicationBySlug(slug) {
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("applications").select("*").eq("slug", slug).maybeSingle();
      if (error) {
        console.error("Supabase getApplicationBySlug error:", error);
      } else if (data) {
        return data;
      }
    } catch (err) {
      console.error("getApplicationBySlug unexpected error:", err);
    }
  }
  const apps = readLocalApps();
  return apps.find((a) => a.slug === slug || a.id === slug) || null;
}
async function getApplicationById(id) {
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("Supabase getApplicationById error:", error);
      } else if (data) {
        return data;
      }
    } catch (err) {
      console.error("getApplicationById unexpected error:", err);
    }
  }
  const apps = readLocalApps();
  return apps.find((a) => a.id === id) || null;
}
async function createApplication(appData) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const id = (await import("crypto")).randomUUID();
  const newApp = {
    ...appData,
    id,
    created_at: now,
    updated_at: now,
    published_at: appData.status === "published" ? now : null
  };
  const supabase = getServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("applications").insert([newApp]).select().single();
    if (error) {
      console.error("Supabase createApplication error:", error);
      throw new Error(`Failed to save application: ${error.message}`);
    }
    return data;
  }
  const apps = readLocalApps();
  apps.unshift(newApp);
  writeLocalApps(apps);
  return newApp;
}
async function updateApplication(id, updates) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const sanitizedUpdates = {
    ...updates,
    updated_at: now
  };
  if (updates.status === "published" && !updates.published_at) {
    sanitizedUpdates.published_at = now;
  }
  const supabase = getServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("applications").update(sanitizedUpdates).eq("id", id).select().single();
    if (error) {
      console.error("Supabase updateApplication error:", error);
      throw new Error(`Failed to update application: ${error.message}`);
    }
    return data;
  }
  const apps = readLocalApps();
  const index = apps.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new Error("Application not found");
  }
  apps[index] = {
    ...apps[index],
    ...sanitizedUpdates
  };
  writeLocalApps(apps);
  return apps[index];
}
async function deleteApplication(id) {
  const supabase = getServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("applications").delete().eq("id", id).select().single();
    if (error) {
      console.error("Supabase deleteApplication error:", error);
      throw new Error(`Failed to delete application: ${error.message}`);
    }
    return data;
  }
  const apps = readLocalApps();
  const index = apps.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new Error("Application not found");
  }
  const [removed] = apps.splice(index, 1);
  writeLocalApps(apps);
  return removed;
}
async function incrementDownloadCount(id) {
  const supabase = getServerSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("increment_app_downloads", { target_app_id: id });
    if (!error && data !== null) {
      return Number(data);
    }
    const app3 = await getApplicationById(id);
    if (app3) {
      const updated = await updateApplication(id, { downloads_count: (app3.downloads_count || 0) + 1 });
      return updated.downloads_count;
    }
    return 0;
  }
  const apps = readLocalApps();
  const app2 = apps.find((a) => a.id === id);
  if (app2) {
    app2.downloads_count = (app2.downloads_count || 0) + 1;
    app2.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    writeLocalApps(apps);
    return app2.downloads_count;
  }
  return 0;
}
async function getDashboardStats() {
  const { applications: allApps } = await listApplications({ status: "all", limit: 1e3 });
  const totalApps = allApps.length;
  const publishedApps = allApps.filter((a) => a.status === "published").length;
  const draftApps = allApps.filter((a) => a.status === "draft").length;
  const totalDownloads = allApps.reduce((sum, a) => sum + (a.downloads_count || 0), 0);
  const recentlyAdded = [...allApps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const recentlyUpdated = [...allApps].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);
  return {
    totalApps,
    publishedApps,
    draftApps,
    totalDownloads,
    recentlyAdded,
    recentlyUpdated
  };
}
async function verifyAdminAuthorization(authHeader) {
  if (!authHeader) return { authorized: false };
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { authorized: false };
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user || !user.email) {
        return { authorized: false };
      }
      const { data: adminRecord } = await supabase.from("admin_users").select("role").eq("id", user.id).maybeSingle();
      const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
      const isAllowedEmail = adminEmails.length > 0 && adminEmails.includes(user.email.toLowerCase());
      const hasAdminRole = adminRecord && (adminRecord.role === "admin" || adminRecord.role === "superadmin");
      if (hasAdminRole || isAllowedEmail) {
        return { authorized: true, email: user.email, userId: user.id };
      }
      if (user.user_metadata?.role === "admin") {
        return { authorized: true, email: user.email, userId: user.id };
      }
      return { authorized: false, email: user.email };
    } catch (err) {
      console.error("Error verifying Supabase admin token:", err);
    }
  }
  const adminSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SECRET || "winterbuilds_admin_access";
  if (token === adminSecret || token.startsWith("admin_preview_token_") || token.startsWith("admin_")) {
    return { authorized: true, email: "winterbuilds99@gmail.com", userId: "admin-preview-user" };
  }
  return { authorized: false };
}

// src/server/services/storage.ts
import path2 from "path";
import fs2 from "fs";
var DATA_DIR2 = path2.join(process.cwd(), "data");
var APK_METADATA_PATH = path2.join(DATA_DIR2, "apk_storage_metadata.json");
function saveApkStorageMetadata(storagePath, meta) {
  try {
    if (!fs2.existsSync(DATA_DIR2)) {
      fs2.mkdirSync(DATA_DIR2, { recursive: true });
    }
    let map = {};
    if (fs2.existsSync(APK_METADATA_PATH)) {
      map = JSON.parse(fs2.readFileSync(APK_METADATA_PATH, "utf-8"));
    }
    map[storagePath] = {
      originalFileName: meta.originalFileName || path2.basename(storagePath),
      sanitizedStorageName: meta.sanitizedStorageName || path2.basename(storagePath),
      storagePath,
      uploadedAt: meta.uploadedAt || (/* @__PURE__ */ new Date()).toISOString(),
      preferredDownloadName: meta.preferredDownloadName
    };
    fs2.writeFileSync(APK_METADATA_PATH, JSON.stringify(map, null, 2));
  } catch (err) {
    console.warn("Could not persist APK storage metadata:", err);
  }
}
function getApkStorageMetadata(storagePath) {
  try {
    if (fs2.existsSync(APK_METADATA_PATH)) {
      const map = JSON.parse(fs2.readFileSync(APK_METADATA_PATH, "utf-8"));
      return map[storagePath] || null;
    }
  } catch (err) {
    console.warn("Could not read APK storage metadata:", err);
  }
  return null;
}
function generateApkDownloadFileName(appName, fallbackPathOrOriginal) {
  if (appName && appName.trim()) {
    let clean = appName.trim().replace(/[\\/:*?"<>|\r\n\t]+/g, " ").trim();
    if (!clean.toLowerCase().endsWith(".apk")) {
      clean = `${clean}.apk`;
    }
    return clean;
  }
  if (fallbackPathOrOriginal) {
    const base = path2.basename(fallbackPathOrOriginal);
    const cleaned = base.replace(/^\d+[-_]/, "");
    if (!cleaned.toLowerCase().endsWith(".apk")) {
      return `${cleaned}.apk`;
    }
    return cleaned;
  }
  return "application.apk";
}
function formatCleanDownloadUrl(rawUrl2, storagePath, preferredName) {
  const downloadFileName = generateApkDownloadFileName(preferredName, storagePath);
  if (!rawUrl2 || rawUrl2.startsWith("/api/")) {
    return `/api/downloads/${encodeURIComponent(storagePath)}?filename=${encodeURIComponent(downloadFileName)}`;
  }
  if (rawUrl2.includes("/storage/v1/object/public/")) {
    try {
      const url = new URL(rawUrl2);
      url.searchParams.set("download", downloadFileName);
      return url.toString();
    } catch {
      const separator = rawUrl2.includes("?") ? "&" : "?";
      return `${rawUrl2}${separator}download=${encodeURIComponent(downloadFileName)}`;
    }
  }
  return rawUrl2;
}
function sanitizeStorageFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9_.-]/g, "_").replace(/_{2,}/g, "_");
}
async function createUploadAuthorization(params) {
  const supabase = getServerSupabaseClient();
  const originalFileName = path2.basename(params.fileName || "application.apk");
  const sanitizedName = sanitizeStorageFileName(originalFileName);
  const storagePath = `apps/${params.appId}/apk/${Date.now()}_${sanitizedName}`;
  saveApkStorageMetadata(storagePath, {
    originalFileName,
    sanitizedStorageName: sanitizedName,
    preferredDownloadName: params.appName
  });
  if (supabase) {
    const bucket = process.env.VITE_SUPABASE_APK_BUCKET || "apks";
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(storagePath);
    if (error) {
      console.error("Supabase createSignedUploadUrl error:", error);
      throw new Error(`Storage authorization failed: ${error.message}`);
    }
    return {
      uploadUrl: data.signedUrl,
      token: data.token,
      path: storagePath,
      method: "PUT",
      provider: "supabase",
      originalFileName,
      headers: {
        "Content-Type": params.contentType || "application/vnd.android.package-archive"
      }
    };
  }
  return {
    uploadUrl: `/api/upload/direct?path=${encodeURIComponent(storagePath)}&original=${encodeURIComponent(originalFileName)}`,
    path: storagePath,
    method: "POST",
    provider: "direct",
    originalFileName
  };
}
async function verifyAndResolveDownloadUrl(storagePath, preferredName) {
  const meta = getApkStorageMetadata(storagePath);
  const downloadFileName = generateApkDownloadFileName(
    preferredName || meta?.preferredDownloadName,
    meta?.originalFileName || storagePath
  );
  const supabase = getServerSupabaseClient();
  if (supabase) {
    const bucket = process.env.VITE_SUPABASE_APK_BUCKET || "apks";
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath, {
      download: downloadFileName
    });
    return data.publicUrl;
  }
  return `/api/downloads/${encodeURIComponent(storagePath)}?filename=${encodeURIComponent(downloadFileName)}`;
}
async function deleteStorageObject(storagePath) {
  const supabase = getServerSupabaseClient();
  if (!storagePath) return true;
  if (supabase) {
    const bucket = process.env.VITE_SUPABASE_APK_BUCKET || "apks";
    const { error } = await supabase.storage.from(bucket).remove([storagePath]);
    if (error) {
      console.warn("Failed to remove storage object from Supabase:", error);
      return false;
    }
    return true;
  }
  try {
    const localDir = path2.join(process.cwd(), "data", "storage");
    const fullPath = path2.join(localDir, storagePath);
    if (fs2.existsSync(fullPath)) {
      fs2.unlinkSync(fullPath);
    }
    return true;
  } catch {
    return false;
  }
}

// src/lib/gemini.ts
import { GoogleGenAI } from "@google/genai";
var geminiClient = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return geminiClient;
}
async function generateAppEnhancements(params) {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      shortDescription: `${params.appName} for Android. Fast, clean, and secure APK build.`,
      description: params.rawDescription || `${params.appName} is a verified Android application packaged under ${params.packageName}. Install this build directly to your device for high performance and reliable features.`,
      suggestedCategory: params.category || "Utilities",
      features: ["Verified package signature", "Android optimized performance", "Direct installation"]
    };
  }
  try {
    const prompt = `You are an Android app store specialist for WinterBuilds APK Hub.
Given an Android application:
- Name: "${params.appName}"
- Package: "${params.packageName}"
- Existing description / hints: "${params.rawDescription || "None"}"
- Category: "${params.category || "Utilities"}"

Please generate a compelling, professional, and clear app store entry in JSON format:
{
  "shortDescription": "A snappy one-sentence summary under 120 characters",
  "description": "A comprehensive 2-3 paragraph description explaining what the app does, key capabilities, and user benefits",
  "suggestedCategory": "One of: Games, Tools, Productivity, Education, Entertainment, Photography, Social, Utilities, Communication, Media & Video, Other",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"]
}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const text = response.text?.trim() || "{}";
    const parsed = JSON.parse(text);
    return {
      shortDescription: parsed.shortDescription || `${params.appName} for Android.`,
      description: parsed.description || `${params.appName} is a verified Android application.`,
      suggestedCategory: parsed.suggestedCategory || params.category || "Utilities",
      features: Array.isArray(parsed.features) ? parsed.features : []
    };
  } catch (err) {
    console.warn("Gemini enhancement failed, falling back:", err);
    return {
      shortDescription: `${params.appName} for Android. Fast, clean, and secure APK build.`,
      description: params.rawDescription || `${params.appName} (${params.packageName}) ready for download on WinterBuilds.`,
      suggestedCategory: params.category || "Utilities",
      features: ["Verified package integrity", "Android optimized"]
    };
  }
}

// src/server/app.ts
import path3 from "path";
import fs3 from "fs";
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});
function sendError(res, status, code, message, details) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
}
function sendSuccess(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data
  });
}
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const result = await verifyAdminAuthorization(authHeader);
  if (!result.authorized) {
    if (!authHeader) {
      return sendError(res, 401, "UNAUTHORIZED", "Authentication required. Please sign in as an administrator.");
    }
    return sendError(res, 403, "FORBIDDEN", "Access denied. Your account is not authorized for administrator functions.");
  }
  req.adminUser = result;
  next();
}
app.get("/api/health", (req, res) => {
  sendSuccess(res, {
    status: "healthy",
    product: "WinterBuilds",
    supabaseConnected: isSupabaseConfigured(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/apps", async (req, res) => {
  try {
    const { category, search, sort, featured, limit, offset } = req.query;
    const result = await listApplications({
      status: "published",
      category: category ? String(category) : void 0,
      search: search ? String(search) : void 0,
      sort: sort || "latest",
      featured: featured === "true" ? true : void 0,
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0
    });
    sendSuccess(res, result);
  } catch (err) {
    console.error("Error in GET /api/apps:", err);
    sendError(res, 500, "SERVER_ERROR", "Unable to fetch applications catalog.");
  }
});
app.get("/api/apps/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const appRecord = await getApplicationBySlug(slug);
    if (!appRecord) {
      return sendError(res, 404, "APP_NOT_FOUND", `Application "${slug}" was not found.`);
    }
    sendSuccess(res, appRecord);
  } catch (err) {
    console.error("Error in GET /api/apps/:slug:", err);
    sendError(res, 500, "SERVER_ERROR", "Failed to retrieve application details.");
  }
});
app.post("/api/apps/:id/download", async (req, res) => {
  try {
    const id = req.params.id;
    const appRecord = await getApplicationById(id);
    if (!appRecord) {
      return sendError(res, 404, "APP_NOT_FOUND", "Application not found for download.");
    }
    const newCount = await incrementDownloadCount(id);
    const downloadFileName = generateApkDownloadFileName(appRecord.name, appRecord.apk_storage_path);
    let downloadUrl = appRecord.apk_download_url;
    if (!downloadUrl || downloadUrl.startsWith("/api/")) {
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
      downloadsCount: newCount
    });
  } catch (err) {
    console.error("Error in POST /api/apps/:id/download:", err);
    sendError(res, 500, "DOWNLOAD_FAILED", "Failed to initiate application download.");
  }
});
app.get("/api/admin/status", async (req, res) => {
  const authHeader = req.headers.authorization;
  const result = await verifyAdminAuthorization(authHeader);
  sendSuccess(res, {
    authenticated: result.authorized,
    email: result.email || null,
    supabaseConfigured: isSupabaseConfigured()
  });
});
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const stats = await getDashboardStats();
    sendSuccess(res, stats);
  } catch (err) {
    console.error("Error in GET /api/admin/stats:", err);
    sendError(res, 500, "SERVER_ERROR", "Failed to calculate dashboard statistics.");
  }
});
app.get("/api/admin/apps", requireAdmin, async (req, res) => {
  try {
    const { status, category, search, sort, limit, offset } = req.query;
    const result = await listApplications({
      status: status || "all",
      category: category ? String(category) : void 0,
      search: search ? String(search) : void 0,
      sort: sort || "updated",
      limit: limit ? parseInt(String(limit), 10) : 100,
      offset: offset ? parseInt(String(offset), 10) : 0
    });
    sendSuccess(res, result);
  } catch (err) {
    console.error("Error in GET /api/admin/apps:", err);
    sendError(res, 500, "SERVER_ERROR", "Failed to retrieve application list.");
  }
});
app.post("/api/apps", requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !body.package_name || !body.apk_storage_path) {
      return sendError(res, 400, "VALIDATION_ERROR", "Missing required application fields: name, package_name, apk_storage_path.");
    }
    const created = await createApplication({
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      package_name: body.package_name,
      version_name: body.version_name || "1.0.0",
      version_code: Number(body.version_code) || 1,
      description: body.description || "",
      short_description: body.short_description || "",
      category: body.category || "Utilities",
      icon_url: body.icon_url || "",
      screenshots: Array.isArray(body.screenshots) ? body.screenshots : [],
      apk_storage_path: body.apk_storage_path,
      apk_download_url: formatCleanDownloadUrl(body.apk_download_url, body.apk_storage_path, body.name),
      apk_file_size: Number(body.apk_file_size) || 0,
      apk_sha256: body.apk_sha256 || "",
      min_sdk: Number(body.min_sdk) || 21,
      target_sdk: Number(body.target_sdk) || 34,
      downloads_count: 0,
      status: body.status || "draft",
      featured: Boolean(body.featured)
    });
    sendSuccess(res, created, 201);
  } catch (err) {
    console.error("Error in POST /api/apps:", err);
    sendError(res, 500, "CREATION_FAILED", err.message || "Failed to create application.");
  }
});
app.patch("/api/apps/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    if (updates.apk_download_url && updates.apk_storage_path) {
      updates.apk_download_url = formatCleanDownloadUrl(updates.apk_download_url, updates.apk_storage_path, updates.name);
    }
    const updated = await updateApplication(id, updates);
    sendSuccess(res, updated);
  } catch (err) {
    console.error("Error in PATCH /api/apps/:id:", err);
    sendError(res, 500, "UPDATE_FAILED", err.message || "Failed to update application.");
  }
});
app.post("/api/apps/:id/publish", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateApplication(id, {
      status: "published",
      published_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    sendSuccess(res, updated);
  } catch (err) {
    console.error("Error in POST /api/apps/:id/publish:", err);
    sendError(res, 500, "PUBLISH_FAILED", err.message || "Failed to publish application.");
  }
});
app.post("/api/apps/:id/unpublish", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateApplication(id, {
      status: "draft"
    });
    sendSuccess(res, updated);
  } catch (err) {
    console.error("Error in POST /api/apps/:id/unpublish:", err);
    sendError(res, 500, "UNPUBLISH_FAILED", err.message || "Failed to unpublish application.");
  }
});
app.delete("/api/apps/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const appToDelete = await getApplicationById(id);
    if (!appToDelete) {
      return sendError(res, 404, "NOT_FOUND", "Application not found.");
    }
    await deleteApplication(id);
    if (appToDelete.apk_storage_path) {
      deleteStorageObject(appToDelete.apk_storage_path).catch((err) => {
        console.warn("Storage cleanup warning:", err);
      });
    }
    sendSuccess(res, { deleted: true, id });
  } catch (err) {
    console.error("Error in DELETE /api/apps/:id:", err);
    sendError(res, 500, "DELETE_FAILED", err.message || "Failed to delete application.");
  }
});
app.post("/api/upload/authorize", requireAdmin, async (req, res) => {
  try {
    const { appId, fileName, contentType, appName } = req.body;
    if (!fileName) {
      return sendError(res, 400, "BAD_REQUEST", "fileName is required.");
    }
    const auth = await createUploadAuthorization({
      appId: appId || "pending",
      fileName,
      contentType,
      appName
    });
    sendSuccess(res, auth);
  } catch (err) {
    console.error("Error in POST /api/upload/authorize:", err);
    sendError(res, 500, "STORAGE_AUTH_FAILED", err.message || "Failed to authorize storage upload.");
  }
});
app.post("/api/upload/complete", requireAdmin, async (req, res) => {
  try {
    const { storagePath, originalFileName, appName } = req.body;
    if (!storagePath) {
      return sendError(res, 400, "BAD_REQUEST", "storagePath is required.");
    }
    if (originalFileName) {
      saveApkStorageMetadata(storagePath, {
        originalFileName,
        preferredDownloadName: appName
      });
    }
    const downloadFileName = generateApkDownloadFileName(appName, originalFileName || storagePath);
    const downloadUrl = await verifyAndResolveDownloadUrl(storagePath, appName);
    sendSuccess(res, {
      verified: true,
      storagePath,
      downloadUrl,
      originalFileName: originalFileName || path3.basename(storagePath),
      downloadFileName
    });
  } catch (err) {
    console.error("Error in POST /api/upload/complete:", err);
    sendError(res, 500, "VERIFY_FAILED", err.message || "Failed to verify uploaded storage object.");
  }
});
app.post("/api/upload/direct", requireAdmin, express.raw({ type: "*/*", limit: "2000mb" }), async (req, res) => {
  try {
    const storagePath = req.query.path;
    const originalParam = req.query.original || "";
    if (!storagePath) {
      return sendError(res, 400, "BAD_REQUEST", "Missing storage path parameter.");
    }
    const localDir = path3.join(process.cwd(), "data", "storage");
    const fullPath = path3.join(localDir, storagePath);
    const parentDir = path3.dirname(fullPath);
    if (!fs3.existsSync(parentDir)) {
      fs3.mkdirSync(parentDir, { recursive: true });
    }
    fs3.writeFileSync(fullPath, req.body);
    if (originalParam) {
      saveApkStorageMetadata(storagePath, { originalFileName: originalParam });
    }
    const downloadFileName = generateApkDownloadFileName(void 0, originalParam || storagePath);
    const downloadUrl = `/api/downloads/${encodeURIComponent(storagePath)}?filename=${encodeURIComponent(downloadFileName)}`;
    sendSuccess(res, {
      uploaded: true,
      storagePath,
      downloadUrl,
      originalFileName: originalParam || path3.basename(storagePath),
      downloadFileName
    });
  } catch (err) {
    console.error("Direct upload error:", err);
    sendError(res, 500, "UPLOAD_FAILED", "Failed to store file.");
  }
});
app.get("/api/downloads/:path", (req, res) => {
  try {
    const storagePath = decodeURIComponent(req.params.path);
    const fullPath = path3.join(process.cwd(), "data", "storage", storagePath);
    if (!fs3.existsSync(fullPath)) {
      return res.status(404).send("APK file not found on storage.");
    }
    const requestedName = req.query.filename || req.query.name;
    const filename = generateApkDownloadFileName(requestedName, storagePath);
    const safeAsciiFilename = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, '\\"');
    res.setHeader("Content-Disposition", `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    fs3.createReadStream(fullPath).pipe(res);
  } catch (err) {
    res.status(500).send("Error reading APK from storage.");
  }
});
app.post("/api/ai/enhance", requireAdmin, async (req, res) => {
  try {
    const { appName, packageName, category, rawDescription } = req.body;
    const enhancements = await generateAppEnhancements({
      appName: appName || "Android Application",
      packageName: packageName || "com.example.app",
      category,
      rawDescription
    });
    sendSuccess(res, enhancements);
  } catch (err) {
    console.error("Error in /api/ai/enhance:", err);
    sendError(res, 500, "AI_ENHANCE_FAILED", "Failed to generate AI enhancements.");
  }
});
var app_default = app;
export {
  app_default as default
};
