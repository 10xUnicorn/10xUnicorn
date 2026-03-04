import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setApiToken } from '../utils/api';

type User = {
  id: string;
  email: string;
  onboarded: boolean;
  created_at?: string;
  name?: string;
  picture?: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserOnboarded: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  setUserOnboarded: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAuth = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('auth_token');
      if (stored) {
        setToken(stored);
        setApiToken(stored);
        const me = await api.get('/auth/me', stored);
        setUser(me);
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
      setToken(null);
      setApiToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('auth_token', res.token);
    setToken(res.token);
    setApiToken(res.token);
    const me = await api.get('/auth/me', res.token);
    setUser(me);
    return me;
  };

  const register = async (email: string, password: string) => {
    const res = await api.post('/auth/register', { email, password });
    await AsyncStorage.setItem('auth_token', res.token);
    setToken(res.token);
    setApiToken(res.token);
    const newUser = { id: res.user_id, email, onboarded: false };
    setUser(newUser);
    return newUser;
  };

  const loginWithGoogle = async (sessionId: string) => {
    // Exchange session_id for session data from Emergent Auth
    const res = await api.post('/auth/google', { session_id: sessionId });
    await AsyncStorage.setItem('auth_token', res.token);
    setToken(res.token);
    setApiToken(res.token);
    const me = await api.get('/auth/me', res.token);
    setUser(me);
    return me;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_token');
    setToken(null);
    setApiToken(null);
    setUser(null);
  };

  const setUserOnboarded = () => {
    if (user) setUser({ ...user, onboarded: true });
  };

  const refreshUser = async () => {
    if (token) {
      const me = await api.get('/auth/me', token);
      setUser(me);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, loginWithGoogle, logout, setUserOnboarded, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
