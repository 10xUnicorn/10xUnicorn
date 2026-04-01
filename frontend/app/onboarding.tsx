/**
 * Multi-Step Onboarding — onboarding.tsx
 * Guides user through 4-step setup:
 * Step 1: Display name
 * Step 2: Timezone selection (13 presets)
 * Step 3: 10x Goal (title + description)
 * Step 4: Daily compound habit
 *
 * Includes progress indicator, validation, database save, then navigation
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
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { profiles } from '../src/utils/database';
import { Colors, Spacing, Typography, BorderRadius } from '../src/constants/theme';

const TIMEZONES = [
  'UTC',
  'US/Eastern',
  'US/Central',
  'US/Mountain',
  'US/Pacific',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Australia/Sydney',
  'Pacific/Auckland',
  'America/Sao_Paulo',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setUserOnboarded } = useAuth();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState('US/Eastern');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [habitName, setHabitName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);

  const validateStep = () => {
    setError('');

    switch (step) {
      case 1:
        if (!displayName.trim()) {
          setError('Please enter your display name');
          return false;
        }
        return true;
      case 2:
        if (!timezone) {
          setError('Please select a timezone');
          return false;
        }
        return true;
      case 3:
        if (!goalTitle.trim()) {
          setError('Please enter your 10x goal');
          return false;
        }
        return true;
      case 4:
        if (!habitName.trim()) {
          setError('Please enter your daily habit');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < 4) {
        setStep(step + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleComplete = async () => {
    if (!user?.id) return;

    setError('');
    setIsSubmitting(true);

    try {
      const { error: dbError } = await profiles.completeOnboarding(user.id, {
        displayName,
        timezone,
        goalTitle,
        goalDescription,
        habitName,
        dailyCompoundTarget: 1,
      });

      if (dbError) throw dbError;

      setUserOnboarded();
      router.replace('/(tabs)/today');
    } catch (err: any) {
      setError(err.message || 'Onboarding failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgressPercentage = () => Math.round((step / 4) * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
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
            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressBarContainer}>
                <LinearGradient
                  colors={Colors.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBar,
                    { width: `${getProgressPercentage()}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                Step {step} of 4
              </Text>
            </View>

            {/* Header */}
            <View style={styles.headerSection}>
              <Text style={styles.header}>
                {step === 1 && 'What should we call you?'}
                {step === 2 && 'What\'s your timezone?'}
                {step === 3 && 'What\'s your 10x goal?'}
                {step === 4 && 'Daily compound habit?'}
              </Text>
              <Text style={styles.subheader}>
                {step === 1 && 'We\'ll use this to personalize your experience'}
                {step === 2 && 'This helps us show you content at the right time'}
                {step === 3 && 'Your biggest ambition for the next year'}
                {step === 4 && 'What habit will compound over 365 days?'}
              </Text>
            </View>

            {/* Step Content */}
            <View style={styles.contentSection}>
              {/* Step 1: Display Name */}
              {step === 1 && (
                <View>
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.largeInput}
                      placeholder="Your name"
                      placeholderTextColor={Colors.text.muted}
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoFocus
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Step 2: Timezone */}
              {step === 2 && (
                <View>
                  {!showTimezonePicker ? (
                    <TouchableOpacity
                      style={styles.timezoneTrigger}
                      onPress={() => setShowTimezonePicker(true)}
                    >
                      <Ionicons
                        name="time"
                        size={24}
                        color={Colors.brand.primary}
                        style={{ marginRight: Spacing.md }}
                      />
                      <Text style={styles.timezoneText}>{timezone}</Text>
                      <Ionicons
                        name="chevron-down"
                        size={24}
                        color={Colors.text.secondary}
                        style={{ marginLeft: 'auto' }}
                      />
                    </TouchableOpacity>
                  ) : (
                    <FlatList
                      data={TIMEZONES}
                      keyExtractor={(item) => item}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.timezoneOption,
                            timezone === item && styles.timezoneOptionActive,
                          ]}
                          onPress={() => {
                            setTimezone(item);
                            setShowTimezonePicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.timezoneOptionText,
                              timezone === item && styles.timezoneOptionTextActive,
                            ]}
                          >
                            {item}
                          </Text>
                          {timezone === item && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color={Colors.brand.primary}
                              style={{ marginLeft: 'auto' }}
                            />
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              )}

              {/* Step 3: Goal */}
              {step === 3 && (
                <View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Goal Title</Text>
                    <TextInput
                      style={styles.largeInput}
                      placeholder="e.g., Build a $1M business"
                      placeholderTextColor={Colors.text.muted}
                      value={goalTitle}
                      onChangeText={setGoalTitle}
                      autoFocus
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Description (Optional)</Text>
                    <TextInput
                      style={[styles.largeInput, styles.descriptionInput]}
                      placeholder="Why is this goal important to you?"
                      placeholderTextColor={Colors.text.muted}
                      value={goalDescription}
                      onChangeText={setGoalDescription}
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </View>
              )}

              {/* Step 4: Habit */}
              {step === 4 && (
                <View>
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.largeInput}
                      placeholder="e.g., 30 mins of deep work"
                      placeholderTextColor={Colors.text.muted}
                      value={habitName}
                      onChangeText={setHabitName}
                      autoFocus
                    />
                  </View>
                  <View style={styles.habitInfo}>
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color={Colors.brand.primary}
                    />
                    <Text style={styles.habitInfoText}>
                      This habit will be tracked daily. Small consistent actions lead to 10x results.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.status.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Navigation Buttons */}
            <View style={styles.buttonSection}>
              {step > 1 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep(step - 1)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              <LinearGradient
                colors={Colors.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.nextButton, step === 1 && { flex: 1 }]}
              >
                <TouchableOpacity
                  style={styles.nextButtonContent}
                  onPress={handleNext}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.text.primary} size="small" />
                  ) : (
                    <Text style={styles.nextButtonText}>
                      {step === 4 ? 'Get Started' : 'Next'}
                    </Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  progressSection: {
    marginBottom: Spacing.xxxl,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'right',
  },
  headerSection: {
    marginBottom: Spacing.xxxl,
  },
  header: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  subheader: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  contentSection: {
    flex: 1,
    marginBottom: Spacing.xxl,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  largeInput: {
    ...Typography.h3,
    color: Colors.text.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  descriptionInput: {
    ...Typography.body,
    height: 120,
    textAlignVertical: 'top',
  },
  timezoneTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  timezoneText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  timezoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  timezoneOptionActive: {
    backgroundColor: Colors.border.glow,
  },
  timezoneOptionText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  timezoneOptionTextActive: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
  },
  habitInfoText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginLeft: Spacing.md,
    flex: 1,
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
  buttonSection: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  backButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    justifyContent: 'center',
  },
  backButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.secondary,
  },
  nextButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
  },
  nextButtonContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
});
