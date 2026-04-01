/**
 * Supabase Client Configuration
 * 10xUnicorn - Self-managed backend
 *
 * Replaces: Custom FastAPI HTTP client (api.ts)
 * Project: yzhpnaxnljvozatawclj (us-east-1)
 */

import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yzhpnaxnljvozatawclj.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6aHBuYXhubGp2b3phdGF3Y2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDc0OTIsImV4cCI6MjA5MDMyMzQ5Mn0.NHf_ABZ7nPM8s743SgUVqzl_yb6RQiie3xKMzG2iUZw';

if (!SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// SSR-safe storage adapter — AsyncStorage uses window.localStorage on web,
// which crashes during static rendering (Node.js). Use a no-op fallback for SSR.
const isSSR = typeof window === 'undefined';

const noopStorage = {
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, _value: string) => Promise.resolve(),
  removeItem: (_key: string) => Promise.resolve(),
};

const storage = isSSR ? noopStorage : AsyncStorage;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage as any,
    autoRefreshToken: !isSSR,
    persistSession: !isSSR,
    detectSessionInUrl: Platform.OS === 'web' && !isSSR,
  },
});

// Anthropic API config (for AI Companion)
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

export default supabase;
