import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Normalizes Supabase URL to ensure it is strictly a valid HTTPS project base URL
 * (e.g. https://<project-ref>.supabase.co), without any /rest/v1 path,
 * trailing slashes, quotes, or accidental variable assignment prefixes.
 */
export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let cleaned = String(rawUrl).trim().replace(/[\r\n\t]/g, '');

  // Strip accidental "NAME=" variable assignment prefix if pasted directly from .env
  const prefixes = [
    'VITE_SUPABASE_URL=',
    'SUPABASE_URL=',
    'NEXT_PUBLIC_SUPABASE_URL=',
    'SUPABASE_PROJECT_URL=',
  ];
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
    }
  }

  // Strip wrapping quotes and trailing semicolons
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  cleaned = cleaned.replace(/;$/, '').trim();

  // Remove any trailing /rest/v1, /rest, or trailing slashes
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/rest\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');

  // If user entered subdomain or host without protocol (e.g. "xyz.supabase.co")
  if (cleaned && !/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    return parsed.origin;
  } catch {
    return cleaned;
  }
}

/**
 * Normalizes Supabase API keys to remove accidental variable prefixes, quotes,
 * trailing semicolons, or comments.
 */
export function normalizeSupabaseKey(rawKey?: string): string {
  if (!rawKey) return '';
  let cleaned = String(rawKey).trim().replace(/[\r\n\t]/g, '');

  // Strip accidental "NAME=" variable assignment prefix if entered by user
  const keyPrefixes = [
    'VITE_SUPABASE_ANON_KEY=',
    'SUPABASE_ANON_KEY=',
    'SUPABASE_KEY=',
    'SUPABASE_SERVICE_ROLE_KEY=',
    'SUPABASE_SERVICE_KEY=',
    'SUPABASE_SECRET_KEY=',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=',
    'SUPABASE_PUBLISHABLE_KEY=',
    'VITE_SUPABASE_PUBLISHABLE_KEY=',
    'SUPABASE_PUBLIC_KEY=',
    'SERVICE_ROLE_KEY=',
    'ANON_KEY=',
  ];
  for (const prefix of keyPrefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
    }
  }

  // Strip leading Bearer keyword if accidentally included
  cleaned = cleaned.replace(/^Bearer\s+/i, '').trim();

  // Strip wrapping quotes and semicolons
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  cleaned = cleaned.replace(/;.*$/, '').trim(); // Remove semicolon and any trailing inline comment
  return cleaned;
}

/**
 * Resolves the Supabase Project URL across all supported standard naming conventions
 * in Node.js (process.env) and Browser (import.meta.env).
 */
export function getSupabaseUrl(): string {
  let raw = '';

  if (typeof process !== 'undefined' && process.env) {
    raw =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_PROJECT_URL ||
      process.env.SUPABASE_HOST ||
      '';
  }

  if (!raw && typeof import.meta !== 'undefined' && import.meta.env) {
    raw =
      import.meta.env.VITE_SUPABASE_URL ||
      (import.meta.env as any).SUPABASE_URL ||
      (import.meta.env as any).NEXT_PUBLIC_SUPABASE_URL ||
      (import.meta.env as any).SUPABASE_PROJECT_URL ||
      '';
  }

  return normalizeSupabaseUrl(raw);
}

/**
 * Resolves the public Supabase Anon/Publishable API key.
 * Safe for both browser and server environments.
 */
export function getSupabaseAnonKey(): string {
  let raw = '';

  if (typeof process !== 'undefined' && process.env) {
    raw =
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLIC_KEY ||
      process.env.ANON_KEY ||
      '';
  }

  if (!raw && typeof import.meta !== 'undefined' && import.meta.env) {
    raw =
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      (import.meta.env as any).SUPABASE_ANON_KEY ||
      (import.meta.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      (import.meta.env as any).SUPABASE_KEY ||
      (import.meta.env as any).SUPABASE_PUBLISHABLE_KEY ||
      (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY ||
      (import.meta.env as any).SUPABASE_PUBLIC_KEY ||
      '';
  }

  return normalizeSupabaseKey(raw);
}

/**
 * Resolves the secret Service Role key.
 * STRICTLY SERVER RUNTIME ONLY.
 * Never looks in import.meta.env to prevent bundling secrets into the client.
 */
export function getSupabaseServiceRoleKey(): string {
  // Guard against browser execution: window check ensures secrets are never accessed on client
  if (typeof window !== 'undefined') {
    return '';
  }

  let raw = '';
  if (typeof process !== 'undefined' && process.env) {
    raw =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.SUPABASE_SECRET ||
      '';
  }

  return normalizeSupabaseKey(raw);
}

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;
let lastClientInitError: string | null = null;

let lastVerifiedConnected: boolean | null = null;
let lastVerifiedError: string | null = null;
let lastVerifiedTime: number = 0;
const VERIFY_CACHE_TTL_MS = 15000; // Cache connection verification for 15 seconds

/**
 * Diagnostic status for Supabase environment keys and initialization.
 * Formats a clean diagnostic summary without exposing secret key contents.
 */
export interface SupabaseDiagnostics {
  isConfigured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  urlHost: string;
  missingVariables: string[];
  clientInitError: string | null;
  summary: string;
}

export function getSupabaseDiagnostics(): SupabaseDiagnostics {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  const service = getSupabaseServiceRoleKey();

  const missingVariables: string[] = [];
  if (!url) missingVariables.push('SUPABASE_URL (or VITE_SUPABASE_URL)');
  if (!anon && !service) {
    missingVariables.push('SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY) or SUPABASE_SERVICE_ROLE_KEY');
  }

  let urlHost = '';
  try {
    if (url) urlHost = new URL(url).host;
  } catch {
    urlHost = url;
  }

  const isConfigured = Boolean(url && (anon || service) && !url.includes('your-project-ref'));

  let summary = '';
  if (!isConfigured) {
    if (url.includes('your-project-ref')) {
      summary = 'Supabase URL contains placeholder "your-project-ref". Please enter your real Supabase project URL.';
    } else {
      summary = `Missing required Supabase environment keys: ${missingVariables.join(', ')}.`;
    }
  } else if (lastClientInitError) {
    summary = `Supabase client initialization error: ${lastClientInitError}`;
  } else {
    summary = `Configured for project ${urlHost} (${service ? 'Service Role Key active' : 'Anon Key active'}).`;
  }

  return {
    isConfigured,
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anon),
    hasServiceRoleKey: Boolean(service),
    urlHost,
    missingVariables,
    clientInitError: lastClientInitError,
    summary,
  };
}

/**
 * Determines whether an error is caused by DNS resolution failure, network timeout,
 * or host unreachability (e.g. paused/deleted/invalid Supabase project).
 */
export function isDnsOrNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = (typeof err === 'string'
    ? err
    : `${err.message || ''} ${err.details || ''} ${err.code || ''} ${err.statusText || ''} ${JSON.stringify(err)}`).toLowerCase();
  return (
    msg.includes('enotfound') ||
    msg.includes('getaddrinfo') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('timeout') ||
    msg.includes('und_err_connect_timeout') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('socket hang up') ||
    msg.includes('cannot connect to supabase database host')
  );
}

