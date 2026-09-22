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
  const token = await getAuthToken();

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
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
    throw new Error('Could not connect to the upload service. Check your connection.');
  }

  // Handle specific status codes cleanly
  if (response.status === 401) {
    setLocalAuthToken(null);
    throw new Error('Your admin session has expired. Please sign in again.');
  }
  if (response.status === 403) {
    throw new Error("You don't have permission to perform this action.");
  }
  if (response.status === 404) {
    throw new Error('The requested resource or upload service is unavailable.');
  }
  if (response.status === 413) {
    throw new Error('Your hosting/storage provider rejected this request size.');
  }
  if (response.status === 429) {
    throw new Error('Too many requests. Please wait and try again.');
  }

  // Check content type before parsing JSON
  const contentType = response.headers.get('content-type') || '';
  let responseData: any;

  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      throw new Error('Server returned an invalid JSON response.');
    }
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Server error (${response.status}) while processing the request.`);
    }
    return text as unknown as T;
  }

  if (!response.ok) {
    const message = responseData?.error?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
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
  async checkAdminStatus(): Promise<{ authenticated: boolean; email: string | null; supabaseConfigured: boolean }> {
    try {
      return await safeFetch<{ authenticated: boolean; email: string | null; supabaseConfigured: boolean }>('/admin/status');
    } catch {
      return { authenticated: false, email: null, supabaseConfigured: false };
    }
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
