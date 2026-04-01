/**
 * AuthContext — Supabase Auth
 * Replaces: Custom JWT + FastAPI auth endpoints
 *
 * Changes from Emergent version:
 * - No manual token management (Supabase handles it)
 * - No custom JWT decode (Supabase session auto-refresh)
 * - Google OAuth via Supabase (not Emergent session exchange)
 * - Password reset via Supabase (not custom endpoint)
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { Profile } from '../types/database';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string;
  onboarded: boolean;
  accountStatus?: string; // 'pending' | 'approved' | 'rejected' | 'deactivated'
  role?: string; // 'admin' | 'member'
  name?: string;
  displayName?: string;
  emoji?: string;
  avatarUrl?: string;
  timezone?: string;
  dailyCompoundTarget?: number;
}

interface AuthState {
  user: AppUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  setUserOnboarded: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | undefined>(undefined);

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch profile from Supabase ──
  const fetchProfile = useCallback(async (userId: string, email: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Profile fetch error:', error.message);
      return null;
    }
    return data;
  }, []);

  // ── Build AppUser from profile ──
  const buildAppUser = useCallback((supaUser: SupabaseUser, prof: Profile | null): AppUser => {
    return {
      id: supaUser.id,
      email: supaUser.email || '',
      onboarded: prof?.onboarding_completed ?? false,
      accountStatus: (prof as any)?.account_status || 'pending',
      role: (prof as any)?.role || 'member',
      name: prof?.full_name || supaUser.user_metadata?.full_name || undefined,
      displayName: prof?.display_name || undefined,
      emoji: prof?.emoji || undefined,
      avatarUrl: prof?.avatar_url || undefined,
      timezone: prof?.timezone || undefined,
      dailyCompoundTarget: prof?.daily_compound_target ?? 0,
    };
  }, []);

  // ── Handle session change ──
  const handleSession = useCallback(async (sess: Session | null) => {
    setSession(sess);
    if (sess?.user) {
      const prof = await fetchProfile(sess.user.id, sess.user.email || '');
      setProfile(prof);
      setUser(buildAppUser(sess.user, prof));
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }, [fetchProfile, buildAppUser]);

  // ── Initialize auth listener ──
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleSession(initialSession);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        handleSession(newSession);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  // ── Login ──
  const login = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw new Error(error.message);
    }
    // Session change triggers handleSession via onAuthStateChange
  };

  // ── Register ──
  const register = async (email: string, password: string, name?: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name || email.split('@')[0] },
      },
    });
    if (error) {
      setLoading(false);
      throw new Error(error.message);
    }
  };

  // ── Google OAuth ──
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'com.10xunicorn.app://auth/callback',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw new Error(error.message);
  };

  // ── Logout ──
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  // ── Password Reset ──
  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'com.10xunicorn.app://auth/reset',
    });
    if (error) throw new Error(error.message);
  };

  // ── Mark onboarded ──
  const setUserOnboarded = () => {
    if (user) {
      setUser({ ...user, onboarded: true });
      if (profile) setProfile({ ...profile, onboarding_completed: true });
    }
  };

  // ── Refresh user data ──
  const refreshUser = async () => {
    if (!session?.user) return;
    const prof = await fetchProfile(session.user.id, session.user.email || '');
    setProfile(prof);
    setUser(buildAppUser(session.user, prof));
  };

  // ── Update profile ──
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (data) {
      setProfile(data);
      setUser(buildAppUser(session.user, data));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        requestPasswordReset,
        setUserOnboarded,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
