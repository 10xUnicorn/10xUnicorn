import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// In-memory token for immediate availability after login/register
let memoryToken: string | null = null;

export function setApiToken(token: string | null) {
  memoryToken = token;
}

async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  try {
    const stored = await AsyncStorage.getItem('auth_token');
    if (stored) memoryToken = stored;
    return stored;
  } catch {
    return null;
  }
}

async function request(method: string, path: string, body?: any, customToken?: string) {
  const token = customToken || (await getToken());
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config: RequestInit = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}/api${path}`, config);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: (path: string, token?: string) => request('GET', path, undefined, token),
  post: (path: string, body?: any, token?: string) => request('POST', path, body, token),
  put: (path: string, body?: any, token?: string) => request('PUT', path, body, token),
  delete: (path: string, token?: string) => request('DELETE', path, undefined, token),
};
