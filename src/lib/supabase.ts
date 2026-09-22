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

// Browser-accessible public environment variables (clean project base URL ONLY)
const rawUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || process.env.VITE_SUPABASE_URL || '';
const rawAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || process.env.VITE_SUPABASE_ANON_KEY || '';

const SUPABASE_URL = normalizeSupabaseUrl(rawUrl);
const SUPABASE_ANON_KEY = normalizeSupabaseKey(rawAnonKey);

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

/**
 * Returns true if public Supabase credentials are provided and valid.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project-ref'));
}

/**
 * Returns the client-side Supabase client (used for Supabase Auth and public queries).
 * Lazy-initialized to prevent runtime crashes when credentials are not yet configured.
 * Receives the project base URL directly so Supabase Auth targets /auth/v1/token
 * and database queries automatically target /rest/v1/...
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    try {
      browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error('Failed to initialize browser Supabase client:', err);
      return null;
    }
  }

  return browserClient;
}

/**
 * Server-side Supabase client using the SERVICE ROLE secret key.
 * Only callable in server environments (Express, Vercel Serverless).
 */
export function getServerSupabaseClient(): SupabaseClient | null {
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
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.error('Failed to initialize server Supabase client:', err);
      return null;
    }
  }

  return serverClient;
}

