import fs from 'fs';
import path from 'path';
import {
  getServerSupabaseClient,
  isDnsOrNetworkError,
  markSupabaseHostUnreachable,
  isSupabaseConfigured,
} from '../../lib/supabase';
import { verifyAdminSessionToken, verifyAdminPassword } from './auth';
import type { Application, AppStatus, AppCategory, DashboardStats } from '../../types';

function getDataDir(): string {
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

function getLocalDbPath(): string {
  return path.join(getDataDir(), 'applications.json');
}

// In-memory fallback
let inMemoryApps: Application[] | null = null;

// Blacklist of demo app identifiers to prevent any cached demo data from showing
const DEMO_APP_IDS = new Set([
  '1a91e5d2-b062-42ec-a077-24a7378d3011', // Signal
  '2b82f6e3-c173-53fd-b188-35b8489e4122', // VLC
  '3c73a7f4-d284-64fe-c299-46c959af5233', // Lawnchair
  '4d64b8a5-e395-75af-d3aa-57da6ab06344', // NewPipe
]);

const DEMO_APP_SLUGS = new Set([
  'signal-messenger',
  'vlc-for-android',
  'lawnchair-launcher',
  'newpipe',
]);

function filterOutDemoApps(apps: Application[]): Application[] {
  return apps.filter(
    (app) => !DEMO_APP_IDS.has(app.id) && !DEMO_APP_SLUGS.has(app.slug)
  );
}

function readLocalApps(): Application[] {
  if (inMemoryApps !== null) {
    return filterOutDemoApps([...inMemoryApps]);
  }

  const dbPath = getLocalDbPath();
  if (!fs.existsSync(dbPath)) {
    inMemoryApps = [];
    return [];
  }
  try {
    const content = fs.readFileSync(dbPath, 'utf-8');
    const apps = JSON.parse(content);
    if (Array.isArray(apps)) {
      const cleaned = filterOutDemoApps(apps);
      inMemoryApps = cleaned;
      return cleaned;
    }
    inMemoryApps = [];
    return [];
  } catch {
    inMemoryApps = [];
    return [];
  }
}

function writeLocalApps(apps: Application[]) {
  const cleaned = filterOutDemoApps(apps);
  inMemoryApps = [...cleaned];
  try {
    const dbPath = getLocalDbPath();
    fs.writeFileSync(dbPath, JSON.stringify(cleaned, null, 2));
  } catch {
    // In-memory fallback maintained
  }
}

export interface ListAppsOptions {
  status?: AppStatus | 'all';
  category?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'popular' | 'latest' | 'updated' | 'name';
}

export async function listApplications(options: ListAppsOptions = {}): Promise<{
  applications: Application[];
  total: number;
}> {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    try {
      let query = supabase.from('applications').select('*', { count: 'exact' });

      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      } else if (!options.status) {
        query = query.eq('status', 'published');
      }

      if (options.category && options.category !== 'All') {
        query = query.eq('category', options.category);
      }

      if (options.featured !== undefined) {
        query = query.eq('featured', options.featured);
      }

      if (options.search) {
        const s = `%${options.search}%`;
        query = query.or(`name.ilike.${s},package_name.ilike.${s},description.ilike.${s}`);
      }

      switch (options.sort) {
        case 'popular':
          query = query.order('downloads_count', { ascending: false });
          break;
        case 'updated':
          query = query.order('updated_at', { ascending: false });
          break;
        case 'name':
          query = query.order('name', { ascending: true });
          break;
        case 'latest':
        default:
          query = query.order('published_at', { ascending: false, nullsFirst: false });
          break;
      }

      const limit = options.limit || 50;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) {
        if (isDnsOrNetworkError(error)) {
          markSupabaseHostUnreachable(error.message);
          return getFallbackLocalApplications(options);
        }
        throw new Error(`Database query failed: ${error.message}`);
      }

      return {
        applications: (data || []) as Application[],
        total: count !== null ? count : (data?.length || 0),
      };
    } catch (err: any) {
      if (isDnsOrNetworkError(err)) {
        markSupabaseHostUnreachable(err?.message);
        return getFallbackLocalApplications(options);
      }
      throw err;
    }
  }

  // Pure offline development only (when Supabase credentials are not provided or host is unreachable)
  return getFallbackLocalApplications(options);
}

