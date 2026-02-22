import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const STEPS = ['name', 'timezone', 'goal', 'habit'] as const;

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [tz, setTz] = useState('UTC');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [habit, setHabit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUserOnboarded } = useAuth();
  const router = useRouter();

  const TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
    'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney', 'Pacific/Auckland', 'UTC'
  ];

  const canProceed = () => {
    switch (STEPS[step]) {
      case 'name': return displayName.trim().length > 0;
      case 'timezone': return true;
      case 'goal': return goalTitle.trim().length > 0;
      case 'habit': return habit.trim().length > 0;
    }
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/onboarding', {
        display_name: displayName.trim(),
        timezone_str: tz,
        goal_title: goalTitle.trim(),
        goal_description: goalDesc.trim(),
        compound_habit: habit.trim(),
      });
      setUserOnboarded();
      router.replace('/(tabs)/today');
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (STEPS[step]) {
      case 'name':
        return (
          <View>
            <Text style={styles.stepTitle}>What should we call you?</Text>
            <Text style={styles.stepSub}>This is how you'll be addressed by your AI coach</Text>
            <TextInput
              testID="onboard-name-input"
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={Colors.text.tertiary}
              autoFocus
            />
          </View>
        );
      case 'timezone':
        return (
          <View>
            <Text style={styles.stepTitle}>Your timezone</Text>
            <Text style={styles.stepSub}>So we know when your day starts and ends</Text>
            <ScrollView style={styles.tzList} nestedScrollEnabled>
              {TIMEZONES.map(t => (
                <TouchableOpacity
                  key={t}
                  testID={`tz-${t}`}
                  style={[styles.tzItem, tz === t && styles.tzItemActive]}
                  onPress={() => setTz(t)}
                >
                  <Text style={[styles.tzText, tz === t && styles.tzTextActive]}>{t.replace('_', ' ')}</Text>
                  {tz === t && <Ionicons name="checkmark-circle" size={20} color={Colors.brand.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      case 'goal':
        return (
          <View>
            <Text style={styles.stepTitle}>Your 10x Goal</Text>
            <Text style={styles.stepSub}>What's the one massive outcome you're chasing?</Text>
            <TextInput
              testID="onboard-goal-input"
              style={styles.input}
              value={goalTitle}
              onChangeText={setGoalTitle}
              placeholder="e.g. Build a $10M company"
              placeholderTextColor={Colors.text.tertiary}
              autoFocus
            />
            <TextInput
              testID="onboard-goal-desc-input"
              style={[styles.input, styles.textArea]}
              value={goalDesc}
              onChangeText={setGoalDesc}
              placeholder="Describe it (optional)"
              placeholderTextColor={Colors.text.tertiary}
              multiline
              numberOfLines={3}
            />
          </View>
        );
      case 'habit':
        return (
          <View>
            <Text style={styles.stepTitle}>Daily Compound Habit</Text>
            <Text style={styles.stepSub}>What ONE action will you do daily that compounds your progress?</Text>
            <TextInput
              testID="onboard-habit-input"
              style={styles.input}
              value={habit}
              onChangeText={setHabit}
              placeholder="e.g. Write for 30 minutes"
              placeholderTextColor={Colors.text.tertiary}
              autoFocus
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.progress}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.stepCount}>Step {step + 1} of {STEPS.length}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {renderStep()}

          <View style={styles.navRow}>
            {step > 0 && (
              <TouchableOpacity
                testID="onboard-back-btn"
                style={styles.backBtn}
                onPress={() => setStep(step - 1)}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.text.primary} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              testID="onboard-next-btn"
              style={[styles.nextBtn, !canProceed() && styles.btnDisabled]}
              onPress={handleNext}
              disabled={!canProceed() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.primary} />
              ) : (
                <Text style={styles.nextText}>
                  {step === STEPS.length - 1 ? 'Start My Journey' : 'Continue'}
                </Text>
              )}
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
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 },
  progress: { flexDirection: 'row', gap: 8, marginBottom: 12, justifyContent: 'center' },
  dot: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border.default },
  dotActive: { backgroundColor: Colors.brand.primary },
  stepCount: { fontSize: FontSize.sm, color: Colors.text.tertiary, textAlign: 'center', marginBottom: 40 },
  stepTitle: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text.primary, marginBottom: 8 },
  stepSub: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: 32, lineHeight: 24 },
  input: {
    backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 16,
    color: Colors.text.primary, fontSize: FontSize.lg, borderWidth: 1, borderColor: Colors.border.default,
    marginBottom: 16,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  tzList: { maxHeight: 300 },
  tzItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: Radius.md, marginBottom: 4,
    backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default,
  },
  tzItemActive: { borderColor: Colors.brand.primary, backgroundColor: 'rgba(127,0,255,0.08)' },
  tzText: { color: Colors.text.secondary, fontSize: FontSize.base },
  tzTextActive: { color: Colors.text.primary, fontWeight: '600' },
  errorBox: {
    backgroundColor: 'rgba(255,0,85,0.1)', borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  errorText: { color: Colors.status.error, fontSize: FontSize.sm },
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 40, paddingBottom: 32,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 4 },
  backText: { color: Colors.text.primary, fontSize: FontSize.base },
  nextBtn: {
    backgroundColor: Colors.brand.primary, borderRadius: Radius.md,
    paddingVertical: 16, paddingHorizontal: 32, marginLeft: 'auto',
  },
  btnDisabled: { opacity: 0.4 },
  nextText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
});
