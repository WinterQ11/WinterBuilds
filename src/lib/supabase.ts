import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Normalizes Supabase URL to ensure it is strictly the project base URL
 * (e.g. https://<project-ref>.supabase.co), without any /rest/v1 path,
 * trailing slashes, or accidental assignment prefixes.
 */
export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let cleaned = String(rawUrl).trim();

  // Strip accidental "VITE_SUPABASE_URL=" or "SUPABASE_URL=" variable assignment prefix if entered by user
  if (cleaned.startsWith('VITE_SUPABASE_URL=')) {
    cleaned = cleaned.replace(/^VITE_SUPABASE_URL=/, '').trim();
  }
  if (cleaned.startsWith('SUPABASE_URL=')) {
    cleaned = cleaned.replace(/^SUPABASE_URL=/, '').trim();
  }

  // Strip wrapping quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  // Remove any trailing /rest/v1, /rest, or trailing slashes
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/rest\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');

  try {
    const parsed = new URL(cleaned);
    // Origin provides strictly "https://<subdomain>.supabase.co" without any subpaths
    return parsed.origin;
  } catch {
    return cleaned;
  }
}

/**
 * Normalizes Supabase API keys to remove accidental prefixes or quotes.
 */
export function normalizeSupabaseKey(rawKey?: string): string {
  if (!rawKey) return '';
  let cleaned = String(rawKey).trim();
  if (cleaned.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    cleaned = cleaned.replace(/^VITE_SUPABASE_ANON_KEY=/, '').trim();
  }
  if (cleaned.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    cleaned = cleaned.replace(/^SUPABASE_SERVICE_ROLE_KEY=/, '').trim();
  }
  return cleaned.replace(/^["']|["']$/g, '').trim();
}

export function getSupabaseUrl(): string {
  const raw =
    (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_URL || (import.meta.env as any)?.SUPABASE_URL)) ||
    '';
  return normalizeSupabaseUrl(raw);
}

export function getSupabaseAnonKey(): string {
  const raw =
    (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_ANON_KEY || (import.meta.env as any)?.SUPABASE_ANON_KEY)) ||
    '';
  return normalizeSupabaseKey(raw);
}

export function getSupabaseServiceRoleKey(): string {
  const raw =
    (typeof process !== 'undefined' && (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    )) ||
    '';
  return normalizeSupabaseKey(raw);
}

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

// Circuit-breaker for unreachable or invalid Supabase project hosts
let supabaseHostReachable: boolean = true;
let lastReachabilityCheck: number = 0;
const RETRY_INTERVAL_MS = 60000; // Retry once per minute if unreachable

let lastVerifiedConnected: boolean | null = null;
let lastVerifiedError: string | null = null;
let lastVerifiedTime: number = 0;
const VERIFY_CACHE_TTL_MS = 15000; // Cache connection verification for 15 seconds

/**
 * Determines whether an error is caused by DNS resolution failure, network timeout,
 * or host unreachability (e.g. paused/deleted/invalid Supabase project).
 */
export function isDnsOrNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === 'string'
    ? err
    : `${err.message || ''} ${err.details || ''} ${err.code || ''} ${JSON.stringify(err)}`;
  return (
    msg.includes('ENOTFOUND') ||
    msg.includes('getaddrinfo') ||
    msg.includes('fetch failed') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('UND_ERR_CONNECT_TIMEOUT')
  );
}

/**
 * Marks the Supabase host as unreachable so subsequent operations fail fast.
 */
export function markSupabaseHostUnreachable(errorReason?: string): void {
  supabaseHostReachable = false;
  lastVerifiedConnected = false;
  lastVerifiedError = errorReason || 'Host unreachable';
  lastReachabilityCheck = Date.now();
}

/**
 * Marks the Supabase host as reachable again.
 */
export function markSupabaseHostReachable(): void {
  supabaseHostReachable = true;
  lastVerifiedConnected = true;
  lastVerifiedError = null;
}

