import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, Modal, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize, DETERMINATION_EMOJIS, STATUS_LABELS, STATUS_COLORS, FIVE_CORE_ACTIONS } from '../../src/constants/theme';
import { DeterminationSlider } from '../../src/components/DeterminationSlider';

const getToday = () => new Date().toISOString().split('T')[0];
const formatDate = (d: string) => {
  const date = new Date(d + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// Format date to MM/DD/YY
const formatDateMMDDYY = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

const STATUS_OPTIONS = ['ready', 'priority_win', '10x_unicorn_win', 'loss', 'lesson', 'course_corrected'];

export default function TodayScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(getToday());
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [compoundStreak, setCompoundStreak] = useState(0);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitTarget, setHabitTarget] = useState(0);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [showCompoundCounter, setShowCompoundCounter] = useState(false);
  const [compoundCountInput, setCompoundCountInput] = useState('');
  
  // Signals state
  const [signals, setSignals] = useState<any[]>([]);
  const [showAddSignal, setShowAddSignal] = useState(false);
  const [showEditSignal, setShowEditSignal] = useState<any>(null);
  const [signalForm, setSignalForm] = useState({ name: '', description: '', impact_rating: 5, deal_id: '', notes: '' });
  const [deals, setDeals] = useState<any[]>([]);
  const [topSignal, setTopSignal] = useState<any>(null);
  const [completedSignals, setCompletedSignals] = useState<Set<string>>(new Set());

  const isToday = currentDate === getToday();

  const loadEntry = useCallback(async () => {
    try {
      const [entryData, streakData, profile, signalsData, dealsData, completionsData] = await Promise.all([
        api.get(`/daily-entry/${currentDate}`),
        api.get('/compound-streak'),
        api.get('/profile'),
        api.get('/signals'),
        api.get('/deals'),
        api.get(`/signal-completions?date=${currentDate}`),
      ]);
      setEntry(entryData);
      setCompoundStreak(streakData.streak);
      setHabitTitle(streakData.habit?.habit_title || 'Daily Habit');
      setHabitTarget(streakData.habit?.target_number || 0);
      setProfileData(profile);
      setDeals(dealsData || []);
      
      // Track completed signals
      const completed = new Set((completionsData || []).map((c: any) => c.signal_id));
      setCompletedSignals(completed);
      
      // Filter signals for today - handle both YYYY-MM-DD and MM/DD/YY formats
      const todayFormatted = formatDateMMDDYY(new Date());
      // Convert currentDate (YYYY-MM-DD) to MM/DD/YY format for comparison
      const [year, month, day] = currentDate.split('-');
      const currentDateMMDDYY = `${month}/${day}/${year.slice(-2)}`;
      
      const todaySignals = (signalsData || []).filter((s: any) => 
        s.due_date === todayFormatted || 
        s.due_date === currentDate || 
        s.due_date === currentDateMMDDYY
      );
      setSignals(todaySignals);
      
      // Find top 10x action signal for today
      const top10x = (signalsData || []).find((s: any) => 
        s.is_top_10x_action && (
          s.due_date === todayFormatted || 
          s.due_date === currentDate || 
          s.due_date === currentDateMMDDYY
        )
      );
      setTopSignal(top10x);
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

  // Create Top 10x Action as a special signal
  const createTop10xSignal = async (actionText: string) => {
    try {
      const today = formatDateMMDDYY(new Date());
      const signal = await api.post('/signals', {
        name: actionText,
        description: 'Top 10x Action',
        impact_rating: 10,
        due_date: today,
        is_top_10x_action: true,
        is_public: true,
      });
      setTopSignal(signal);
      loadEntry();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Complete a signal
  const completeSignal = async (signalId: string) => {
    try {
      await api.post(`/signals/${signalId}/complete`, { notes: '' });
      loadEntry();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Uncomplete a signal (mark as not done)
  const uncompleteSignal = async (signalId: string) => {
    try {
      await api.post(`/signals/${signalId}/uncomplete`, {});
      setCompletedSignals(prev => {
        const newSet = new Set(prev);
        newSet.delete(signalId);
        return newSet;
      });
      loadEntry();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Update an existing signal
  const updateSignal = async (signalId: string, updates: any) => {
    try {
      await api.put(`/signals/${signalId}`, updates);
      setShowEditSignal(null);
      loadEntry();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Add a new signal
  const addSignal = async () => {
    if (!signalForm.name?.trim()) return;
    setSaving(true);
    try {
      const now = new Date();
      const hour = now.getHours();
      const defaultDate = hour >= 15 ? new Date(now.getTime() + 86400000) : now;
      
      await api.post('/signals', {
        name: signalForm.name,
        description: signalForm.description || '',
        impact_rating: signalForm.impact_rating,
        due_date: formatDateMMDDYY(defaultDate),
        deal_id: signalForm.deal_id || null,
        is_public: true,
        is_top_10x_action: false,
      });
      setShowAddSignal(false);
      setSignalForm({ name: '', description: '', impact_rating: 5, deal_id: '' });
      loadEntry();
    } catch (e: any) {
      Alert.alert('Error', e.message);
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
    
    // Auto-update final_status based on completed items
    const allDone = FIVE_CORE_ACTIONS.every(a => newStatuses[a.key]);
    const topDone = newStatuses['top_action'];
    
    if (allDone) {
      // All 5 items completed = 10x Unicorn Win
      updates.final_status = '10x_unicorn_win';
    } else if (topDone) {
      // Just top action completed = Priority Win
      updates.final_status = 'priority_win';
    } else if (entry?.final_status === '10x_unicorn_win' || entry?.final_status === 'priority_win') {
      // If unchecking items, reset to ready only if it was auto-set
      updates.final_status = 'ready';
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
  const fiveStatuses = entry?.five_item_statuses || {};
  const allFiveDone = FIVE_CORE_ACTIONS.every(a => fiveStatuses[a.key]);
  const topActionDone = fiveStatuses['top_action'];
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
            <Ionicons name="chevron-back" size={20} color={Colors.text.secondary} />
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
            <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Status Banner */}
        <LinearGradient
          colors={[
            finalStatus === '10x_unicorn_win' || finalStatus === 'unicorn_win' ? 'rgba(168,85,247,0.2)' : 
            finalStatus === 'priority_win' ? 'rgba(34,197,94,0.2)' : 
            'rgba(45,45,80,0.3)',
            'transparent'
          ]}
          style={styles.statusGradient}
        >
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
              <Ionicons name="create-outline" size={16} color={Colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

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

        {/* Determination Slider - Always visible */}
        <View style={styles.card}>
          <DeterminationSlider 
            testID="determination-slider"
            value={determination}
            onChange={(val) => updateEntry({ determination_level: val })}
          />
        </View>

        {/* Intention */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Who are you being today?</Text>
          <View style={styles.intentionRow}>
            <Text style={styles.intentionPrefix}>I am</Text>
            <TextInput
              testID="intention-input"
              style={styles.intentionInput}
              value={entry?.intention || ''}
              onChangeText={t => setEntry({ ...entry, intention: t })}
              onBlur={() => updateEntry({ intention: entry?.intention })}
              placeholder="confident and focused..."
              placeholderTextColor={Colors.text.tertiary}
            />
          </View>
        </View>

        {/* 10x Focus with Glowing Complete Button */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              <Text style={styles.redText}>10x</Text> Focus
            </Text>
            {(topSignal?.completed_at || entry?.top_priority_completed) ? (
              <View style={styles.completedFireBadge}>
                <Text style={styles.fireEmoji}>🔥</Text>
                <Text style={styles.completedText}>DONE</Text>
              </View>
            ) : topSignal ? (
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>+10 PTS</Text>
              </View>
            ) : null}
          </View>
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
          <Text style={styles.actionLabel}>Top 10x Action <Text style={styles.pointsHint}>(10 points)</Text></Text>
          <View style={styles.actionRow}>
            {/* Massive Glowing Complete Button */}
            <TouchableOpacity
              testID="top-priority-check"
              style={[
                styles.glowingCheckbox, 
                (topSignal?.completed_at || entry?.top_priority_completed) && styles.glowingCheckboxCompleted
              ]}
              onPress={async () => {
                if (topSignal) {
                  if (!topSignal.completed_at && !completedSignals.has(topSignal.id)) {
                    await completeSignal(topSignal.id);
                    setCompletedSignals(prev => new Set([...prev, topSignal.id]));
                    const newVal = true;
                    updateEntry({ 
                      top_priority_completed: newVal,
                      five_item_statuses: { ...fiveStatuses, top_action: newVal }
                    });
                  } else {
                    const newVal = !entry?.top_priority_completed;
                    updateEntry({ 
                      top_priority_completed: newVal,
                      five_item_statuses: { ...fiveStatuses, top_action: newVal }
                    });
                  }
                } else if (entry?.top_10x_action_text?.trim()) {
                  await createTop10xSignal(entry.top_10x_action_text);
                  const newVal = true;
                  updateEntry({ 
                    top_priority_completed: newVal,
                    five_item_statuses: { ...fiveStatuses, top_action: newVal }
                  });
                } else {
                  const newVal = !entry?.top_priority_completed;
                  updateEntry({ 
                    top_priority_completed: newVal,
                    five_item_statuses: { ...fiveStatuses, top_action: newVal }
                  });
                }
              }}
            >
              {(topSignal?.completed_at || entry?.top_priority_completed || completedSignals.has(topSignal?.id)) ? (
                <Text style={styles.glowingFireEmoji}>🔥</Text>
              ) : (
                <Ionicons name="checkmark" size={28} color={Colors.text.tertiary} />
              )}
            </TouchableOpacity>
            <TextInput
              testID="top-action-input"
              style={styles.actionInput}
              value={topSignal?.name || entry?.top_10x_action_text || ''}
              onChangeText={t => setEntry({ ...entry, top_10x_action_text: t })}
              onBlur={() => {
                if (!topSignal) {
                  updateEntry({ top_10x_action_text: entry?.top_10x_action_text });
                }
              }}
              placeholder="Clear executable task..."
              placeholderTextColor={Colors.text.tertiary}
              editable={!topSignal}
            />
            {/* Edit Signal Button */}
            {topSignal && (
              <TouchableOpacity
                testID="edit-top-signal-btn"
                style={styles.editSignalBtn}
                onPress={() => setShowEditSignal(topSignal)}
              >
                <Ionicons name="pencil" size={18} color={Colors.brand.primary} />
              </TouchableOpacity>
            )}
            {!topSignal && entry?.top_10x_action_text?.trim() && (
              <TouchableOpacity
                testID="set-top-signal-btn"
                style={styles.setSignalBtn}
                onPress={() => createTop10xSignal(entry.top_10x_action_text)}
              >
                <Text style={styles.setSignalBtnText}>Set</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Five Core Actions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.checkEmoji}>✅</Text>
              <Text style={styles.cardTitle}>10X UNICORN CHECKLIST</Text>
            </View>
            {allFiveDone && (
              <View style={[styles.winBadge, { backgroundColor: 'rgba(168,85,247,0.2)' }]}>
                <Text style={[styles.winBadgeText, { color: Colors.brand.primary }]}>🦄 UNICORN</Text>
              </View>
            )}
          </View>
          <Text style={styles.checklistHint}>
            All 5 = <Text style={{ color: Colors.brand.primary }}>🦄 10x Unicorn Win</Text>  •  Just #1 = <Text style={{ color: Colors.status.warning }}>⭐ Priority Win</Text>
          </Text>
          {allFiveDone && (
            <LinearGradient
              colors={['rgba(168,85,247,0.15)', 'transparent']}
              style={styles.unicornBanner}
            >
              <Text style={styles.unicornBannerText}>🦄 10x UNICORN WIN!</Text>
            </LinearGradient>
          )}
          {FIVE_CORE_ACTIONS.map((a, index) => (
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
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionItemText, fiveStatuses[a.key] && styles.actionDone]}>
                  {index + 1}. {a.label}
                </Text>
                {a.description && (
                  <Text style={styles.actionDesc}>{a.description}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Wormhole Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="planet" size={22} color={Colors.brand.accent} />
              <Text style={styles.cardTitle}>Wormhole</Text>
            </View>
            <TouchableOpacity 
              testID="wormhole-contacts-btn"
              style={styles.smallBtn}
              onPress={() => router.push('/(tabs)/wormhole')}
            >
              <Text style={styles.smallBtnText}>Contacts</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.brand.accent} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSub}>What did you do to leverage a relationship today?</Text>
          <TextInput
            testID="wormhole-action-input"
            style={styles.cardInput}
            value={entry?.wormhole_action_text || ''}
            onChangeText={t => setEntry({ ...entry, wormhole_action_text: t })}
            onBlur={() => updateEntry({ wormhole_action_text: entry?.wormhole_action_text })}
            placeholder="Describe your wormhole action..."
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
          
          {/* Quick counter with up/down buttons */}
          <View style={styles.compoundCounter}>
            <TouchableOpacity
              testID="compound-decrease"
              style={styles.counterCaretBtn}
              onPress={() => {
                const newCount = Math.max(0, (entry?.compound_count || 0) - 1);
                updateEntry({ compound_done: newCount > 0, compound_count: newCount });
              }}
            >
              <Ionicons name="chevron-down" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              testID="compound-count-display"
              style={styles.counterDisplay}
              onPress={() => {
                setCompoundCountInput((entry?.compound_count || 0).toString());
                setShowCompoundCounter(true);
              }}
            >
              <Text style={styles.counterValue}>{entry?.compound_count || 0}</Text>
              <Text style={styles.counterLabel}>
                {habitTarget > 0 ? `/ ${habitTarget}` : 'times'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              testID="compound-increase"
              style={styles.counterCaretBtn}
              onPress={() => {
                const newCount = (entry?.compound_count || 0) + 1;
                updateEntry({ compound_done: true, compound_count: newCount });
              }}
            >
              <Ionicons name="chevron-up" size={24} color={Colors.brand.primary} />
            </TouchableOpacity>
          </View>
          
          {habitTarget > 0 && (
            <View style={styles.progressBarWrap}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, ((entry?.compound_count || 0) / habitTarget) * 100)}%` }]} />
              </View>
              <Text style={styles.progressPercent}>
                {Math.round(((entry?.compound_count || 0) / habitTarget) * 100)}%
              </Text>
            </View>
          )}
          
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
          <LinearGradient
            colors={[Colors.brand.primary, Colors.brand.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiBtnGradient}
          >
            <Ionicons name="sparkles" size={24} color={Colors.text.primary} />
          </LinearGradient>
          <View style={styles.aiBtnTextWrap}>
            <Text style={styles.aiBtnTitle}>AI Course Correction</Text>
            <Text style={styles.aiBtnSub}>Get back on track with your AI coach</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
        </TouchableOpacity>

        {/* Today's Signals Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="flash" size={22} color={Colors.brand.accent} />
              <Text style={styles.cardTitle}>Today's Signals</Text>
            </View>
            <TouchableOpacity
              testID="add-signal-btn"
              style={styles.addSignalBtn}
              onPress={() => setShowAddSignal(true)}
            >
              <Ionicons name="add" size={20} color={Colors.brand.primary} />
              <Text style={styles.addSignalText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {signals.length === 0 ? (
            <View style={styles.emptySignals}>
              <Text style={styles.emptySignalsText}>No signals for today</Text>
              <Text style={styles.emptySignalsSub}>Add measurable actions to track your progress</Text>
            </View>
          ) : (
            signals.filter(s => !s.is_top_10x_action).map(signal => (
              <TouchableOpacity
                key={signal.id}
                testID={`signal-${signal.id}`}
                style={styles.signalItem}
                onPress={() => !signal.completed_at && completeSignal(signal.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, signal.completed_at && styles.checkboxChecked]}>
                  {signal.completed_at && <Ionicons name="checkmark" size={16} color={Colors.text.primary} />}
                </View>
                <View style={styles.signalInfo}>
                  <Text style={[styles.signalName, signal.completed_at && styles.actionDone]}>
                    {signal.name}
                  </Text>
                  {signal.deal_name && (
                    <Text style={styles.signalDeal}>🤝 {signal.deal_name}</Text>
                  )}
                </View>
                <View style={styles.signalPoints}>
                  <Text style={styles.signalPointsText}>+{signal.impact_rating}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          
          <TouchableOpacity
            testID="view-all-signals-btn"
            style={styles.viewAllBtn}
            onPress={() => router.push('/(tabs)/signals')}
          >
            <Text style={styles.viewAllText}>View All Signals</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.brand.accent} />
          </TouchableOpacity>
        </View>

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={Colors.brand.primary} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Signal Modal */}
      <Modal visible={showAddSignal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Signal</Text>
              <TouchableOpacity onPress={() => setShowAddSignal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Signal Name *</Text>
            <TextInput
              testID="signal-name-input"
              style={styles.modalInput}
              value={signalForm.name}
              onChangeText={t => setSignalForm({...signalForm, name: t})}
              placeholder="What will you accomplish?"
              placeholderTextColor={Colors.text.tertiary}
            />
            
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              testID="signal-desc-input"
              style={[styles.modalInput, { minHeight: 60 }]}
              value={signalForm.description}
              onChangeText={t => setSignalForm({...signalForm, description: t})}
              placeholder="Optional details..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
            />
            
            <Text style={styles.inputLabel}>Impact Rating (1-10): {signalForm.impact_rating}</Text>
            <View style={styles.ratingRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity
                  key={n}
                  testID={`rating-${n}`}
                  style={[styles.ratingBtn, signalForm.impact_rating === n && styles.ratingBtnActive]}
                  onPress={() => setSignalForm({...signalForm, impact_rating: n})}
                >
                  <Text style={[styles.ratingText, signalForm.impact_rating === n && styles.ratingTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {deals.length > 0 && (
              <>
                <Text style={styles.inputLabel}>Link to Deal (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.dealRow}>
                    <TouchableOpacity
                      style={[styles.dealChip, !signalForm.deal_id && styles.dealChipActive]}
                      onPress={() => setSignalForm({...signalForm, deal_id: ''})}
                    >
                      <Text style={[styles.dealChipText, !signalForm.deal_id && styles.dealChipTextActive]}>None</Text>
                    </TouchableOpacity>
                    {deals.map(d => (
                      <TouchableOpacity
                        key={d.id}
                        style={[styles.dealChip, signalForm.deal_id === d.id && styles.dealChipActive]}
                        onPress={() => setSignalForm({...signalForm, deal_id: d.id})}
                      >
                        <Text style={[styles.dealChipText, signalForm.deal_id === d.id && styles.dealChipTextActive]}>{d.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
            
            <TouchableOpacity
              testID="save-signal-btn"
              style={[styles.saveSignalBtn, !signalForm.name?.trim() && styles.saveSignalBtnDisabled]}
              onPress={addSignal}
              disabled={!signalForm.name?.trim()}
            >
              <Text style={styles.saveSignalBtnText}>Add Signal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Compound Habit Counter Modal */}
      <Modal visible={showCompoundCounter} animationType="fade" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.compoundModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How many times?</Text>
              <TouchableOpacity onPress={() => setShowCompoundCounter(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.compoundModalSubtext}>
              How many times did you do "{habitTitle}" today?
            </Text>
            
            <View style={styles.counterRow}>
              <TouchableOpacity
                testID="counter-minus"
                style={styles.counterBtn}
                onPress={() => setCompoundCountInput(Math.max(1, parseInt(compoundCountInput || '1') - 1).toString())}
              >
                <Ionicons name="remove" size={28} color={Colors.text.primary} />
              </TouchableOpacity>
              
              <TextInput
                testID="compound-count-input"
                style={styles.counterInput}
                value={compoundCountInput}
                onChangeText={setCompoundCountInput}
                keyboardType="numeric"
                textAlign="center"
              />
              
              <TouchableOpacity
                testID="counter-plus"
                style={styles.counterBtn}
                onPress={() => setCompoundCountInput((parseInt(compoundCountInput || '0') + 1).toString())}
              >
                <Ionicons name="add" size={28} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            {habitTarget > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (parseInt(compoundCountInput || '0') / habitTarget) * 100)}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {compoundCountInput || 0} / {habitTarget} ({Math.round((parseInt(compoundCountInput || '0') / habitTarget) * 100)}%)
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              testID="save-compound-btn"
              style={styles.saveBtn}
              onPress={() => {
                const count = parseInt(compoundCountInput || '1');
                updateEntry({ compound_done: true, compound_count: count });
                setShowCompoundCounter(false);
              }}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Signal Modal */}
      <Modal visible={!!showEditSignal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <ScrollView 
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Signal</Text>
                <TouchableOpacity onPress={() => setShowEditSignal(null)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Signal Name *</Text>
              <TextInput
                testID="edit-signal-name-input"
                style={styles.modalInput}
                value={showEditSignal?.name || ''}
                onChangeText={t => setShowEditSignal({ ...showEditSignal, name: t })}
                placeholder="What will you accomplish?"
                placeholderTextColor={Colors.text.tertiary}
              />
              
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                testID="edit-signal-desc-input"
                style={[styles.modalInput, { minHeight: 60 }]}
                value={showEditSignal?.description || ''}
                onChangeText={t => setShowEditSignal({ ...showEditSignal, description: t })}
                placeholder="Optional details..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
              />
              
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                testID="edit-signal-notes-input"
                style={[styles.modalInput, { minHeight: 80 }]}
                value={showEditSignal?.notes || ''}
                onChangeText={t => setShowEditSignal({ ...showEditSignal, notes: t })}
                placeholder="Additional notes..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
              />
              
              <Text style={styles.inputLabel}>Impact Rating (1-10): {showEditSignal?.impact_rating || 5}</Text>
              <View style={styles.ratingRow}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <TouchableOpacity
                    key={n}
                    testID={`edit-rating-${n}`}
                    style={[styles.ratingBtn, showEditSignal?.impact_rating === n && styles.ratingBtnActive]}
                    onPress={() => setShowEditSignal({ ...showEditSignal, impact_rating: n })}
                  >
                    <Text style={[styles.ratingText, showEditSignal?.impact_rating === n && styles.ratingTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Completion Status Toggle */}
              {showEditSignal?.completed_at && (
                <View style={styles.completionSection}>
                  <Text style={styles.completedBadge}>Completed</Text>
                  <TouchableOpacity
                    testID="uncomplete-signal-btn"
                    style={styles.uncompleteBtn}
                    onPress={async () => {
                      if (showEditSignal?.id) {
                        await uncompleteSignal(showEditSignal.id);
                        // Also update entry if this is the top 10x action
                        if (showEditSignal.is_top_10x_action) {
                          updateEntry({ 
                            top_priority_completed: false,
                            five_item_statuses: { ...entry?.five_item_statuses, top_action: false }
                          });
                        }
                        setShowEditSignal(null);
                      }
                    }}
                  >
                    <Ionicons name="flame" size={20} color="#F97316" />
                    <Text style={styles.uncompleteBtnText}>Mark as Incomplete</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity
                testID="save-edit-signal-btn"
                style={[styles.saveSignalBtn, !showEditSignal?.name?.trim() && styles.saveSignalBtnDisabled]}
                onPress={() => {
                  if (showEditSignal?.id && showEditSignal?.name?.trim()) {
                    updateSignal(showEditSignal.id, {
                      name: showEditSignal.name,
                      description: showEditSignal.description,
                      notes: showEditSignal.notes,
                      impact_rating: showEditSignal.impact_rating,
                    });
                  }
                }}
                disabled={!showEditSignal?.name?.trim()}
              >
                <Text style={styles.saveSignalBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <View style={{ height: 50 }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  
  // Date Navigation
  dateNav: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16, 
    paddingVertical: 8 
  },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  dateBtnText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  dateCenter: { alignItems: 'center' },
  dateLabel: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '800', letterSpacing: 2 },
  todayLink: { color: Colors.brand.primary, fontSize: FontSize.xs, marginTop: 4 },
  
  // Status
  statusGradient: { borderRadius: Radius.lg, marginBottom: 16 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: Radius.lg, borderWidth: 2,
    backgroundColor: Colors.bg.card, gap: 8,
  },
  statusText: { fontSize: FontSize.xl, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 },
  unicornEmoji: { fontSize: 24 },
  overrideBtn: { position: 'absolute', right: 16 },
  statusPicker: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 8,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border.default,
  },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.md, gap: 10,
  },
  statusOptionActive: { backgroundColor: 'rgba(168,85,247,0.1)' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { color: Colors.text.primary, fontSize: FontSize.base },
  
  // Cards
  card: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border.default,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary, marginBottom: 8 },
  redText: { color: Colors.brand.red },
  cardSub: { fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: 12 },
  cardInput: {
    backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14,
    color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default,
  },
  
  // Win Badges
  winBadge: { 
    backgroundColor: 'rgba(34,197,94,0.15)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: Radius.sm 
  },
  winBadgeText: { color: Colors.status.success, fontSize: FontSize.xs, fontWeight: '700' },
  
  // Focus Section
  focusInput: {
    backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14,
    color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700', minHeight: 60,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  divider: { height: 1, backgroundColor: Colors.border.default, marginVertical: 16 },
  actionLabel: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionInput: { flex: 1, color: Colors.text.primary, fontSize: FontSize.base },
  
  // Checkboxes
  checkbox: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 2,
    borderColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.brand.primary },
  
  // Action Items
  actionItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  actionTextWrap: { flex: 1 },
  actionItemText: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  actionDesc: { color: Colors.text.tertiary, fontSize: FontSize.sm, marginTop: 2 },
  actionDone: { textDecorationLine: 'line-through', color: Colors.text.tertiary },
  
  // Checklist styles
  checkEmoji: { fontSize: 18 },
  checklistHint: { 
    color: Colors.text.secondary, 
    fontSize: FontSize.xs, 
    marginBottom: 12,
    lineHeight: 18,
  },
  
  // Unicorn Banner
  unicornBanner: {
    borderRadius: Radius.md, padding: 12,
    marginBottom: 12, alignItems: 'center',
  },
  unicornBannerText: { color: Colors.brand.primary, fontWeight: '900', fontSize: FontSize.lg, letterSpacing: 2 },
  
  // Small Button
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  smallBtnText: { color: Colors.brand.accent, fontSize: FontSize.sm },
  
  // Habit/Streak
  habitName: { color: Colors.text.secondary, fontSize: FontSize.sm },
  streakBadge: { 
    alignItems: 'center', 
    backgroundColor: 'rgba(168,85,247,0.1)', 
    borderRadius: Radius.md, 
    padding: 10,
    minWidth: 60,
  },
  streakText: { color: Colors.brand.primary, fontSize: FontSize.xxl, fontWeight: '900' },
  streakLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  compoundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  compoundText: { color: Colors.text.primary, fontSize: FontSize.base },
  
  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  toggle: {
    width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.bg.input,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: Colors.brand.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.text.tertiary },
  toggleKnobOn: { backgroundColor: Colors.text.primary, alignSelf: 'flex-end' },
  toggleText: { color: Colors.text.secondary, fontSize: FontSize.sm, flex: 1 },
  
  // AI Button
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.brand.primary,
  },
  aiBtnGradient: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  aiBtnTextWrap: { flex: 1 },
  aiBtnTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  aiBtnSub: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 2 },
  
  // Saving Indicator
  savingIndicator: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 8,
  },
  savingText: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  
  // New styles for signals
  pointsHint: { color: Colors.brand.accent, fontSize: FontSize.xs, fontWeight: '400' },
  setSignalBtn: { 
    backgroundColor: Colors.brand.primary, 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: Radius.sm 
  },
  setSignalBtnText: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '600' },
  
  // Signals Section
  addSignalBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addSignalText: { color: Colors.brand.primary, fontSize: FontSize.sm, fontWeight: '600' },
  emptySignals: { paddingVertical: 20, alignItems: 'center' },
  emptySignalsText: { color: Colors.text.secondary, fontSize: FontSize.base },
  emptySignalsSub: { color: Colors.text.tertiary, fontSize: FontSize.sm, marginTop: 4 },
  signalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  signalInfo: { flex: 1 },
  signalName: { color: Colors.text.primary, fontSize: FontSize.base },
  signalDeal: { color: Colors.brand.accent, fontSize: FontSize.xs, marginTop: 2 },
  signalPoints: { 
    backgroundColor: 'rgba(168,85,247,0.15)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: Radius.sm 
  },
  signalPointsText: { color: Colors.brand.primary, fontSize: FontSize.sm, fontWeight: '700' },
  viewAllBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 16 },
  viewAllText: { color: Colors.brand.accent, fontSize: FontSize.sm },
  
  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'flex-end' 
  },
  modal: { 
    backgroundColor: Colors.bg.card, 
    borderTopLeftRadius: Radius.xl, 
    borderTopRightRadius: Radius.xl, 
    padding: 24, 
    maxHeight: '80%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  inputLabel: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14,
    color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default,
  },
  ratingRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  ratingBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bg.input, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border.default,
  },
  ratingBtnActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  ratingText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  ratingTextActive: { color: Colors.text.primary, fontWeight: '700' },
  dealRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  dealChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm,
    backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default,
  },
  dealChipActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  dealChipText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  dealChipTextActive: { color: Colors.text.primary },
  saveSignalBtn: {
    backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  saveSignalBtnDisabled: { opacity: 0.5 },
  saveSignalBtnText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  
  // NEW: Intention row styles
  intentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intentionPrefix: {
    color: Colors.text.secondary,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  intentionInput: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.md,
    padding: 14,
    color: Colors.text.primary,
    fontSize: FontSize.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  
  // NEW: Glowing complete button
  glowingCheckbox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bg.input,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  glowingCheckboxCompleted: {
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderColor: '#F97316',
  },
  glowingFireEmoji: {
    fontSize: 28,
  },
  
  // NEW: Fire badge for completed
  completedFireBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249,115,22,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  fireEmoji: {
    fontSize: 16,
  },
  completedText: {
    color: '#F97316',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  pointsBadge: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  pointsBadgeText: {
    color: Colors.brand.primary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  
  // NEW: Edit signal button
  editSignalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg.input,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  
  // Compound habit styles
  compoundTextWrap: { flex: 1 },
  compoundCountBadge: { 
    color: Colors.brand.primary, 
    fontSize: FontSize.xs, 
    marginTop: 2 
  },
  addMoreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  
  // Compound counter with up/down buttons
  compoundCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  counterCaretBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bg.input,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  counterDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  counterValue: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  counterLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    marginTop: -4,
  },
  progressBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.bg.input,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.brand.primary,
    borderRadius: 3,
  },
  progressPercent: {
    color: Colors.text.tertiary,
    fontSize: FontSize.sm,
    minWidth: 40,
    textAlign: 'right',
  },
  
  // Compound counter modal
  compoundModal: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.xl,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    alignSelf: 'center',
  },
  compoundModalSubtext: {
    color: Colors.text.secondary,
    fontSize: FontSize.sm,
    marginBottom: 24,
    textAlign: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  counterBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.bg.input,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  counterInput: {
    width: 100,
    height: 70,
    fontSize: 36,
    fontWeight: '900',
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.lg,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: Colors.brand.primary,
  },
  progressSection: { marginBottom: 24 },
  progressBar: {
    height: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brand.primary,
    borderRadius: 4,
  },
  progressText: {
    color: Colors.text.secondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.text.primary,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  
  // Edit Signal Modal styles
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  completionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  completedBadge: {
    color: Colors.status.success,
    fontSize: FontSize.sm,
    fontWeight: '700',
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  uncompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249,115,22,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  uncompleteBtnText: {
    color: '#F97316',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
