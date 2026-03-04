import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

type Step = 'email' | 'token' | 'success';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/request-password-reset', { email: email.trim().toLowerCase() });
      setSuccess(res.message);
      // For development, if a debug_token is returned, auto-fill it
      if (res.debug_token) {
        setToken(res.debug_token);
      }
      setStep('token');
    } catch (e: any) {
      setError(e.message || 'Failed to send reset request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!token.trim()) {
      setError('Please enter the reset code');
      return;
    }
    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { 
        token: token.trim(), 
        new_password: newPassword 
      });
      setStep('success');
    } catch (e: any) {
      setError(e.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.status.success} />
            </View>
            <Text style={styles.successTitle}>Password Reset!</Text>
            <Text style={styles.successText}>
              Your password has been reset successfully. You can now log in with your new password.
            </Text>
            <TouchableOpacity
              testID="back-to-login-btn"
              style={styles.btn}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.btnText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            testID="back-btn"
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'email' ? 'Forgot Password?' : 'Enter Reset Code'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email' 
                ? "Enter your email and we'll send you a reset code"
                : 'Enter the reset code from your email and create a new password'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.status.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success && step === 'token' ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.status.success} />
              <Text style={styles.successBoxText}>{success}</Text>
            </View>
          ) : null}

          {step === 'email' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  testID="reset-email-input"
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

              <TouchableOpacity
                testID="send-reset-btn"
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleRequestReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.text.primary} />
                ) : (
                  <Text style={styles.btnText}>Send Reset Code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reset Code</Text>
                <TextInput
                  testID="reset-token-input"
                  style={styles.input}
                  value={token}
                  onChangeText={setToken}
                  placeholder="Paste the code from your email"
                  placeholderTextColor={Colors.text.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passRow}>
                  <TextInput
                    testID="new-password-input"
                    style={[styles.input, styles.passInput]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
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
                  testID="confirm-password-input"
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.text.tertiary}
                  secureTextEntry={!showPass}
                />
              </View>

              <TouchableOpacity
                testID="reset-password-btn"
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.text.primary} />
                ) : (
                  <Text style={styles.btnText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                testID="resend-code-btn"
                style={styles.linkBtn}
                onPress={() => setStep('email')}
              >
                <Text style={styles.linkText}>
                  Didn't receive the code? <Text style={styles.linkBold}>Resend</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            testID="back-to-login-link"
            style={styles.linkBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.linkText}>
              Remember your password? <Text style={styles.linkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 },
  backBtn: { marginBottom: 20, padding: 4 },
  header: { marginBottom: 32 },
  title: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text.primary, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.text.secondary, lineHeight: 22 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,0,85,0.1)',
    borderRadius: Radius.md, padding: 12, marginBottom: 16, gap: 8,
  },
  errorText: { color: Colors.status.error, fontSize: FontSize.sm, flex: 1 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: Radius.md, padding: 12, marginBottom: 16, gap: 8,
  },
  successBoxText: { color: Colors.status.success, fontSize: FontSize.sm, flex: 1 },
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
  
  // Success screen
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successIcon: { marginBottom: 24 },
  successTitle: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text.primary, marginBottom: 16 },
  successText: { fontSize: FontSize.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});
