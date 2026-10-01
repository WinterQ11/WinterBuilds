import type { Application, ApiResponse, DashboardStats } from '../types';
import { getSupabaseClient } from '../lib/supabase';

// Base URL: in production and Vercel, uses same-origin '/api'
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

/**
 * Retrieves the current admin authentication token (from Supabase Auth or local storage).
 */
export async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  }

  try {
    return localStorage.getItem('winterbuilds_auth_token');
  } catch {
    return null;
  }
}

/**
 * Sets local session token for admin access.
 */
export function setLocalAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem('winterbuilds_auth_token', token);
    } else {
      localStorage.removeItem('winterbuilds_auth_token');
    }
  } catch {
    // ignore
  }
}

/**
 * Safe fetch wrapper with JSON content-type verification and specific HTTP status mappings.
 */
async function safeFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const isAuthEndpoint = endpoint.includes('/admin/login');

  const headers = new Headers(options.headers || {});
  if (!isAuthEndpoint) {
    const token = await getAuthToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData) && !(options.body instanceof Blob)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new Error('Could not connect to the service. Check your connection.');
  }

  // Parse JSON response data
  const contentType = response.headers.get('content-type') || '';
  let responseData: any = null;

  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Server error (${response.status}) while processing the request.`);
    }
    return text as unknown as T;
  }

  if (!response.ok) {
    const serverMessage = responseData?.error?.message;

    // Handle specific status codes cleanly with actual server error message priority
    if (response.status === 401) {
      setLocalAuthToken(null);
      if (isAuthEndpoint) {
        throw new Error(serverMessage || 'Invalid administrator password.');
      }
      throw new Error(serverMessage || 'Your admin session has expired. Please sign in again.');
    }
    if (response.status === 403) {
      throw new Error(serverMessage || "Access denied. You don't have permission to perform this action.");
    }
    if (response.status === 404) {
      throw new Error(serverMessage || 'The requested resource or service is unavailable.');
    }
    if (response.status === 413) {
      throw new Error('Request size exceeds the allowed limit.');
    }
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }

    throw new Error(serverMessage || `Request failed with status ${response.status}`);
  }

  return responseData?.data !== undefined ? responseData.data : responseData;
}

export const api = {
  // Public apps catalog
  async getApps(params: {
    category?: string;
    search?: string;
    sort?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ applications: Application[]; total: number }> {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);
    if (params.featured !== undefined) query.set('featured', String(params.featured));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const qs = query.toString();
    return safeFetch<{ applications: Application[]; total: number }>(`/apps${qs ? `?${qs}` : ''}`);
  },

  async getAppBySlug(slug: string): Promise<Application> {
    return safeFetch<Application>(`/apps/${encodeURIComponent(slug)}`);
  },

  async downloadApp(id: string): Promise<{ downloadUrl: string; downloadsCount: number; filename?: string; name?: string }> {
    return safeFetch<{ downloadUrl: string; downloadsCount: number; filename?: string; name?: string }>(`/apps/${id}/download`, {
      method: 'POST',
    });
  },

  // Admin APIs
  async checkAdminStatus(): Promise<{
    authenticated: boolean;
    email: string | null;
    passwordConfigured?: boolean;
    supabaseConfigured: boolean;
    defaultAdminEmail?: string;
  }> {
    try {
      return await safeFetch<{
        authenticated: boolean;
        email: string | null;
        passwordConfigured?: boolean;
        supabaseConfigured: boolean;
        defaultAdminEmail?: string;
      }>('/admin/status');
    } catch {
      return { authenticated: false, email: null, passwordConfigured: false, supabaseConfigured: false };
    }
  },

  async adminLogin(credentials: { email: string; password?: string }): Promise<{
    token: string;
    email: string;
    message?: string;
  }> {
    return safeFetch<{ token: string; email: string; message?: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async getAdminStats(): Promise<DashboardStats> {
    return safeFetch<DashboardStats>('/admin/stats');
  },

  async getAdminApps(params: {
    status?: string;
    category?: string;
    search?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ applications: Application[]; total: number }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const qs = query.toString();
    return safeFetch<{ applications: Application[]; total: number }>(`/admin/apps${qs ? `?${qs}` : ''}`);
  },

  async createApp(appData: Partial<Application>): Promise<Application> {
    return safeFetch<Application>('/apps', {
      method: 'POST',
      body: JSON.stringify(appData),
    });
  },

  async updateApp(id: string, updates: Partial<Application>): Promise<Application> {
    return safeFetch<Application>(`/apps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async publishApp(id: string): Promise<Application> {
    return safeFetch<Application>(`/apps/${id}/publish`, {
      method: 'POST',
    });
  },

  async unpublishApp(id: string): Promise<Application> {
    return safeFetch<Application>(`/apps/${id}/unpublish`, {
      method: 'POST',
    });
  },

  async deleteApp(id: string): Promise<{ deleted: boolean; id: string }> {
    return safeFetch<{ deleted: boolean; id: string }>(`/apps/${id}`, {
      method: 'DELETE',
    });
  },

  async authorizeUpload(params: { appId?: string; fileName: string; contentType?: string; appName?: string }): Promise<{
    uploadUrl: string;
    method: 'PUT' | 'POST';
    path: string;
    token?: string;
    provider: string;
    originalFileName?: string;
    headers?: Record<string, string>;
  }> {
    return safeFetch('/upload/authorize', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async completeUpload(params: { storagePath: string; originalFileName?: string; appName?: string }): Promise<{
    verified: boolean;
    storagePath: string;
    downloadUrl: string;
    originalFileName?: string;
    downloadFileName?: string;
  }> {
    return safeFetch('/upload/complete', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async enhanceWithAi(params: {
    appName: string;
    packageName: string;
    category?: string;
    rawDescription?: string;
  }): Promise<{
    shortDescription: string;
    description: string;
    suggestedCategory: string;
    features: string[];
  }> {
    return safeFetch('/ai/enhance', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
