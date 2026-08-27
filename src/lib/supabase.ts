import { createClient, type Session, type User } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true },
});

export const API_URL = `${supabaseUrl}/functions/v1/atlas-api`;

export type AuthSession = { user: User | null; session: Session | null };

export function getAuthHeaders(): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: supabaseAnonKey,
  };
  return base;
}

export async function getAuthenticatedHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: supabaseAnonKey,
  };
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

// Public API calls (no auth needed — guest booking, property browsing)
export async function apiGetPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function apiPostPublic<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

// Authenticated API calls (for host/vendor routes)
export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthenticatedHeaders();
  const res = await fetch(`${API_URL}${path}`, { headers });
  const data = await res.json();
  if (!res.ok || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthenticatedHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthenticatedHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthenticatedHeaders();
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
}
