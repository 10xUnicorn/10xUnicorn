import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Handle deep link callback from Google OAuth
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (url && url.includes('session_id=')) {
        const sessionId = url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
        if (sessionId) {
          setGoogleLoading(true);
          try {
            const me = await loginWithGoogle(sessionId);
            if (!me.onboarded) {
              router.replace('/onboarding');
            } else {
              router.replace('/(tabs)/today');
            }
          } catch (e: any) {
            setError(e.message || 'Google login failed');
          } finally {
            setGoogleLoading(false);
          }
        }
      }
    };

    // Check for initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const me = await login(email.trim().toLowerCase(), password);
      if (!me.onboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/today');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      // Get the redirect URL using Expo Linking
      const redirectUrl = Linking.createURL('auth-callback');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        // Extract session_id from URL
        const sessionId = result.url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
        if (sessionId) {
          const me = await loginWithGoogle(sessionId);
          if (!me.onboarded) {
            router.replace('/onboarding');
          } else {
            router.replace('/(tabs)/today');
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>10x</Text>
            <Text style={styles.logoSub}>UNICORN</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue your streak</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.status.error} />
                <Text testID="login-error" style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="login-email-input"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passRow}>
                <TextInput
                  testID="login-password-input"
                  style={[styles.input, styles.passInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.text.tertiary}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity
                  testID="login-toggle-pass"
                  style={styles.eyeBtn}
                  onPress={() => setShowPass(!showPass)}
                >
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="login-submit-btn"
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.primary} />
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="forgot-password-btn"
              style={styles.forgotBtn}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              testID="google-login-btn"
              style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color={Colors.text.primary} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color={Colors.text.primary} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="login-go-register"
              style={styles.linkBtn}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkBold}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 64, fontWeight: '900', color: Colors.brand.primary, letterSpacing: -2 },
  logoSub: { fontSize: 18, fontWeight: '700', color: Colors.text.secondary, letterSpacing: 8, marginTop: -8 },
  form: { width: '100%' },
  title: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text.primary, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: 32 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,0,85,0.1)',
    borderRadius: Radius.md, padding: 12, marginBottom: 16, gap: 8,
  },
  errorText: { color: Colors.status.error, fontSize: FontSize.sm },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 16,
    color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default,
  },
  passRow: { position: 'relative' },
  passInput: { paddingRight: 50 },
  eyeBtn: { position: 'absolute', right: 16, top: 16 },
  btn: {
    backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  forgotBtn: { alignItems: 'center', marginTop: 16, padding: 8 },
  forgotText: { color: Colors.brand.accent, fontSize: FontSize.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border.default },
  dividerText: { color: Colors.text.tertiary, marginHorizontal: 16, fontSize: FontSize.sm },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: 16,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  googleBtnText: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginTop: 24, padding: 12 },
  linkText: { color: Colors.text.secondary, fontSize: FontSize.base },
  linkBold: { color: Colors.brand.primary, fontWeight: '700' },
});