export function markSupabaseHostUnreachable(errorReason?: string): void {
  lastVerifiedConnected = false;
  lastVerifiedError = errorReason || 'Host unreachable';
  lastVerifiedTime = Date.now();
}

export function markSupabaseHostReachable(): void {
  lastVerifiedConnected = true;
  lastVerifiedError = null;
  lastVerifiedTime = Date.now();
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
  return lastVerifiedConnected === true;
}

/**
 * Returns true if the host recently failed connection/DNS within cooldown window (30s)
 * preventing costly 15-second blocking timeouts on consecutive user requests.
 */
export function isSupabaseHostKnownUnreachable(): boolean {
  if (lastVerifiedConnected === false && Date.now() - lastVerifiedTime < 30000) {
    return true;
  }
  return false;
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
    const diag = getSupabaseDiagnostics();
    return {
      connected: false,
      configured: false,
      url: '',
      error: diag.summary,
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
    lastVerifiedError = lastClientInitError || 'Failed to initialize Supabase client with provided credentials.';
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
        const host = getSupabaseDiagnostics().urlHost;
        return {
          connected: false,
          configured: true,
          url: getSupabaseUrl(),
          error: `Cannot connect to Supabase database host (TypeError: fetch failed). The host "${host}" does not resolve in DNS. Please verify in your Supabase Dashboard that your project is active and update SUPABASE_URL in Vercel.`,
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
    const host = getSupabaseDiagnostics().urlHost;
    markSupabaseHostUnreachable(err?.message);
    return {
      connected: false,
      configured: true,
      url: getSupabaseUrl(),
      error: `Cannot connect to Supabase database host (TypeError: fetch failed). The host "${host}" does not resolve in DNS. Please verify in your Supabase Dashboard that your project is active and update SUPABASE_URL in Vercel.`,
    };
  }
}

let cachedBrowserUrl = '';
let cachedBrowserKey = '';
let cachedServerUrl = '';
let cachedServerKey = '';

/**
 * Returns the client-side Supabase client using ONLY public anon credentials.
 * Safe for browser execution.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey || url.includes('your-project-ref')) {
    return null;
  }

  if (!browserClient || url !== cachedBrowserUrl || anonKey !== cachedBrowserKey) {
    try {
      browserClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      cachedBrowserUrl = url;
      cachedBrowserKey = anonKey;
      lastClientInitError = null;
    } catch (err: any) {
      lastClientInitError = err?.message || 'Failed to create browser Supabase client';
      console.warn('Browser Supabase client creation error:', lastClientInitError);
      return null;
    }
  }

  return browserClient;
}

/**
 * Server-side Supabase client using the SERVICE ROLE secret key (or anon key fallback).
 * Only callable in server environments (Express, Vercel Serverless).
 * Returns the client instance if URL and key are configured.
 */
export function getServerSupabaseClient(): SupabaseClient | null {
  const projectUrl = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey() || getSupabaseAnonKey();

  if (!projectUrl || !key || projectUrl.includes('your-project-ref')) {
    return null;
  }

  if (!serverClient || projectUrl !== cachedServerUrl || key !== cachedServerKey) {
    try {
      serverClient = createClient(projectUrl, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      cachedServerUrl = projectUrl;
      cachedServerKey = key;
      lastClientInitError = null;
    } catch (err: any) {
      lastClientInitError = err?.message || 'Failed to initialize server Supabase client';
      console.error('Server Supabase client creation error:', lastClientInitError);
      return null;
    }
  }

  return serverClient;
}