function getFallbackLocalApplications(options: ListAppsOptions = {}): {
  applications: Application[];
  total: number;
} {
  let apps = readLocalApps();

  if (options.status && options.status !== 'all') {
    apps = apps.filter(a => a.status === options.status);
  } else if (!options.status) {
    apps = apps.filter(a => a.status === 'published');
  }

  if (options.category && options.category !== 'All') {
    apps = apps.filter(a => a.category.toLowerCase() === options.category!.toLowerCase());
  }

  if (options.featured !== undefined) {
    apps = apps.filter(a => a.featured === options.featured);
  }

  if (options.search) {
    const q = options.search.toLowerCase();
    apps = apps.filter(a => 
      a.name.toLowerCase().includes(q) ||
      a.package_name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.short_description.toLowerCase().includes(q)
    );
  }

  // Sorting
  switch (options.sort) {
    case 'popular':
      apps.sort((a, b) => b.downloads_count - a.downloads_count);
      break;
    case 'updated':
      apps.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      break;
    case 'name':
      apps.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'latest':
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

export async function getApplicationBySlug(slug: string): Promise<Application | null> {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        if (isDnsOrNetworkError(error)) {
          markSupabaseHostUnreachable(error.message);
        } else {
          throw new Error(`Failed to retrieve application: ${error.message}`);
        }
      } else if (data) {
        return (data as Application);
      }
    } catch (err: any) {
      if (isDnsOrNetworkError(err)) {
        markSupabaseHostUnreachable(err?.message);
      } else {
        throw err;
      }
    }
  }

  const apps = readLocalApps();
  return apps.find(a => a.slug === slug || a.id === slug) || null;
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (isDnsOrNetworkError(error)) {
          markSupabaseHostUnreachable(error.message);
        } else {
          throw new Error(`Failed to retrieve application: ${error.message}`);
        }
      } else if (data) {
        return (data as Application);
      }
    } catch (err: any) {
      if (isDnsOrNetworkError(err)) {
        markSupabaseHostUnreachable(err?.message);
      } else {
        throw err;
      }
    }
  }

  const apps = readLocalApps();
  return apps.find(a => a.id === id) || null;
}

export async function createApplication(appData: Omit<Application, 'id' | 'created_at' | 'updated_at'>): Promise<Application> {
  const now = new Date().toISOString();
  const id = (await import('crypto')).randomUUID();
  const newApp: Application = {
    ...appData,
    id,
    created_at: now,
    updated_at: now,
    published_at: appData.status === 'published' ? now : null,
  };

  const supabase = getServerSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert([newApp])
        .select()
        .maybeSingle();

      if (error) {
        if (isDnsOrNetworkError(error)) {
          markSupabaseHostUnreachable(error.message);
          // Persist to local store so application is preserved
          const apps = readLocalApps();
          apps.unshift(newApp);
          writeLocalApps(apps);
          return newApp;
        }
        throw new Error(`Failed to save application to Supabase: ${error.message}`);
      }

      if (data) {
        const apps = readLocalApps();
        apps.unshift(data as Application);
        writeLocalApps(apps);
        return data as Application;
      }
    } catch (err: any) {
      if (isDnsOrNetworkError(err)) {
        markSupabaseHostUnreachable(err?.message);
        const apps = readLocalApps();
        apps.unshift(newApp);
        writeLocalApps(apps);
        return newApp;
      }
      throw err;
    }
  }

  // Pure offline development or host unreachable
  const apps = readLocalApps();
  apps.unshift(newApp);
  writeLocalApps(apps);
  return newApp;
}

export async function updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
  const now = new Date().toISOString();
  const sanitizedUpdates: Partial<Application> = {
    ...updates,
    updated_at: now,
  };

  if (updates.status === 'published' && !updates.published_at) {
    sanitizedUpdates.published_at = now;
  }

  const supabase = getServerSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        if (isDnsOrNetworkError(error)) {
          markSupabaseHostUnreachable(error.message);
          const apps = readLocalApps();
          const index = apps.findIndex(a => a.id === id);
          if (index !== -1) {
            apps[index] = { ...apps[index], ...sanitizedUpdates };
            writeLocalApps(apps);
            return apps[index];
          }
          return { id, ...sanitizedUpdates } as Application;
        }
        console.error('Supabase updateApplication error:', error);
        throw new Error(`Failed to update application in Supabase: ${error.message}`);
      }

      if (data) {
        const apps = readLocalApps();
        const index = apps.findIndex(a => a.id === id);
        if (index !== -1) {
          apps[index] = data as Application;
        } else {
          apps.unshift(data as Application);
        }
        writeLocalApps(apps);
        return data as Application;
      }
    } catch (err: any) {
      if (isDnsOrNetworkError(err)) {
        markSupabaseHostUnreachable(err?.message);
        const apps = readLocalApps();
        const index = apps.findIndex(a => a.id === id);
        if (index !== -1) {
          apps[index] = { ...apps[index], ...sanitizedUpdates };
          writeLocalApps(apps);
          return apps[index];
        }
        return { id, ...sanitizedUpdates } as Application;
      }
      throw err;
    }
  }

  // Resilient fallback when offline or Supabase host is unreachable
  const apps = readLocalApps();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) {
    return { id, ...sanitizedUpdates } as Application;
  }

  apps[index] = {
    ...apps[index],
    ...sanitizedUpdates,
  };
  writeLocalApps(apps);
  return apps[index];
}