/**
 * Returns true if public Supabase credentials are provided and valid.
 */
export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  const service = getSupabaseServiceRoleKey();
  return Boolean(url && (anon || service) && !url.includes('your-project-ref'));
}

/**
 * Returns true if Supabase host is currently verified operational.
 */
export function isSupabaseConnected(): boolean {
  if (!isSupabaseConfigured()) return false;
  return lastVerifiedConnected === true && supabaseHostReachable;
}

/**
 * Actively checks and verifies Supabase connectivity against the applications table.
 * Returns true if the database responds, or false with the specific error.
 */
export async function verifySupabaseConnection(): Promise<{
  connected: boolean;
  configured: boolean;
  url: string;
  error?: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      configured: false,
      url: '',
      error: 'Supabase credentials are not configured in environment variables.',
    };
  }

  if (lastVerifiedTime > 0 && Date.now() - lastVerifiedTime < VERIFY_CACHE_TTL_MS && lastVerifiedConnected !== null) {
    return {
      connected: lastVerifiedConnected,
      configured: true,
      url: getSupabaseUrl(),
      error: lastVerifiedError,
    };
  }

  const client = getServerSupabaseClient();
  if (!client) {
    lastVerifiedConnected = false;
    lastVerifiedError = 'Failed to initialize Supabase client with provided credentials.';
    lastVerifiedTime = Date.now();
    return {
      connected: false,
      configured: true,
      url: getSupabaseUrl(),
      error: lastVerifiedError,
    };
  }

  try {
    const { error } = await client.from('applications').select('id').limit(1);
    lastVerifiedTime = Date.now();
    if (error) {
      if (isDnsOrNetworkError(error)) {
        markSupabaseHostUnreachable(error.message);
        return {
          connected: false,
          configured: true,
          url: getSupabaseUrl(),
          error: `Supabase host unreachable (${error.message}). If using the Free tier, please verify in the Supabase Dashboard that your project is not paused.`,
        };
      }
      lastVerifiedConnected = false;
      lastVerifiedError = `Supabase database error: ${error.message}`;
      return {
        connected: false,
        configured: true,
        url: getSupabaseUrl(),
        error: lastVerifiedError,
      };
    }
    markSupabaseHostReachable();
    return {
      connected: true,
      configured: true,
      url: getSupabaseUrl(),
      error: null,
    };
  } catch (err: any) {
    lastVerifiedTime = Date.now();
    markSupabaseHostUnreachable(err?.message);
    return {
      connected: false,
      configured: true,
      url: getSupabaseUrl(),
      error: `Supabase connection failed: ${err?.message || 'Network failure'}`,
    };
  }
}

/**
 * Returns the client-side Supabase client.
 * Returns null if Supabase is not configured or marked unreachable.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey() || getSupabaseServiceRoleKey();

  if (!url || !anonKey || url.includes('your-project-ref') || !supabaseHostReachable) {
    return null;
  }

  if (!browserClient) {
    try {
      browserClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch {
      return null;
    }
  }

  return browserClient;
}

/**
 * Server-side Supabase client using the SERVICE ROLE secret key (or anon key).
 * Only callable in server environments (Express, Vercel Serverless).
 * Returns null if Supabase is not configured or host is unreachable.
 */
export function getServerSupabaseClient(): SupabaseClient | null {
  const projectUrl = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey() || getSupabaseAnonKey();

  if (!projectUrl || !key || projectUrl.includes('your-project-ref')) {
    return null;
  }

  // Fast-fail if host was previously marked unreachable and retry interval hasn't elapsed
  if (!supabaseHostReachable) {
    if (Date.now() - lastReachabilityCheck < RETRY_INTERVAL_MS) {
      return null;
    }
    // Allow trying once after interval
    supabaseHostReachable = true;
  }

  if (!serverClient) {
    try {
      serverClient = createClient(projectUrl, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch {
      return null;
    }
  }

  return serverClient;
}
