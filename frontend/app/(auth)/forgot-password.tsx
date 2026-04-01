/**
 * Forgot Password Screen — (auth)/forgot-password.tsx
 * Password reset flow via email
 * Features:
 * - Email input
 * - Submit button
 * - Success message
 * - Back to login link
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Password reset request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Back Button */}
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={Colors.brand.primary} />
            </TouchableOpacity>
          </Link>

          {/* Branding */}
          <View style={styles.brandingContainer}>
            <Text style={styles.brandingEmoji}>🔑</Text>
            <Text style={styles.brandingTitle}>Reset Password</Text>
            <Text style={styles.brandingSubtitle}>
              {success
                ? 'Check your email for reset instructions'
                : 'Enter your email to receive a password reset link'}
            </Text>
          </View>

          {/* Form Container */}
          {!success ? (
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={Colors.text.secondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.text.muted}
                    value={email}
                    onChangeText={setEmail}
                    editable={!isSubmitting}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={Colors.status.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <LinearGradient
                colors={Colors.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleReset}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.text.primary} size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>

              {/* Back to Login */}
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={styles.backToLoginButton}>
                  <Text style={styles.backToLoginText}>Back to login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <Ionicons
                  name="checkmark-circle"
                  size={64}
                  color={Colors.status.success}
                />
              </View>
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMessage}>
                We've sent a password reset link to {email}. Check your inbox and follow the instructions.
              </Text>

              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={styles.successButton}>
                  <Text style={styles.successButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  brandingEmoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  brandingTitle: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  brandingSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    height: 48,
    ...Typography.body,
    color: Colors.text.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.status.error,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.status.error,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  gradientButton: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  submitButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  backToLoginButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  backToLoginText: {
    ...Typography.bodyBold,
    color: Colors.brand.primary,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  successIconContainer: {
    marginBottom: Spacing.xl,
  },
  successTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  successMessage: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
    lineHeight: 24,
  },
  successButton: {
    width: '100%',
  },
  successButtonText: {
    ...Typography.bodyBold,
    color: Colors.brand.primary,
    textAlign: 'center',
  },
});
