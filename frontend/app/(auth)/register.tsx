import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirm.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password);
      router.replace('/onboarding');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
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
            <Text style={styles.title}>Begin your transformation</Text>
            <Text style={styles.subtitle}>Create your account to start</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.status.error} />
                <Text testID="register-error" style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="register-email-input"
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
                  testID="register-password-input"
                  style={[styles.input, styles.passInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 6 characters"
                  placeholderTextColor={Colors.text.tertiary}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPass(!showPass)}
                >
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                testID="register-confirm-input"
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter password"
                placeholderTextColor={Colors.text.tertiary}
                secureTextEntry={!showPass}
              />
            </View>

            <TouchableOpacity
              testID="register-submit-btn"
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.primary} />
              ) : (
                <Text style={styles.btnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="register-go-login"
              style={styles.linkBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBold}>Sign in</Text>
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
  linkBtn: { alignItems: 'center', marginTop: 24, padding: 12 },
  linkText: { color: Colors.text.secondary, fontSize: FontSize.base },
  linkBold: { color: Colors.brand.primary, fontWeight: '700' },
});
