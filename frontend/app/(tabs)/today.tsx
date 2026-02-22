import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize, DETERMINATION_EMOJIS, STATUS_LABELS, STATUS_COLORS } from '../../src/constants/theme';

const getToday = () => new Date().toISOString().split('T')[0];
const formatDate = (d: string) => {
  const date = new Date(d + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const FIVE_ACTIONS = [
  { key: 'top_action', label: 'Top 10x Action', icon: 'rocket' },
  { key: 'wormhole', label: 'Wormhole Relationship', icon: 'people' },
  { key: 'scariest', label: 'Scariest Thing', icon: 'flash' },
  { key: 'boldest', label: 'Boldest Move', icon: 'diamond' },
  { key: 'meditation', label: '7-Min Future Self Meditation', icon: 'leaf' },
];

const STATUS_OPTIONS = ['ready', 'priority_win', 'unicorn_win', 'loss', 'lesson', 'course_corrected'];

export default function TodayScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(getToday());
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [compoundStreak, setCompoundStreak] = useState(0);
  const [habitTitle, setHabitTitle] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const isToday = currentDate === getToday();

  const loadEntry = useCallback(async () => {
    try {
      const [entryData, streakData, profile] = await Promise.all([
        api.get(`/daily-entry/${currentDate}`),
        api.get('/compound-streak'),
        api.get('/profile'),
      ]);
      setEntry(entryData);
      setCompoundStreak(streakData.streak);
      setHabitTitle(streakData.habit?.habit_title || 'Daily Habit');
      setProfileData(profile);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDate]);

  useEffect(() => {
    setLoading(true);
    loadEntry();
  }, [currentDate]);

  const updateEntry = async (updates: any) => {
    if (!entry) return;
    setSaving(true);
    try {
      const updated = await api.put(`/daily-entry/${currentDate}`, updates);
      setEntry(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleFiveItem = (key: string) => {
    const current = entry?.five_item_statuses || {};
    const newStatuses = { ...current, [key]: !current[key] };
    const updates: any = { five_item_statuses: newStatuses };
    // Sync top_action with top_priority
    if (key === 'top_action') {
      updates.top_priority_completed = !current[key];
    }
    updateEntry(updates);
  };

  const navigateDate = (dir: number) => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + dir);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const determination = entry?.determination_level ?? 5;
  const emoji = DETERMINATION_EMOJIS[determination] || '🔥';
  const fiveStatuses = entry?.five_item_statuses || {};
  const allFiveDone = FIVE_ACTIONS.every(a => fiveStatuses[a.key]);
  const finalStatus = entry?.final_status || 'ready';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEntry(); }} tintColor={Colors.brand.primary} />}
      >
        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity testID="date-prev-btn" onPress={() => navigateDate(-1)} style={styles.dateBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.text.primary} />
            <Text style={styles.dateBtnText}>Yesterday</Text>
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Text style={styles.dateLabel}>{isToday ? 'TODAY' : formatDate(currentDate)}</Text>
            {!isToday && (
              <TouchableOpacity testID="date-today-btn" onPress={() => setCurrentDate(getToday())}>
                <Text style={styles.todayLink}>Go to Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity testID="date-next-btn" onPress={() => navigateDate(1)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>Tomorrow</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { borderColor: STATUS_COLORS[finalStatus] || Colors.border.default }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[finalStatus] }]}>
            {STATUS_LABELS[finalStatus] || 'Ready'}
          </Text>
          {allFiveDone && <Text style={styles.unicornEmoji}>🦄</Text>}
          <TouchableOpacity
            testID="status-override-btn"
            onPress={() => setShowStatusPicker(!showStatusPicker)}
            style={styles.overrideBtn}
          >
            <Ionicons name="create-outline" size={16} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {showStatusPicker && (
          <View style={styles.statusPicker}>
            {STATUS_OPTIONS.map(s => (
              <TouchableOpacity
                key={s}
                testID={`status-option-${s}`}
                style={[styles.statusOption, entry?.manual_override_status === s && styles.statusOptionActive]}
                onPress={() => {
                  updateEntry({ manual_override_status: s });
                  setShowStatusPicker(false);
                }}
              >
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[s] }]} />
                <Text style={styles.statusOptionText}>{STATUS_LABELS[s]}</Text>
              </TouchableOpacity>
            ))}
            {entry?.manual_override_status && (
              <TouchableOpacity
                testID="status-clear-override"
                style={styles.statusOption}
                onPress={() => {
                  updateEntry({ manual_override_status: null });
                  setShowStatusPicker(false);
                }}
              >
                <Text style={[styles.statusOptionText, { color: Colors.text.tertiary }]}>Clear Override</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Determination Slider */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Determination Level</Text>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Text style={styles.determinationValue}>{determination}/10</Text>
          <View style={styles.sliderRow}>
            {Array.from({ length: 11 }, (_, i) => (
              <TouchableOpacity
                key={i}
                testID={`determination-${i}`}
                style={[
                  styles.sliderDot,
                  i <= determination && styles.sliderDotActive,
                  i === determination && styles.sliderDotCurrent,
                ]}
                onPress={() => updateEntry({ determination_level: i })}
              >
                {i === determination && <View style={styles.sliderThumb} />}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabelText}>😴</Text>
            <Text style={styles.sliderLabelText}>🦄</Text>
          </View>
        </View>

        {/* Intention */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Intention</Text>
          <Text style={styles.cardSub}>What kind of person are you being today?</Text>
          <TextInput
            testID="intention-input"
            style={styles.cardInput}
            value={entry?.intention || ''}
            onChangeText={t => setEntry({ ...entry, intention: t })}
            onBlur={() => updateEntry({ intention: entry?.intention })}
            placeholder="I am being..."
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>

        {/* 10x Focus */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>10x Focus</Text>
          <TextInput
            testID="focus-input"
            style={styles.focusInput}
            value={entry?.ten_x_focus || ''}
            onChangeText={t => setEntry({ ...entry, ten_x_focus: t })}
            onBlur={() => updateEntry({ ten_x_focus: entry?.ten_x_focus })}
            placeholder="The mission of today"
            placeholderTextColor={Colors.text.tertiary}
            multiline
          />
          <View style={styles.divider} />
          <Text style={styles.actionLabel}>Top 10x Action</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              testID="top-priority-check"
              style={[styles.checkbox, entry?.top_priority_completed && styles.checkboxChecked]}
              onPress={() => updateEntry({ top_priority_completed: !entry?.top_priority_completed })}
            >
              {entry?.top_priority_completed && <Ionicons name="checkmark" size={16} color={Colors.text.primary} />}
            </TouchableOpacity>
            <TextInput
              testID="top-action-input"
              style={styles.actionInput}
              value={entry?.top_10x_action_text || ''}
              onChangeText={t => setEntry({ ...entry, top_10x_action_text: t })}
              onBlur={() => updateEntry({ top_10x_action_text: entry?.top_10x_action_text })}
              placeholder="Clear executable task..."
              placeholderTextColor={Colors.text.tertiary}
            />
          </View>
        </View>

        {/* Five Core Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Five Core Actions</Text>
          {allFiveDone && (
            <View style={styles.unicornBadge}>
              <Text style={styles.unicornBadgeText}>🦄 UNICORN WIN!</Text>
            </View>
          )}
          {FIVE_ACTIONS.map(a => (
            <TouchableOpacity
              key={a.key}
              testID={`action-${a.key}`}
              style={styles.actionItem}
              onPress={() => toggleFiveItem(a.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, fiveStatuses[a.key] && styles.checkboxChecked]}>
                {fiveStatuses[a.key] && <Ionicons name="checkmark" size={16} color={Colors.text.primary} />}
              </View>
              <Ionicons name={a.icon as any} size={18} color={fiveStatuses[a.key] ? Colors.brand.primary : Colors.text.tertiary} />
              <Text style={[styles.actionItemText, fiveStatuses[a.key] && styles.actionDone]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Wormhole Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Wormhole</Text>
            <Ionicons name="planet" size={20} color={Colors.brand.accent} />
          </View>
          <TextInput
            testID="wormhole-action-input"
            style={styles.cardInput}
            value={entry?.wormhole_action_text || ''}
            onChangeText={t => setEntry({ ...entry, wormhole_action_text: t })}
            onBlur={() => updateEntry({ wormhole_action_text: entry?.wormhole_action_text })}
            placeholder="What did you do to leverage a relationship today?"
            placeholderTextColor={Colors.text.tertiary}
            multiline
          />
        </View>

        {/* Compound Habit */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Daily Compound</Text>
              <Text style={styles.habitName}>{habitTitle}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>{compoundStreak}</Text>
              <Text style={styles.streakLabel}>streak</Text>
            </View>
          </View>
          <TouchableOpacity
            testID="compound-check"
            style={styles.compoundRow}
            onPress={() => updateEntry({ compound_done: !entry?.compound_done })}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, entry?.compound_done && styles.checkboxChecked]}>
              {entry?.compound_done && <Ionicons name="checkmark" size={16} color={Colors.text.primary} />}
            </View>
            <Text style={[styles.compoundText, entry?.compound_done && styles.actionDone]}>
              Done today
            </Text>
          </TouchableOpacity>
          <TextInput
            testID="compound-notes-input"
            style={[styles.cardInput, { marginTop: 12 }]}
            value={entry?.compound_notes || ''}
            onChangeText={t => setEntry({ ...entry, compound_notes: t })}
            onBlur={() => updateEntry({ compound_notes: entry?.compound_notes })}
            placeholder="Notes (optional)"
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>

        {/* Distraction Reflection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Distraction Reflection</Text>
          <Text style={styles.cardSub}>Where did you get distracted?</Text>
          <TextInput
            testID="distraction-input"
            style={[styles.cardInput, { minHeight: 60 }]}
            value={entry?.distraction_notes || ''}
            onChangeText={t => setEntry({ ...entry, distraction_notes: t })}
            onBlur={() => updateEntry({ distraction_notes: entry?.distraction_notes })}
            placeholder="What pulled your focus..."
            placeholderTextColor={Colors.text.tertiary}
            multiline
          />
          <TouchableOpacity
            testID="course-correct-toggle"
            style={styles.toggleRow}
            onPress={() => updateEntry({ immediate_course_correction: !entry?.immediate_course_correction })}
          >
            <View style={[styles.toggle, entry?.immediate_course_correction && styles.toggleOn]}>
              <View style={[styles.toggleKnob, entry?.immediate_course_correction && styles.toggleKnobOn]} />
            </View>
            <Text style={styles.toggleText}>Did you course-correct immediately?</Text>
          </TouchableOpacity>
        </View>

        {/* AI Course Correction Button */}
        <TouchableOpacity
          testID="ai-correction-btn"
          style={styles.aiBtn}
          onPress={() => router.push({ pathname: '/ai-chat', params: { date: currentDate } })}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={24} color={Colors.text.primary} />
          <View style={styles.aiBtnTextWrap}>
            <Text style={styles.aiBtnTitle}>AI Course Correction</Text>
            <Text style={styles.aiBtnSub}>Get back on track with your AI coach</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
        </TouchableOpacity>

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={Colors.brand.primary} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingVertical: 8 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  dateBtnText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  dateCenter: { alignItems: 'center' },
  dateLabel: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '800', letterSpacing: 2 },
  todayLink: { color: Colors.brand.primary, fontSize: FontSize.xs, marginTop: 4 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: Radius.lg, borderWidth: 2,
    backgroundColor: Colors.bg.card, marginBottom: 20, gap: 8,
  },
  statusText: { fontSize: FontSize.xl, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 },
  unicornEmoji: { fontSize: 24 },
  overrideBtn: { position: 'absolute', right: 16 },
  statusPicker: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 8,
    marginBottom: 20, borderWidth: 1, borderColor: Colors.border.default,
  },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.md, gap: 10,
  },
  statusOptionActive: { backgroundColor: 'rgba(127,0,255,0.1)' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { color: Colors.text.primary, fontSize: FontSize.base },
  card: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border.default,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary, marginBottom: 8 },
  cardSub: { fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: 12 },
  cardInput: {
    backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14,
    color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default,
  },
  bigEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 4 },
  determinationValue: { textAlign: 'center', color: Colors.text.secondary, fontSize: FontSize.sm, marginBottom: 16 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  sliderDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default,
    justifyContent: 'center', alignItems: 'center',
  },
  sliderDotActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  sliderDotCurrent: {
    shadowColor: Colors.brand.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 6,
  },
  sliderThumb: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.text.primary },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderLabelText: { fontSize: 18 },
  focusInput: {
    backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14,
    color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700', minHeight: 60,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  divider: { height: 1, backgroundColor: Colors.border.default, marginVertical: 16 },
  actionLabel: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionInput: { flex: 1, color: Colors.text.primary, fontSize: FontSize.base },
  checkbox: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 2,
    borderColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.brand.primary },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  actionItemText: { color: Colors.text.primary, fontSize: FontSize.base, flex: 1 },
  actionDone: { textDecorationLine: 'line-through', color: Colors.text.tertiary },
  unicornBadge: {
    backgroundColor: 'rgba(127,0,255,0.15)', borderRadius: Radius.md, padding: 10,
    marginBottom: 12, alignItems: 'center',
  },
  unicornBadgeText: { color: Colors.brand.primary, fontWeight: '800', fontSize: FontSize.base },
  habitName: { color: Colors.text.secondary, fontSize: FontSize.sm },
  streakBadge: { alignItems: 'center', backgroundColor: 'rgba(127,0,255,0.1)', borderRadius: Radius.md, padding: 10 },
  streakText: { color: Colors.brand.primary, fontSize: FontSize.xxl, fontWeight: '900' },
  streakLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  compoundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  compoundText: { color: Colors.text.primary, fontSize: FontSize.base },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  toggle: {
    width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.bg.input,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: Colors.brand.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.text.secondary },
  toggleKnobOn: { backgroundColor: Colors.text.primary, alignSelf: 'flex-end' },
  toggleText: { color: Colors.text.secondary, fontSize: FontSize.sm, flex: 1 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.brand.primary,
  },
  aiBtnTextWrap: { flex: 1 },
  aiBtnTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  aiBtnSub: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 2 },
  savingIndicator: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 8,
  },
  savingText: { color: Colors.text.tertiary, fontSize: FontSize.sm },
});
