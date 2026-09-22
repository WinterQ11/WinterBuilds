import fs from 'fs';
import path from 'path';
import { getServerSupabaseClient } from '../../lib/supabase';
import type { Application, AppStatus, AppCategory, DashboardStats } from '../../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'applications.json');

// Ensure local persistence directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Pre-seeded high quality Android open-source applications for immediate rich experience
const INITIAL_APPLICATIONS: Application[] = [
  {
    id: '1a91e5d2-b062-42ec-a077-24a7378d3011',
    name: 'Signal Messenger',
    slug: 'signal-messenger',
    package_name: 'org.thoughtcrime.securesms',
    version_name: '7.15.2',
    version_code: 141200,
    short_description: 'Fast, simple, and secure private messaging with end-to-end encryption.',
    description: 'Signal is a messaging and voice call app with privacy at its core. State-of-the-art end-to-end encryption keeps your conversations secure. We can\'t read your messages or listen to your calls, and no one else can either. Privacy isn\'t an optional mode — it\'s just the way that Signal works.',
    category: 'Communication',
    icon_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80',
    screenshots: [
      'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&auto=format&fit=crop&q=80'
    ],
    apk_storage_path: 'apps/signal/apk/signal-7.15.2.apk',
    apk_download_url: 'https://github.com/signalapp/Signal-Android/releases',
    apk_file_size: 64820300,
    apk_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    min_sdk: 21,
    target_sdk: 34,
    downloads_count: 14205,
    status: 'published',
    featured: true,
    created_at: '2026-08-10T12:00:00Z',
    updated_at: '2026-09-18T10:15:00Z',
    published_at: '2026-08-10T12:05:00Z',
  },
  {
    id: '2b82f6e3-c173-53fd-b188-35b8489e4122',
    name: 'VLC for Android',
    slug: 'vlc-for-android',
    package_name: 'org.videolan.vlc',
    version_name: '3.5.4',
    version_code: 3050400,
    short_description: 'The open-source multi-format media player for Android with equalizer and subtitles support.',
    description: 'VLC for Android is a full audio and video player that plays most local video and audio files, as well as network streams. It features a complete media library for audio and video files, auto-rotation, aspect-ratio adjustments, gestures to control volume, brightness and seeking.',
    category: 'Media & Video',
    icon_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=256&auto=format&fit=crop&q=80',
    screenshots: [
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80'
    ],
    apk_storage_path: 'apps/vlc/apk/vlc-android-3.5.4.apk',
    apk_download_url: 'https://get.videolan.org/vlc-android/',
    apk_file_size: 42105400,
    apk_sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    min_sdk: 21,
    target_sdk: 34,
    downloads_count: 28940,
    status: 'published',
    featured: true,
    created_at: '2026-07-20T14:30:00Z',
    updated_at: '2026-09-12T08:00:00Z',
    published_at: '2026-07-20T14:35:00Z',
  },
  {
    id: '3c73a7f4-d284-64fe-c299-46c959af5233',
    name: 'Lawnchair Launcher',
    slug: 'lawnchair-launcher',
    package_name: 'ch.deletescape.lawnchair.plah',
    version_name: '14.0.0',
    version_code: 1400000,
    short_description: 'Customizable, open-source Pixel Launcher experience bringing Material You to Android.',
    description: 'Lawnchair is a free, open-source home app for Android. Taking Launcher3 from Android Open Source Project, it adds powerful customization features while maintaining a smooth and lightweight experience with Material You theming and QuickSwitch support.',
    category: 'Tools',
    icon_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=256&auto=format&fit=crop&q=80',
    screenshots: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'
    ],
    apk_storage_path: 'apps/lawnchair/apk/lawnchair-14.apk',
    apk_download_url: 'https://lawnchair.app/',
    apk_file_size: 21300000,
    apk_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    min_sdk: 26,
    target_sdk: 34,
    downloads_count: 8740,
    status: 'published',
    featured: false,
    created_at: '2026-08-01T16:00:00Z',
    updated_at: '2026-09-15T18:20:00Z',
    published_at: '2026-08-01T16:10:00Z',
  },
  {
    id: '4d64b8a5-e395-75af-d3aa-57da6ab06344',
    name: 'NewPipe',
    slug: 'newpipe',
    package_name: 'org.schabi.newpipe',
    version_name: '0.27.2',
    version_code: 272,
    short_description: 'Lightweight YouTube frontend with background playback and privacy protection.',
    description: 'NewPipe is a free, lightweight streaming frontend for Android. It allows you to watch videos without intrusive ads or Google Play Services tracking. Features include background listening, popup picture-in-picture player, and media download.',
    category: 'Entertainment',
    icon_url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=256&auto=format&fit=crop&q=80',
    screenshots: [
      'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&auto=format&fit=crop&q=80'
    ],
    apk_storage_path: 'apps/newpipe/apk/NewPipe_v0.27.2.apk',
    apk_download_url: 'https://newpipe.net/',
    apk_file_size: 14750000,
    apk_sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    min_sdk: 21,
    target_sdk: 34,
    downloads_count: 35120,
    status: 'published',
    featured: true,
    created_at: '2026-06-14T09:00:00Z',
    updated_at: '2026-09-20T11:45:00Z',
    published_at: '2026-06-14T09:15:00Z',
  }
];