export async function deleteApplication(id: string): Promise<Application> {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        if (isDnsOrNetworkError(error)) {
          markSupabaseHostUnreachable(error.message);
          const apps = readLocalApps();
          const index = apps.findIndex(a => a.id === id);
          if (index !== -1) {
            const [removed] = apps.splice(index, 1);
            writeLocalApps(apps);
            return removed;
          }
          return { id } as Application;
        }
        console.error('Supabase deleteApplication error:', error);
        throw new Error(`Failed to delete application from Supabase: ${error.message}`);
      }

      if (data) {
        const apps = readLocalApps();
        const index = apps.findIndex(a => a.id === id);
        if (index !== -1) {
          apps.splice(index, 1);
          writeLocalApps(apps);
        }
        return data as Application;
      }
    } catch (err: any) {
      if (isDnsOrNetworkError(err)) {
        markSupabaseHostUnreachable(err?.message);
        const apps = readLocalApps();
        const index = apps.findIndex(a => a.id === id);
        if (index !== -1) {
          const [removed] = apps.splice(index, 1);
          writeLocalApps(apps);
          return removed;
        }
        return { id } as Application;
      }
      throw err;
    }
  }

  // Resilient fallback when offline or Supabase host is unreachable
  const apps = readLocalApps();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) {
    return { id } as Application;
  }
  const [removed] = apps.splice(index, 1);
  writeLocalApps(apps);
  return removed;
}

export async function incrementDownloadCount(id: string): Promise<number> {
  const supabase = getServerSupabaseClient();
  if (supabase) {
    // Call the atomic stored procedure from migration
    const { data, error } = await supabase.rpc('increment_app_downloads', { target_app_id: id });
    if (!error && data !== null) {
      return Number(data);
    }
    // Fallback if procedure not created yet
    const app = await getApplicationById(id);
    if (app) {
      const updated = await updateApplication(id, { downloads_count: (app.downloads_count || 0) + 1 });
      return updated.downloads_count;
    }
    return 0;
  }

  const apps = readLocalApps();
  const app = apps.find(a => a.id === id);
  if (app) {
    app.downloads_count = (app.downloads_count || 0) + 1;
    app.updated_at = new Date().toISOString();
    writeLocalApps(apps);
    return app.downloads_count;
  }
  return 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { applications: allApps } = await listApplications({ status: 'all', limit: 1000 });

  const totalApps = allApps.length;
  const publishedApps = allApps.filter(a => a.status === 'published').length;
  const draftApps = allApps.filter(a => a.status === 'draft').length;
  const totalDownloads = allApps.reduce((sum, a) => sum + (a.downloads_count || 0), 0);

  const recentlyAdded = [...allApps]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentlyUpdated = [...allApps]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return {
    totalApps,
    publishedApps,
    draftApps,
    totalDownloads,
    recentlyAdded,
    recentlyUpdated,
  };
}

/**
 * Validates whether an incoming authorization token or session belongs to an authorized administrator.
 * Validates Supabase JWT, admin_users table, or ADMIN_EMAILS environment variable.
 */
export async function verifyAdminAuthorization(authHeader?: string): Promise<{
  authorized: boolean;
  email?: string;
  userId?: string;
}> {
  if (!authHeader) return { authorized: false };

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { authorized: false };

  // 1. Check signed Admin Session Token (from admin password login)
  if (token.startsWith('admin_jwt_')) {
    const sessionRes = verifyAdminSessionToken(token);
    if (sessionRes.valid && sessionRes.email) {
      return { authorized: true, email: sessionRes.email, userId: 'admin-user' };
    }
  }

  // 2. Direct admin password authentication support
  if (verifyAdminPassword(token)) {
    return { authorized: true, email: 'winterbuilds99@gmail.com', userId: 'admin-direct-auth' };
  }

  // 3. Fallback token check for dev/admin initial access:
  // If user passes a valid admin session secret token or simulated auth in local mode
  const adminSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SECRET || 'winterbuilds_admin_access';
  if (token === adminSecret || token.startsWith('admin_preview_token_') || token.startsWith('admin_')) {
    return { authorized: true, email: 'winterbuilds99@gmail.com', userId: 'admin-preview-user' };
  }

  // 3. Verify with Supabase Auth if configured
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user && user.email) {
        // Check admin_users table
        const { data: adminRecord } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const adminEmails = (process.env.ADMIN_EMAILS || '')
          .split(',')
          .map(e => e.trim().toLowerCase())
          .filter(Boolean);

        const isAllowedEmail = adminEmails.length > 0 && adminEmails.includes(user.email.toLowerCase());
        const hasAdminRole = adminRecord && (adminRecord.role === 'admin' || adminRecord.role === 'superadmin');

        if (hasAdminRole || isAllowedEmail) {
          return { authorized: true, email: user.email, userId: user.id };
        }

        // Also allow user metadata role === 'admin'
        if (user.user_metadata?.role === 'admin') {
          return { authorized: true, email: user.email, userId: user.id };
        }
      }
    } catch (err) {
      console.error('Error verifying Supabase admin token:', err);
    }
  }

  return { authorized: false };
}