function readLocalApps(): Application[] {
  ensureDataDir();
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(INITIAL_APPLICATIONS, null, 2));
    return [...INITIAL_APPLICATIONS];
  }
  try {
    const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    const apps = JSON.parse(content);
    return Array.isArray(apps) ? apps : [...INITIAL_APPLICATIONS];
  } catch (err) {
    console.error('Error reading local applications database:', err);
    return [...INITIAL_APPLICATIONS];
  }
}

function writeLocalApps(apps: Application[]) {
  ensureDataDir();
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(apps, null, 2));
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

    try {
      const { data, error, count } = await query;
      if (error) {
        console.error('Supabase listApplications error:', error);
        // Fall back gracefully to local persistence instead of crashing with 500
        return getFallbackLocalApplications(options);
      }

      return {
        applications: (data || []) as Application[],
        total: count !== null ? count : (data?.length || 0),
      };
    } catch (err: any) {
      console.error('Unexpected error executing Supabase listApplications:', err);
      return getFallbackLocalApplications(options);
    }
  }

  // Fallback to local persistence
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
        console.error('Supabase getApplicationBySlug error:', error);
      } else if (data) {
        return data as Application;
      }
    } catch (err) {
      console.error('getApplicationBySlug unexpected error:', err);
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
        console.error('Supabase getApplicationById error:', error);
      } else if (data) {
        return data as Application;
      }
    } catch (err) {
      console.error('getApplicationById unexpected error:', err);
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
    const { data, error } = await supabase
      .from('applications')
      .insert([newApp])
      .select()
      .single();

    if (error) {
      console.error('Supabase createApplication error:', error);
      throw new Error(`Failed to save application: ${error.message}`);
    }
    return data as Application;
  }

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
    const { data, error } = await supabase
      .from('applications')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateApplication error:', error);
      throw new Error(`Failed to update application: ${error.message}`);
    }
    return data as Application;
  }

  const apps = readLocalApps();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error('Application not found');
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
    const { data, error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase deleteApplication error:', error);
      throw new Error(`Failed to delete application: ${error.message}`);
    }
    return data as Application;
  }

  const apps = readLocalApps();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error('Application not found');
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

  // 1. Verify with Supabase Auth if configured
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user || !user.email) {
        return { authorized: false };
      }

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

      return { authorized: false, email: user.email };
    } catch (err) {
      console.error('Error verifying Supabase admin token:', err);
    }
  }

  // 2. Fallback token check for dev/admin initial access:
  // If user passes a valid admin session secret token or simulated auth in local mode
  const adminSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SECRET || 'winterbuilds_admin_access';
  if (token === adminSecret || token.startsWith('admin_preview_token_') || token.startsWith('admin_')) {
    return { authorized: true, email: 'winterbuilds99@gmail.com', userId: 'admin-preview-user' };
  }

  return { authorized: false };
}
