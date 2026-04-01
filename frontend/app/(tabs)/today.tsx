import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated as RNAnimated,
  Easing,
  FlatList,
  PanResponder,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../../src/utils/supabase';
import { useAuth } from '../../src/context/AuthContext';
import CosmicBackground from '../../src/components/CosmicBackground';
import UnicornHeader from '../../src/components/UnicornHeader';
import {
  dailyEntries,
  signals,
  contacts,
  goals,
  streaks,
  pointsDb,
} from '../../src/utils/database';
import {
  buildAIContext,
  getSuggestedPrompts,
  generateActionReport,
} from '../../src/utils/ai-companion';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  DETERMINATION_EMOJIS,
  FIVE_CORE_ACTIONS,
  STATUS_LABELS,
  STATUS_COLORS,
  SIGNAL_TYPE_LABELS,
} from '../../src/constants/theme';
import { DailyEntry, Signal, Contact, Goal, DayStatus } from '../../src/types/database';

const { width } = Dimensions.get('window');

// ─── 10X Unicorn Checklist items ────────────────────────────────────────────
const UNICORN_CHECKLIST = [
  { key: 'tenx', label: 'Top 10x Action Complete', sub: 'Set your 10x focus above' },
  { key: 'wormhole', label: 'Wormhole Relationship Activated', sub: 'Set contact below' },
  { key: 'future', label: '7-Min Future Self Meditation', sub: 'Connect with your highest self' },
  { key: 'tomorrow', label: 'Tomorrow Prepared', sub: "Plan tomorrow's priorities now" },
  { key: 'nodistraction', label: 'No Distraction / Course Corrected', sub: 'Locked in or recovered fast' },
];

const TODAY_SCREEN = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyEntry, setDailyEntry] = useState<DailyEntry | null>(null);
  const [todaysSignals, setTodaysSignals] = useState<Signal[]>([]);
  const [wormholeContacts, setWormholeContacts] = useState<Contact[]>([]);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionReport, setActionReport] = useState<string>('');
  const [showActionReport, setShowActionReport] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [contactSearchVisible, setContactSearchVisible] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [compoundEditing, setCompoundEditing] = useState(false);
  const [compoundInputText, setCompoundInputText] = useState('');
  const [goalCurrentEditing, setGoalCurrentEditing] = useState(false);
  const [goalCurrentText, setGoalCurrentText] = useState('');
  const [goalCurrentNumber, setGoalCurrentNumber] = useState(0);

  // Form state
  const [determination, setDetermination] = useState(5);
  const [tenXFocus, setTenXFocus] = useState('');
  const [tenXAction, setTenXAction] = useState('');
  const [tenXComplete, setTenXComplete] = useState(false);
  const [futureReflection, setFutureReflection] = useState('');
  const [futureComplete, setFutureComplete] = useState(false);
  const [dailyCompound, setDailyCompound] = useState(0);
  const [compoundTarget, setCompoundTarget] = useState(5);
  const [selectedWormholeContact, setSelectedWormholeContact] =
    useState<Contact | null>(null);
  const wormholePointsAwarded = useRef(false); // Only award wormhole pts once per day
  const [focusReflection, setFocusReflection] = useState('');
  const [distractionText, setDistractionText] = useState('');
  const [courseCorrected, setCourseCorrected] = useState(false);
  const [tomorrowPrepared, setTomorrowPrepared] = useState(false);
  const [checklistCollapsed, setChecklistCollapsed] = useState(false);

  // Animated gradient for WIN banner
  const winBannerAnim = useRef(new RNAnimated.Value(0)).current;
  // Seamless flowing gradient — translateX on a 2× wide gradient strip
  const winFlowAnim = useRef(new RNAnimated.Value(0)).current;
  const [winBannerWidth, setWinBannerWidth] = useState(320);
  const checklistBorderAnim = useRef(new RNAnimated.Value(0)).current;
  const [borderProgress, setBorderProgress] = useState(0);

  // Points today — loaded from actual points table
  const [pointsToday, setPointsToday] = useState(0);

  const loadPointsToday = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('points')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59');
      const total = (data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      setPointsToday(total);
    } catch (e) { console.error('Points load error:', e); }
  }, [user]);

  // Helper to award points AND update the local counter immediately
  const awardPoints = useCallback(async (amount: number, reason: string, refId?: string) => {
    if (!user) return;
    await pointsDb.award(user.id, amount, reason, refId);
    setPointsToday(prev => prev + amount);
  }, [user]);

  // Signal/Contact stats for glowing boxes
  const signalStats = useMemo(() => {
    const total = todaysSignals.length;
    const completed = todaysSignals.filter(s => s.status === 'complete').length;
    const totalPoints = todaysSignals.reduce((sum, s) => sum + (s.score || 5), 0);
    return { total, completed, totalPoints };
  }, [todaysSignals]);

  const contactStats = useMemo(() => {
    const total = wormholeContacts.length;
    const strongContacts = wormholeContacts.filter(c => (c.connection_level as any) >= 7).length;
    return { total, strongContacts, hasWormhole: !!selectedWormholeContact };
  }, [wormholeContacts, selectedWormholeContact]);

  const dateStr = selectedDate.toISOString().split('T')[0];
  const isToday = dateStr === new Date().toISOString().split('T')[0];

  // ─── 10X Unicorn Checklist computed state ─────────────────────────────────
  const unicornChecklist = useMemo(() => {
    const hasCompletedSignal = todaysSignals.some((s) => s.status === 'complete');
    return {
      tenx: tenXComplete,
      wormhole: !!selectedWormholeContact,
      future: futureComplete,
      tomorrow: tomorrowPrepared,
      nodistraction: courseCorrected,
    };
  }, [tenXComplete, selectedWormholeContact, futureComplete, tomorrowPrepared, courseCorrected]);

  const completedCount = Object.values(unicornChecklist).filter(Boolean).length;

  // Auto-compute day status from checklist
  const computedDayStatus = useMemo((): DayStatus => {
    if (completedCount === 5) return 'ten_x_unicorn_win';
    if (completedCount >= 3) return 'stacking_wins';
    if (tenXComplete && completedCount === 1) return 'priority_win';
    if (determination >= 5 || completedCount >= 1) return 'ready';
    return 'not_prepared';
  }, [completedCount, determination, tenXComplete]);

  // Filtered contacts for search
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return wormholeContacts;
    const q = contactSearch.toLowerCase();
    return wormholeContacts.filter(
      (c) => (c.full_name || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q)
    );
  }, [wormholeContacts, contactSearch]);

  // Award / deduct bonus for 10x Unicorn Win (all 5 checklist items)
  const prevCompletedRef = useRef(0);
  useEffect(() => {
    if (completedCount === 5 && prevCompletedRef.current < 5 && user && dailyEntry) {
      awardPoints(25, '10x_unicorn_win_bonus', dailyEntry.id);
      saveDailyEntry({ status: 'ten_x_unicorn_win' });
    } else if (completedCount < 5 && prevCompletedRef.current === 5 && user && dailyEntry) {
      // Lost the WIN — deduct the 25 bonus
      awardPoints(-25, '10x_unicorn_win_bonus_lost', dailyEntry.id);
    } else if (completedCount >= 3 && prevCompletedRef.current < 3 && user && dailyEntry) {
      saveDailyEntry({ status: 'stacking_wins' });
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount]);

  // Animate WIN banner gradient + checklist border when all 5 complete
  useEffect(() => {
    if (completedCount === 5) {
      setChecklistCollapsed(true);
      // Fade in the win banner
      RNAnimated.timing(winBannerAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }).start();
      // Seamless flowing gradient — translateX from 0 → -bannerWidth on a 2× wide strip
      // First color === last color so the loop reset is invisible
      winFlowAnim.setValue(0);
      const flowLoop = RNAnimated.loop(
        RNAnimated.timing(winFlowAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        })
      );
      flowLoop.start();
      // Racing border animation
      const borderLoop = RNAnimated.loop(
        RNAnimated.timing(checklistBorderAnim, { toValue: 1, duration: 2000, useNativeDriver: false })
      );
      borderLoop.start();
      const borderListenerId = checklistBorderAnim.addListener(({ value }) => setBorderProgress(value));
      return () => {
        flowLoop.stop();
        borderLoop.stop();
        checklistBorderAnim.removeListener(borderListenerId);
      };
    } else {
      winBannerAnim.setValue(0);
      winFlowAnim.setValue(0);
    }
  }, [completedCount === 5]);

  // Award / deduct determination bonus at level 10
  const prevDeterminationRef = useRef(0);
  useEffect(() => {
    if (determination === 10 && prevDeterminationRef.current < 10 && user && dailyEntry) {
      awardPoints(3, 'determination_level_10', dailyEntry.id);
    } else if (determination < 10 && prevDeterminationRef.current === 10 && user && dailyEntry) {
      awardPoints(-3, 'determination_level_10_lost', dailyEntry.id);
    }
    prevDeterminationRef.current = determination;
  }, [determination]);

  // Load data
  useEffect(() => {
    loadDailyData();
  }, [selectedDate, user]);

  const loadDailyData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: entry, error } = await dailyEntries.getOrCreate(user.id, dateStr);
      if (error || !entry) {
        console.error('Error loading daily entry:', error);
        setLoading(false);
        return;
      }
      setDailyEntry(entry);
      setDetermination(entry.determination_level || 5);
      setTenXFocus(entry.ten_x_action || '');
      const checklist0 = entry.checklist as any || {};
      setTenXAction(checklist0.ten_x_action_text || '');
      setTenXComplete(entry.ten_x_action_completed || false);
      setFutureReflection(entry.future_self_journal || '');
      setFutureComplete(entry.future_self_completed || false);
      setDailyCompound(entry.compound_count || 0);
      setFocusReflection(entry.focus_reflection || '');
      // tomorrow_prepared, course_corrected, distraction_notes don't exist in DB
      // They're now stored in the checklist jsonb field
      const checklist = entry.checklist as any || {};
      setTomorrowPrepared(checklist.tomorrow_prepared || false);
      setCourseCorrected(checklist.course_corrected || false);
      setDistractionText(checklist.distraction_notes || '');

      const { data: daySignalsData } = await signals.getByDate(user.id, dateStr);
      setTodaysSignals(daySignalsData || []);

      const { data: whContactsData } = await contacts.getWormhole(user.id);
      setWormholeContacts(whContactsData || []);
      if (entry.wormhole_contact_id && whContactsData) {
        const selected = whContactsData.find((c) => c.id === entry.wormhole_contact_id);
        setSelectedWormholeContact(selected || null);
        // If a wormhole contact was already set today, don't re-award points on re-select
        if (selected) wormholePointsAwarded.current = true;
      } else {
        wormholePointsAwarded.current = false;
      }

      const { data: goal } = await goals.getActive(user.id);
      setActiveGoal(goal || null);
      if (goal) setGoalCurrentNumber((goal as any).current_number || 0);

      const { data: profileData } = await supabase.from('profiles').select('daily_compound_target').eq('id', user.id).single();
      setCompoundTarget(profileData?.daily_compound_target || 5);

      // Load actual points earned today
      await loadPointsToday();

      if (showActionReport && entry.determination) {
        const { data: fullProfileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: goalData } = await goals.getActive(user.id);
        const context = buildAIContext(fullProfileData || null, goalData || null, entry);
        const report = await generateActionReport(context, todaysSignals);
        setActionReport(report);
      }
    } catch (error) {
      console.error('Error loading daily data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDailyData().finally(() => setRefreshing(false));
  }, [selectedDate, user]);

  // Save helpers
  const saveDailyEntry = async (updates: Partial<DailyEntry>) => {
    if (!user || !dailyEntry) return;
    try {
      const { data: updated, error } = await dailyEntries.update(dailyEntry.id, updates);
      if (error) throw error;
      if (updated) setDailyEntry(updated);
    } catch (error) {
      console.error('Error saving daily entry:', error);
    }
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const handleDeterminationChange = (value: number) => {
    setDetermination(value);
    saveDailyEntry({ determination_level: value });
  };

  const handleTenXFocusChange = (text: string) => { setTenXFocus(text); };
  const handleTenXActionChange = (text: string) => { setTenXAction(text); };
  const saveTenXAction = async () => {
    const checklist = (dailyEntry?.checklist as any) || {};
    checklist.ten_x_action_text = tenXAction;
    await saveDailyEntry({ checklist });
  };
  const handleTenXComplete = async () => {
    const v = !tenXComplete;
    setTenXComplete(v);
    await saveDailyEntry({ ten_x_action_completed: v });
    if (user) {
      // Award on check, deduct on uncheck — prevents duplicate points
      awardPoints(v ? 10 : -10, '10x_action_completed', dailyEntry?.id);
    }
  };
  const handleFutureReflectionChange = (text: string) => { setFutureReflection(text); };
  const handleFutureComplete = async () => {
    const v = !futureComplete;
    setFutureComplete(v);
    await saveDailyEntry({ future_self_completed: v });
    if (user) {
      awardPoints(v ? 3 : -3, 'future_self_completed', dailyEntry?.id);
    }
  };
  const handleDailyCompoundChange = async (delta: number) => {
    const oldVal = dailyCompound;
    const v = Math.max(0, dailyCompound + delta);
    setDailyCompound(v);
    await saveDailyEntry({ compound_count: v });
    updateGoalProgress(v);
    if (user && compoundTarget > 0) {
      const oldPct = (oldVal / compoundTarget) * 100;
      const newPct = (v / compoundTarget) * 100;
      // 1 point per 10% bracket crossed
      const oldBrackets = Math.floor(oldPct / 10);
      const newBrackets = Math.floor(newPct / 10);
      const bracketDiff = newBrackets - oldBrackets;
      if (bracketDiff !== 0) {
        awardPoints(bracketDiff, 'daily_compound_progress', dailyEntry?.id);
      }
      // 10 bonus for hitting target, -10 for dropping below
      if (v >= compoundTarget && oldVal < compoundTarget) {
        awardPoints(10, 'daily_compound_target_hit', dailyEntry?.id);
      } else if (oldVal >= compoundTarget && v < compoundTarget) {
        awardPoints(-10, 'daily_compound_target_lost', dailyEntry?.id);
      }
    }
  };
  const handleCompoundManualInput = async () => {
    const oldVal = dailyCompound;
    const v = Math.max(0, parseInt(compoundInputText, 10) || 0);
    setDailyCompound(v);
    setCompoundEditing(false);
    await saveDailyEntry({ compound_count: v });
    updateGoalProgress(v);
    if (user && compoundTarget > 0) {
      const oldPct = (oldVal / compoundTarget) * 100;
      const newPct = (v / compoundTarget) * 100;
      const oldBrackets = Math.floor(oldPct / 10);
      const newBrackets = Math.floor(newPct / 10);
      const bracketDiff = newBrackets - oldBrackets;
      if (bracketDiff !== 0) {
        awardPoints(bracketDiff, 'daily_compound_progress', dailyEntry?.id);
      }
      if (v >= compoundTarget && oldVal < compoundTarget) {
        awardPoints(10, 'daily_compound_target_hit', dailyEntry?.id);
      } else if (oldVal >= compoundTarget && v < compoundTarget) {
        awardPoints(-10, 'daily_compound_target_lost', dailyEntry?.id);
      }
    }
  };
  const updateGoalProgress = async (compoundVal?: number) => {
    if (!activeGoal || !activeGoal.target_number) return;
    // Progress = current number / target number
    const current = goalCurrentNumber;
    const pct = Math.min(100, Math.round((current / activeGoal.target_number) * 100));
    await goals.update(activeGoal.id, { progress: pct });
    setActiveGoal({ ...activeGoal, progress: pct });
  };
  const handleGoalCurrentChange = async (delta: number) => {
    const v = Math.max(0, goalCurrentNumber + delta);
    setGoalCurrentNumber(v);
    if (activeGoal && activeGoal.target_number) {
      const oldPct = activeGoal.progress || 0;
      const pct = Math.min(100, Math.round((v / activeGoal.target_number) * 100));
      await goals.update(activeGoal.id, { progress: pct, current_number: v } as any);
      setActiveGoal({ ...activeGoal, progress: pct });
      if (user && pct !== oldPct) {
        const pctDiff = pct - oldPct; // positive = gain, negative = loss
        awardPoints(pctDiff * 3, 'goal_progress', activeGoal.id);
      }
    }
  };
  const handleGoalCurrentManualInput = async () => {
    const v = Math.max(0, parseFloat(goalCurrentText) || 0);
    setGoalCurrentNumber(v);
    setGoalCurrentEditing(false);
    if (activeGoal && activeGoal.target_number) {
      const oldPct = activeGoal.progress || 0;
      const pct = Math.min(100, Math.round((v / activeGoal.target_number) * 100));
      await goals.update(activeGoal.id, { progress: pct, current_number: v } as any);
      setActiveGoal({ ...activeGoal, progress: pct });
      // Award/deduct based on % change from manual edit
      if (user && pct !== oldPct) {
        const pctDiff = pct - oldPct;
        awardPoints(pctDiff * 3, 'goal_progress', activeGoal.id);
      }
    }
  };
  const SIGNAL_POINTS: Record<string, number> = {
    revenue_generating: 10,
    '10x_action': 8,
    marketing: 5,
    relational: 5,
    general_business: 3,
  };
  const handleSignalToggle = async (signal: Signal) => {
    const newStatus = signal.status === 'complete' ? 'not_started' : 'complete';
    const { data: updated } = await signals.update(signal.id, { status: newStatus });
    if (updated) {
      setTodaysSignals(todaysSignals.map((s) => (s.id === signal.id ? updated : s)));
      // Award on complete, deduct on revert — prevents duplicate points
      if (user) {
        const pts = signal.score || SIGNAL_POINTS[signal.type] || 5;
        awardPoints(
          newStatus === 'complete' ? pts : -pts,
          `signal_${signal.type}_completed`,
          signal.id
        );
      }
    }
  };
  const handleWormholeSelect = async (contact: Contact) => {
    setSelectedWormholeContact(contact);
    setContactSearchVisible(false);
    setContactSearch('');
    await saveDailyEntry({ wormhole_contact_id: contact.id });
    // Award wormhole points only once per day — not on every re-select
    if (user && !wormholePointsAwarded.current) {
      awardPoints(5, 'wormhole_activated', dailyEntry?.id);
      wormholePointsAwarded.current = true;
    }
  };
  const handleFocusReflectionChange = (text: string) => { setFocusReflection(text); };
  const handleTomorrowPrepared = async () => {
    const v = !tomorrowPrepared;
    setTomorrowPrepared(v);
    const checklist = (dailyEntry?.checklist as any) || {};
    checklist.tomorrow_prepared = v;
    await saveDailyEntry({ checklist });
    if (user) {
      awardPoints(v ? 2 : -2, 'tomorrow_prepared', dailyEntry?.id);
    }
  };
  const handleCourseCorrected = async () => {
    const v = !courseCorrected;
    setCourseCorrected(v);
    const checklist = (dailyEntry?.checklist as any) || {};
    checklist.course_corrected = v;
    await saveDailyEntry({ checklist });
    if (user) {
      awardPoints(v ? 2 : -2, 'course_corrected', dailyEntry?.id);
    }
  };
  const saveTenXFocus = async () => { await saveDailyEntry({ ten_x_action: tenXFocus }); };
  const saveFutureReflection = async () => { await saveDailyEntry({ future_self_journal: futureReflection }); };
  const saveFocusReflection = async () => { await saveDailyEntry({ focus_reflection: focusReflection }); };
  const saveDistraction = async () => {
    // Store in checklist jsonb field
    const checklist = (dailyEntry?.checklist as any) || {};
    checklist.distraction_notes = distractionText;
    await saveDailyEntry({ checklist });
  };

  const handleStatusSelect = async (status: DayStatus) => {
    setStatusPickerVisible(false);
    await saveDailyEntry({ status });
  };

  const handleOpenActionReport = async () => {
    if (!user) return;
    setShowActionReport(true);
    try {
      const profileData = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const goalData = await goals.getActive(user.id);
      const context = buildAIContext(profileData?.data || null, goalData?.data || null, dailyEntry);
        const report = await generateActionReport(context, todaysSignals);
      setActionReport(report);
    } catch (error) {
      console.error('Error generating action report:', error);
    }
  };

  // ─── Signal edit/manage from Today screen ─────────────────────────────────
  const [editSignalVisible, setEditSignalVisible] = useState(false);
  const [editSignalData, setEditSignalData] = useState<Partial<Signal>>({});
  const [addSignalVisible, setAddSignalVisible] = useState(false);
  const [allActiveSignals, setAllActiveSignals] = useState<Signal[]>([]);
  const [changeDateSignal, setChangeDateSignal] = useState<Signal | null>(null);
  const [changeDateValue, setChangeDateValue] = useState('');

  const openEditSignal = (signal: Signal) => {
    setEditSignalData({ ...signal });
    setEditSignalVisible(true);
  };

  const saveEditSignal = async () => {
    if (!editSignalData.id) return;
    try {
      const { data: updated } = await signals.update(editSignalData.id, {
        title: editSignalData.title,
        details: editSignalData.details,
        type: editSignalData.type,
        score: editSignalData.score,
        due_date: editSignalData.due_date,
      });
      if (updated) {
        setTodaysSignals(todaysSignals.map((s) => (s.id === updated.id ? updated : s)));
      }
      setEditSignalVisible(false);
    } catch (error) {
      console.error('Error updating signal:', error);
      Alert.alert('Error', 'Failed to update signal');
    }
  };

  const deleteSignal = async (signal: Signal) => {
    Alert.alert('Delete Signal', `Remove "${signal.title}"?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await signals.delete(signal.id);
            setTodaysSignals(todaysSignals.filter((s) => s.id !== signal.id));
          } catch (error) {
            console.error('Error deleting signal:', error);
          }
        },
      },
    ]);
  };

  const openAddSignalToday = async () => {
    if (!user) return;
    try {
      const { data: allSignals } = await signals.list(user.id, { status: 'in_progress' });
      const notStarted = await signals.list(user.id, { status: 'not_started' });
      const combined = [...(allSignals || []), ...(notStarted?.data || [])];
      // Filter out signals already assigned to today
      const todayIds = new Set(todaysSignals.map((s) => s.id));
      setAllActiveSignals(combined.filter((s) => !todayIds.has(s.id)));
      setAddSignalVisible(true);
    } catch (error) {
      console.error('Error loading signals:', error);
    }
  };

  const addSignalToToday = async (signal: Signal) => {
    try {
      const { data: updated } = await signals.update(signal.id, { due_date: dateStr });
      if (updated) {
        setTodaysSignals([...todaysSignals, updated]);
        setAllActiveSignals(allActiveSignals.filter((s) => s.id !== signal.id));
      }
    } catch (error) {
      console.error('Error adding signal to today:', error);
    }
  };

  const openChangeDate = (signal: Signal) => {
    setChangeDateSignal(signal);
    setChangeDateValue(signal.due_date || dateStr);
  };

  const saveChangeDate = async () => {
    if (!changeDateSignal) return;
    try {
      const { data: updated } = await signals.update(changeDateSignal.id, { due_date: changeDateValue });
      if (updated) {
        // If moved to a different day, remove from today's list
        if (changeDateValue !== dateStr) {
          setTodaysSignals(todaysSignals.filter((s) => s.id !== changeDateSignal.id));
        } else {
          setTodaysSignals(todaysSignals.map((s) => (s.id === updated.id ? updated : s)));
        }
      }
      setChangeDateSignal(null);
    } catch (error) {
      console.error('Error changing date:', error);
    }
  };

  // Draggable determination slider
  const sliderRef = useRef<View>(null);
  const sliderWidth = useRef(width - 72);
  const sliderAbsLeft = useRef(0);
  // Stable ref to avoid stale closures inside PanResponder
  const handleDeterminationChangeRef = useRef<(v: number) => void>(() => {});
  useEffect(() => {
    handleDeterminationChangeRef.current = handleDeterminationChange;
  });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const touchPageX = e.nativeEvent.pageX;
        // measure() gives the true absolute position — fixes drop-to-1 caused by
        // locationX being wrong when touch lands on the overflowing thumb element
        sliderRef.current?.measure((_fx, _fy, w, _h, pageX) => {
          sliderAbsLeft.current = pageX;
          sliderWidth.current = w || sliderWidth.current;
          const x = touchPageX - pageX;
          const pct = Math.max(0, Math.min(1, x / sliderWidth.current));
          const val = Math.max(1, Math.min(10, Math.round(pct * 9) + 1));
          handleDeterminationChangeRef.current(val);
        });
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.pageX - sliderAbsLeft.current;
        const pct = Math.max(0, Math.min(1, x / sliderWidth.current));
        const val = Math.max(1, Math.min(10, Math.round(pct * 9) + 1));
        handleDeterminationChangeRef.current(val);
      },
    })
  ).current;

  // Battery-style gradient: level 1 = solid red (dead), level 10 = full green (charged)
  // Each level adds one more color stop, showing only the range up to current level
  const SLIDER_LEVEL_COLORS = [
    '#FF0000', // 1 — pure red (dead battery)
    '#FF1A00', // 2
    '#FF3300', // 3 — red-orange
    '#FF6600', // 4 — orange
    '#FF9900', // 5 — amber, no green
    '#FFCC00', // 6 — yellow
    '#CCDD00', // 7 — yellow-green (more yellow)
    '#88CC00', // 8 — yellow-green
    '#44DD44', // 9 — green with yellow tint
    '#00FF88', // 10 — pure neon green (full charge)
  ];
  const getSliderColors = (): [string, string, ...string[]] => {
    const stops = SLIDER_LEVEL_COLORS.slice(0, determination);
    if (stops.length === 1) return [stops[0], stops[0]];
    return stops as [string, string, ...string[]];
  };

  const getDayStatusColor = (status?: string) => STATUS_COLORS[status || ''] || Colors.text.tertiary;

  const formatDate = (date: Date) => {
    if (isToday) return 'TODAY';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  };

  const DAY_STATUS_OPTIONS: { value: DayStatus; label: string }[] = [
    { value: 'not_prepared', label: 'Not Prepared' },
    { value: 'ready', label: 'Ready' },
    { value: 'stacking_wins', label: 'Stacking Wins' },
    { value: 'priority_win', label: '⭐ Priority Win' },
    { value: 'ten_x_unicorn_win', label: '🦄 10x Unicorn Win' },
    { value: 'course_corrected_win', label: '🔄 Course Corrected Win' },
    { value: 'lesson_win', label: '📖 Lesson Win' },
    { value: 'miss', label: '❌ Miss' },
  ];

  const statusColor = getDayStatusColor(dailyEntry?.status);
  const determinationMessages: Record<number, string> = {
    1: "Every champion starts somewhere. You showed up.",
    2: "Slow progress is still progress. Keep going.",
    3: "Building momentum. One step at a time.",
    4: "You're warming up. The engine is starting.",
    5: "Halfway there. Push through the middle.",
    6: "Above average. You're in the game.",
    7: "Strong energy today. Keep this going.",
    8: "On fire. Nothing can stop you.",
    9: "Diamond level focus. Rare air.",
    10: "UNICORN MODE. The universe is aligning for you!",
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <CosmicBackground>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <UnicornHeader>
        <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.text.primary }}>Daily</Text>
      </UnicornHeader>
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.primary} />}
      >
        {/* ── Date Navigation ─────────────────────────────────────────── */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => handleDateChange('prev')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={styles.dateNavBtn}>
              <Ionicons name="chevron-back" size={18} color={Colors.text.secondary} />
              <Text style={styles.dateNavLabel}>Yesterday</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.dateTitle}>{formatDate(selectedDate)}</Text>
          <TouchableOpacity onPress={() => handleDateChange('next')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={styles.dateNavBtn}>
              <Text style={styles.dateNavLabel}>Tomorrow</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.text.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 10xUnicorn WIN! Banner OR Day Status Banner ────────────── */}
        {completedCount === 5 ? (
          <RNAnimated.View
            style={[styles.winBanner, { opacity: winBannerAnim, overflow: 'hidden' }]}
            onLayout={(e) => setWinBannerWidth(e.nativeEvent.layout.width)}
          >
            {/* 2× wide gradient strip slides left — first=last color for seamless loop */}
            <RNAnimated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  transform: [{
                    translateX: winFlowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -winBannerWidth],
                    }),
                  }],
                },
              ]}
            >
              <LinearGradient
                colors={['#A855F7', '#E040FB', '#FFB800', '#00FF88', '#00BFFF', '#A855F7', '#E040FB', '#FFB800', '#00FF88', '#00BFFF', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: winBannerWidth * 2, height: '100%' }}
              />
            </RNAnimated.View>
            <Text style={[styles.winBannerText, { zIndex: 2 }]}>🦄 10xUnicorn WIN! 🏆</Text>
          </RNAnimated.View>
        ) : dailyEntry ? (
          <TouchableOpacity onPress={() => setStatusPickerVisible(true)} activeOpacity={0.8}>
            <View style={[styles.statusBanner, { borderColor: statusColor + '40' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {(STATUS_LABELS[dailyEntry.status] || 'NOT PREPARED').toUpperCase()}
              </Text>
              <Ionicons name="create-outline" size={18} color={Colors.text.tertiary} />
            </View>
          </TouchableOpacity>
        ) : null}

        {/* ── Glowing Stat Boxes ──────────────────────────────────────── */}
        <View style={styles.glowStatsRow}>
          <LinearGradient
            colors={['#A855F720', '#A855F708']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glowStatBox}
          >
            <Text style={styles.glowStatValue}>{signalStats.completed}/{signalStats.total}</Text>
            <Text style={styles.glowStatLabel}>Signals Done</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#06B6D420', '#06B6D408']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glowStatBox}
          >
            <Text style={styles.glowStatValue}>{pointsToday}</Text>
            <Text style={styles.glowStatLabel}>Points Today</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#00E67620', '#00E67608']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glowStatBox}
          >
            <Text style={styles.glowStatValue}>{contactStats.total}</Text>
            <Text style={styles.glowStatLabel}>Contacts</Text>
          </LinearGradient>
        </View>

        {/* ── Determination Level ─────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.determinationHeader}>
            <Text style={styles.heroLabel}>DETERMINATION LEVEL</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.determinationEmoji}>{DETERMINATION_EMOJIS[determination] || '🔥'}</Text>
              <Text style={[styles.determinationNumber, { color: Colors.brand.primary }]}>{determination}</Text>
            </View>
          </View>

          {/* Gradient slider track — draggable */}
          <View
            ref={sliderRef}
            style={styles.sliderOuter}
            {...panResponder.panHandlers}
            onLayout={(e) => { sliderWidth.current = e.nativeEvent.layout.width; }}
          >
            {/* Full-spectrum dim background track */}
            <LinearGradient
              colors={['#FF4B4B', '#FF6B35', '#FFB800', '#BFFF00', '#00E676', '#00FF88']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.sliderTrackBg]}
            />
            {/* Bright filled portion */}
            <LinearGradient
              colors={['#FF4B4B', '#FF6B35', '#FFB800', '#BFFF00', '#00E676', '#00FF88']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.sliderGradient, { width: `${(determination / 10) * 100}%` }]}
            />
            <View style={[
              styles.sliderThumb,
              { left: `${Math.max(0, Math.min(97, (determination / 10) * 100 - 3))}%` },
              determination === 10 && styles.sliderThumbRainbow,
            ]}>
              <Text style={{ fontSize: 20 }}>{DETERMINATION_EMOJIS[determination]}</Text>
            </View>
          </View>

          <View style={styles.sliderLabels}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 14 }}>🤕</Text>
              <Text style={styles.sliderEndLabel}> Low</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 14 }}>🦄</Text>
              <Text style={styles.sliderEndLabel}> Level 10</Text>
            </View>
          </View>

          {/* Number buttons */}
          <View style={styles.dotRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => handleDeterminationChange(num)}
                style={[styles.dotButton, determination === num && styles.dotButtonActive]}
              >
                <Text style={[styles.dotText, determination === num && styles.dotTextActive]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Motivational message */}
          <View style={styles.motivationBar}>
            <Text style={styles.motivationText}>{determinationMessages[determination]}</Text>
          </View>
        </View>

        {/* ── Who Are You Being Today? ────────────────────────────────── */}
        <View style={[styles.heroCard, { marginTop: Spacing.lg, paddingVertical: Spacing.xl, borderColor: Colors.brand.primary + '40' }]}>
          <Text style={{ fontSize: 14, color: Colors.text.tertiary, letterSpacing: 2, fontWeight: '600', textAlign: 'center', marginBottom: 12 }}>WHO ARE YOU BEING TODAY?</Text>
          <View style={styles.iAmRow}>
            <LinearGradient
              colors={[Colors.brand.primary, '#E040FB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.iAmBadge}
            >
              <Text style={styles.iAmPrefixBold}>I AM</Text>
            </LinearGradient>
            <TextInput
              style={styles.iAmInput}
              placeholder="Aligned, focused, committed..."
              placeholderTextColor={Colors.text.muted}
              value={focusReflection}
              onChangeText={handleFocusReflectionChange}
              onBlur={saveFocusReflection}
            />
          </View>
        </View>

        {/* ── 10x Focus ───────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={[styles.heroLabel, { color: Colors.brand.primary }]}>10x</Text>
              <Text style={styles.cardTitle}>Focus</Text>
            </View>
          </View>
          <TextInput
            style={styles.focusInput}
            placeholder="What's your biggest priority today?"
            placeholderTextColor={Colors.text.muted}
            value={tenXFocus}
            onChangeText={handleTenXFocusChange}
            onBlur={saveTenXFocus}
            multiline
          />
        </View>

        {/* ── 10x Action (separate from Focus) ───────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={[styles.heroLabel, { color: '#E040FB' }]}>10x</Text>
              <Text style={styles.cardTitle}>Action</Text>
            </View>
            <Text style={styles.actionPoints}>(10 points)</Text>
          </View>
          <TextInput
            style={styles.focusInput}
            placeholder="What would your biggest, bolder self do… how can you make it a level 10?"
            placeholderTextColor={Colors.text.muted}
            value={tenXAction}
            onChangeText={handleTenXActionChange}
            onBlur={saveTenXAction}
            multiline
          />
          <TouchableOpacity style={styles.actionItem} onPress={handleTenXComplete}>
            <View style={[styles.actionCheck, tenXComplete && styles.actionCheckActive]}>
              {tenXComplete && <Ionicons name="checkmark" size={18} color="white" />}
            </View>
            <Text style={[styles.actionText, tenXComplete && styles.actionTextDone]}>
              {tenXAction || 'Describe your 10x action above'}
            </Text>
            <TouchableOpacity style={styles.setBtn} onPress={handleTenXComplete}>
              <Text style={styles.setBtnText}>{tenXComplete ? 'Done ✓' : 'Complete'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* ── Future Self Reflection ──────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Future Self Reflection</Text>
            <TouchableOpacity onPress={handleFutureComplete}>
              <View style={[styles.miniCheck, futureComplete && styles.miniCheckActive]}>
                {futureComplete && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSub}>Journal as your future self — 7 min meditation</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Write as your future self..."
            placeholderTextColor={Colors.text.muted}
            value={futureReflection}
            onChangeText={handleFutureReflectionChange}
            onBlur={saveFutureReflection}
            multiline
          />
        </View>

        {/* ── 10X UNICORN CHECKLIST ───────────────────────────────────── */}
        <View style={[styles.heroCard, {
          borderColor: completedCount === 5
            ? `hsl(${120 + borderProgress * 40}, 80%, 55%)`
            : Colors.brand.primary + '20',
          borderWidth: completedCount === 5 ? 2.5 : 1,
          shadowColor: completedCount === 5 ? '#00E676' : 'transparent',
          shadowOpacity: completedCount === 5 ? 0.3 + borderProgress * 0.3 : 0,
          shadowRadius: completedCount === 5 ? 8 + borderProgress * 8 : 0,
          shadowOffset: { width: 0, height: 0 },
        }]}>
          <TouchableOpacity
            style={styles.checklistHeader}
            onPress={() => setChecklistCollapsed(!checklistCollapsed)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>{completedCount === 5 ? '✅' : '📋'}</Text>
              <Text style={styles.checklistTitle}>
                {completedCount === 5 && checklistCollapsed ? '10X UNICORN CHECKLIST COMPLETE' : '10X UNICORN CHECKLIST'}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: completedCount === 5 ? '#00E676' : Colors.brand.primary }}>
              {completedCount}/5 {checklistCollapsed ? '▼' : '▲'}
            </Text>
          </TouchableOpacity>
          {!checklistCollapsed && (
            <>
              <Text style={styles.checklistRule}>
                All 5 = 🦄 <Text style={{ color: Colors.brand.primary }}>10x Unicorn Win</Text>
                {'  •  '}Just #1 = ⭐ <Text style={{ color: Colors.status.warning }}>Priority Win</Text>
              </Text>
              {UNICORN_CHECKLIST.map((item, i) => {
                const checked = unicornChecklist[item.key as keyof typeof unicornChecklist];
                return (
                  <View key={item.key}>
                    <TouchableOpacity
                      style={[
                        styles.checklistRow,
                        checked && styles.checklistRowDone,
                      ]}
                      onPress={() => {
                        if (item.key === 'tenx') handleTenXComplete();
                        else if (item.key === 'wormhole') setContactSearchVisible(true);
                        else if (item.key === 'future') handleFutureComplete();
                        else if (item.key === 'tomorrow') handleTomorrowPrepared();
                        else if (item.key === 'nodistraction') handleCourseCorrected();
                      }}
                    >
                      <View style={[styles.checklistCheck, checked && styles.checklistCheckDone]}>
                        {checked && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.checklistLabel, checked && styles.checklistLabelDone]}>
                          {i + 1}. {item.label}
                        </Text>
                        {!checked && <Text style={styles.checklistSub}>{item.sub}</Text>}
                      </View>
                    </TouchableOpacity>
                    {i < UNICORN_CHECKLIST.length - 1 && <View style={styles.separator} />}
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* ── Wormhole ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="planet" size={20} color={Colors.brand.primary} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Wormhole</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/wormhole')}>
              <Text style={styles.linkText}>Contacts →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSub}>Today's focused relationship</Text>
          <TouchableOpacity style={styles.contactPicker} onPress={() => setContactSearchVisible(true)}>
            <Ionicons name="person-add" size={18} color={Colors.text.tertiary} />
            <Text style={styles.contactPickerText}>
              {selectedWormholeContact ? selectedWormholeContact.full_name : 'Select a contact to focus on today'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.cardSub}>What did you do to leverage this relationship?</Text>
          <TextInput
            style={styles.textAreaSmall}
            placeholder="Describe your wormhole action..."
            placeholderTextColor={Colors.text.muted}
            value={focusReflection}
            onChangeText={handleFocusReflectionChange}
            onBlur={saveFocusReflection}
            multiline
          />
        </View>

        {/* ── Daily Compound ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Daily Compound</Text>
              <Text style={styles.cardSub}>{activeGoal?.title || 'Your daily habit'}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakNumber}>{dailyCompound}</Text>
              <Text style={styles.streakLabel}>/ {compoundTarget}</Text>
            </View>
          </View>
          <View style={styles.compoundRow}>
            <TouchableOpacity style={styles.compoundBtn} onPress={() => handleDailyCompoundChange(-1)}>
              <Ionicons name="chevron-down" size={22} color={Colors.brand.primary} />
            </TouchableOpacity>
            {compoundEditing ? (
              <TextInput
                style={styles.compoundEditInput}
                value={compoundInputText}
                onChangeText={setCompoundInputText}
                keyboardType="number-pad"
                autoFocus
                onBlur={handleCompoundManualInput}
                onSubmitEditing={handleCompoundManualInput}
                selectTextOnFocus
              />
            ) : (
              <TouchableOpacity onPress={() => { setCompoundInputText(String(dailyCompound)); setCompoundEditing(true); }}>
                <Text style={styles.compoundNum}>{dailyCompound}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.compoundUnit}>times</Text>
            <TouchableOpacity style={styles.compoundBtn} onPress={() => handleDailyCompoundChange(1)}>
              <Ionicons name="chevron-up" size={22} color={Colors.brand.primary} />
            </TouchableOpacity>
          </View>

          {/* Daily Target Progress Bar */}
          <View style={{ marginTop: Spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: Colors.text.secondary }}>Daily Target</Text>
              <Text style={{ fontSize: 13, color: '#06B6D4', fontWeight: '700' }}>{dailyCompound}/{compoundTarget}</Text>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: Colors.background.primary, overflow: 'hidden' }}>
              <LinearGradient
                colors={['#06B6D4', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: '100%',
                  width: `${Math.min(100, (dailyCompound / Math.max(1, compoundTarget)) * 100)}%`,
                  borderRadius: 5,
                }}
              />
            </View>
          </View>

          {/* 10x Goal Progress — current number vs target with up/down + deadline */}
          {activeGoal?.target_number && (
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={{ fontSize: 13, color: Colors.text.secondary, fontWeight: '600', marginBottom: 8 }}>10x Goal Progress</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
                <TouchableOpacity style={styles.compoundBtn} onPress={() => handleGoalCurrentChange(-1)}>
                  <Ionicons name="chevron-down" size={20} color={Colors.brand.primary} />
                </TouchableOpacity>
                {goalCurrentEditing ? (
                  <TextInput
                    style={styles.compoundEditInput}
                    value={goalCurrentText}
                    onChangeText={setGoalCurrentText}
                    keyboardType="number-pad"
                    autoFocus
                    onBlur={handleGoalCurrentManualInput}
                    onSubmitEditing={handleGoalCurrentManualInput}
                    selectTextOnFocus
                  />
                ) : (
                  <TouchableOpacity onPress={() => { setGoalCurrentText(String(goalCurrentNumber)); setGoalCurrentEditing(true); }}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: Colors.text.primary }}>
                      {(activeGoal as any).goal_type === 'dollar' ? '$' : ''}{goalCurrentNumber.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={{ fontSize: 16, color: Colors.text.tertiary, fontWeight: '600' }}>
                  / {(activeGoal as any).goal_type === 'dollar' ? '$' : ''}{Number(activeGoal.target_number).toLocaleString()}
                </Text>
                <TouchableOpacity style={styles.compoundBtn} onPress={() => handleGoalCurrentChange(1)}>
                  <Ionicons name="chevron-up" size={20} color={Colors.brand.primary} />
                </TouchableOpacity>
              </View>
              {/* Progress bar */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: Colors.text.tertiary }}>
                  {activeGoal.target_date ? `Deadline: ${new Date(activeGoal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No deadline set'}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: (() => {
                  const pct = (activeGoal.progress || 0);
                  if (pct >= 75) return '#00E676';
                  if (pct >= 40) return '#FFB800';
                  return '#FF4B6E';
                })() }}>{activeGoal.progress || 0}%</Text>
              </View>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: Colors.background.primary, overflow: 'hidden' }}>
                <LinearGradient
                  colors={(() => {
                    const pct = activeGoal.progress || 0;
                    if (pct >= 75) return ['#00FF9D', '#06B6D4'] as [string, string];
                    if (pct >= 40) return ['#FFB800', '#06B6D4'] as [string, string];
                    return ['#FF4B6E', '#FFB800'] as [string, string];
                  })()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: '100%',
                    width: `${Math.min(100, activeGoal.progress || 0)}%`,
                    borderRadius: 5,
                  }}
                />
              </View>
              {/* On-track indicator */}
              {activeGoal.target_date && (() => {
                const now = new Date();
                const start = new Date(activeGoal.created_at || now);
                const end = new Date(activeGoal.target_date);
                const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const elapsed = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const expectedPct = Math.min(100, Math.round((elapsed / totalDays) * 100));
                const actual = activeGoal.progress || 0;
                const ahead = actual >= expectedPct;
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <Ionicons name={ahead ? 'trending-up' : 'trending-down'} size={16} color={ahead ? '#00E676' : '#FF4B6E'} />
                    <Text style={{ fontSize: 12, color: ahead ? '#00E676' : '#FF4B6E', fontWeight: '600', marginLeft: 4 }}>
                      {ahead ? 'On track' : 'Behind pace'} — expected {expectedPct}% by now
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}
        </View>

        {/* ── Distraction Reflection ──────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Distraction Reflection</Text>
          <Text style={styles.cardSub}>Where did you get distracted?</Text>
          <TextInput
            style={styles.textAreaSmall}
            placeholder="What pulled your focus..."
            placeholderTextColor={Colors.text.muted}
            value={distractionText}
            onChangeText={setDistractionText}
            onBlur={saveDistraction}
            multiline
          />
          <View style={styles.switchRow}>
            <Switch
              value={courseCorrected}
              onValueChange={handleCourseCorrected}
              trackColor={{ false: Colors.border.default, true: Colors.brand.primary + '60' }}
              thumbColor={courseCorrected ? Colors.brand.primary : Colors.text.tertiary}
            />
            <Text style={styles.switchLabel}>Did you course-correct immediately?</Text>
          </View>
        </View>

        {/* ── AI Course Correction ────────────────────────────────────── */}
        <TouchableOpacity onPress={() => router.push('/ai-chat')} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.brand.primary + '15', Colors.brand.secondary + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCard}
          >
            <LinearGradient
              colors={[Colors.brand.primary, Colors.brand.secondary]}
              style={styles.aiIcon}
            >
              <Ionicons name="sparkles" size={22} color="white" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>AI Course Correction</Text>
              <Text style={styles.aiSub}>Get back on track with your AI coach</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Today's Signals ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flash" size={18} color={Colors.brand.primary} style={{ marginRight: 6 }} />
              <Text style={styles.cardTitle}>Today's Signals</Text>
            </View>
            <TouchableOpacity onPress={openAddSignalToday} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="add" size={16} color={Colors.brand.primary} />
              <Text style={styles.linkText}> Add</Text>
            </TouchableOpacity>
          </View>
          {todaysSignals.length > 0 ? (
            <View style={{ gap: 6 }}>
              {todaysSignals.map((signal) => (
                <Swipeable
                  key={signal.id}
                  renderLeftActions={() => (
                    <TouchableOpacity
                      style={styles.swipeEditAction}
                      onPress={() => openEditSignal(signal)}
                    >
                      <Ionicons name="create" size={18} color="white" />
                      <Text style={styles.swipeActionText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  renderRightActions={() => (
                    <TouchableOpacity
                      style={styles.swipeDeleteAction}
                      onPress={() => deleteSignal(signal)}
                    >
                      <Ionicons name="trash" size={18} color="white" />
                      <Text style={styles.swipeActionText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  overshootLeft={false}
                  overshootRight={false}
                >
                  <TouchableOpacity
                    style={styles.signalRow}
                    onPress={() => handleSignalToggle(signal)}
                    onLongPress={() => openChangeDate(signal)}
                    delayLongPress={500}
                  >
                    <View style={[styles.miniCheck, signal.status === 'complete' && styles.miniCheckActive]}>
                      {signal.status === 'complete' && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.signalTitle, signal.status === 'complete' && styles.signalDone]}>
                        {signal.title || SIGNAL_TYPE_LABELS[signal.type] || 'Signal'}
                      </Text>
                      {signal.details ? <Text style={styles.signalSub}>{signal.details}</Text> : null}
                    </View>
                    <Text style={styles.signalPoints}>+{signal.score || 5}</Text>
                  </TouchableOpacity>
                </Swipeable>
              ))}
              <Text style={{ fontSize: 10, color: Colors.text.muted, textAlign: 'center', marginTop: 4 }}>
                Swipe left to delete · right to edit · hold to reschedule
              </Text>
            </View>
          ) : (
            <View style={styles.emptySignals}>
              <Text style={styles.emptyTitle}>No signals for today</Text>
              <Text style={styles.emptySub}>Add measurable actions to track your progress</Text>
              <TouchableOpacity onPress={openAddSignalToday} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <Ionicons name="add-circle" size={16} color={Colors.brand.primary} />
                <Text style={[styles.linkText, { marginLeft: 4 }]}>Add Signal to Today</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Status Picker Modal ───────────────────────────────────────── */}
      <Modal visible={statusPickerVisible} transparent animationType="fade" onRequestClose={() => setStatusPickerVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setStatusPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Day Status</Text>
            {DAY_STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.modalRow, dailyEntry?.status === option.value && styles.modalRowActive]}
                onPress={() => handleStatusSelect(option.value)}
              >
                <View style={[styles.modalDot, { backgroundColor: STATUS_COLORS[option.value] || Colors.text.tertiary }]} />
                <Text style={[styles.modalRowText, dailyEntry?.status === option.value && { color: Colors.text.primary, fontWeight: '600' }]}>
                  {option.label}
                </Text>
                {dailyEntry?.status === option.value && <Ionicons name="checkmark" size={18} color={Colors.brand.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Contact Search Modal ──────────────────────────────────────── */}
      <Modal visible={contactSearchVisible} transparent animationType="slide" onRequestClose={() => setContactSearchVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor={Colors.text.muted}
              value={contactSearch}
              onChangeText={setContactSearch}
              autoFocus
              returnKeyType="search"
            />
            <FlatList
              data={filteredContacts}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 400 }}
              renderItem={({ item: c }) => (
                <TouchableOpacity key={c.id} style={styles.contactRow} onPress={() => handleWormholeSelect(c)}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitial}>{(c.full_name || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{c.full_name}</Text>
                    {c.company && <Text style={styles.contactCompany}>{c.company}</Text>}
                  </View>
                  {selectedWormholeContact?.id === c.id && <Ionicons name="checkmark-circle" size={20} color={Colors.brand.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptySub}>No contacts found</Text>
              }
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setContactSearchVisible(false); setContactSearch(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Signal Modal ────────────────────────────────────────── */}
      <Modal visible={editSignalVisible} transparent animationType="slide" onRequestClose={() => setEditSignalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Edit Signal</Text>
              <TouchableOpacity onPress={() => setEditSignalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.editLabel}>Title</Text>
              <TextInput
                style={styles.editInput}
                value={editSignalData.title || ''}
                onChangeText={(t) => setEditSignalData({ ...editSignalData, title: t })}
                placeholder="Signal title"
                placeholderTextColor={Colors.text.muted}
              />
              <Text style={styles.editLabel}>Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {Object.entries(SIGNAL_TYPE_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.editChip, editSignalData.type === key && styles.editChipActive]}
                    onPress={() => setEditSignalData({ ...editSignalData, type: key as any })}
                  >
                    <Text style={[styles.editChipText, editSignalData.type === key && { color: 'white' }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.editLabel}>Score: {editSignalData.score || 5}/10</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.editScoreBtn, editSignalData.score === n && styles.editScoreBtnActive]}
                    onPress={() => setEditSignalData({ ...editSignalData, score: n })}
                  >
                    <Text style={[styles.editScoreText, editSignalData.score === n && { color: 'white' }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.editLabel}>Due Date</Text>
              <TextInput
                style={styles.editInput}
                value={editSignalData.due_date || ''}
                onChangeText={(t) => setEditSignalData({ ...editSignalData, due_date: t })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.text.muted}
              />
              <Text style={styles.editLabel}>Details</Text>
              <TextInput
                style={[styles.editInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={editSignalData.details || ''}
                onChangeText={(t) => setEditSignalData({ ...editSignalData, details: t })}
                placeholder="Optional details..."
                placeholderTextColor={Colors.text.muted}
                multiline
              />
              <TouchableOpacity style={styles.editSaveBtn} onPress={saveEditSignal}>
                <Text style={styles.editSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Signal to Today Modal ────────────────────────────────── */}
      <Modal visible={addSignalVisible} transparent animationType="slide" onRequestClose={() => setAddSignalVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Add Signal to Today</Text>
              <TouchableOpacity onPress={() => setAddSignalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {allActiveSignals.length > 0 ? (
                allActiveSignals.map((signal) => (
                  <View key={signal.id} style={styles.addSignalRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text.primary }}>{signal.title}</Text>
                      <Text style={{ fontSize: 11, color: Colors.text.tertiary, marginTop: 2 }}>
                        {SIGNAL_TYPE_LABELS[signal.type]} · {signal.score || 5}pts · Due: {signal.due_date || 'none'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => openEditSignal(signal)} style={styles.addSignalEditBtn}>
                        <Ionicons name="create-outline" size={16} color={Colors.brand.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => addSignalToToday(signal)} style={styles.addSignalBtn}>
                        <Ionicons name="add" size={16} color="white" />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: 'white', marginLeft: 4 }}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Text style={{ fontSize: 14, color: Colors.text.secondary }}>No active signals to add</Text>
                  <TouchableOpacity onPress={() => { setAddSignalVisible(false); router.push('/(tabs)/crm'); }} style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.brand.primary }}>Create New Signal in CRM</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Change Date Modal (long press) ────────────────────────────── */}
      <Modal visible={!!changeDateSignal} transparent animationType="fade" onRequestClose={() => setChangeDateSignal(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setChangeDateSignal(null)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Reschedule Signal</Text>
            <Text style={{ fontSize: 13, color: Colors.text.secondary, marginBottom: 12 }}>{changeDateSignal?.title}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.editChip, changeDateValue === dateStr && styles.editChipActive]}
                onPress={() => setChangeDateValue(dateStr)}
              >
                <Text style={[styles.editChipText, changeDateValue === dateStr && { color: 'white' }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editChip}
                onPress={() => {
                  const t = new Date(); t.setDate(t.getDate() + 1);
                  setChangeDateValue(t.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.editChipText}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editChip}
                onPress={() => {
                  const t = new Date(); t.setDate(t.getDate() + 7);
                  setChangeDateValue(t.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.editChipText}>Next Week</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.editInput}
              value={changeDateValue}
              onChangeText={setChangeDateValue}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.text.muted}
            />
            <TouchableOpacity style={styles.editSaveBtn} onPress={saveChangeDate}>
              <Text style={styles.editSaveBtnText}>Save Date</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AI FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/ai-chat')}>
        <LinearGradient colors={[Colors.brand.primary, Colors.brand.secondary]} style={styles.fabGradient}>
          <Ionicons name="sparkles" size={26} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </KeyboardAvoidingView>
    </CosmicBackground>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },

  // ── Date Nav ──
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default + '60',
  },
  dateNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateNavLabel: { ...Typography.small, color: Colors.text.tertiary },
  dateTitle: { ...Typography.h3, color: Colors.text.primary, letterSpacing: 2, fontWeight: '800' },

  // ── Status Banner ──
  statusBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: Colors.background.elevated,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: { fontSize: 15, fontWeight: '800', letterSpacing: 3, flex: 1, textAlign: 'center' },

  // ── Hero Card (elevated tier) ──
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    backgroundColor: Colors.background.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.default + '60',
  },

  // ── Standard Card ──
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    backgroundColor: Colors.background.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default + '40',
  },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { ...Typography.h4, color: Colors.text.primary },
  cardSub: { ...Typography.small, color: Colors.text.tertiary, marginBottom: 10 },
  heroLabel: { ...Typography.smallBold, color: Colors.text.tertiary, letterSpacing: 1.5 },

  // ── Determination ──
  determinationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  determinationEmoji: { fontSize: 28, marginRight: 6 },
  determinationNumber: { fontSize: 28, fontWeight: '800' },

  sliderOuter: { height: 14, backgroundColor: 'transparent', borderRadius: 7, overflow: 'visible', marginBottom: 8, paddingVertical: 0 },
  sliderTrackBg: { position: 'absolute', left: 0, right: 0, height: '100%', borderRadius: 7, opacity: 0.25 },
  sliderGradient: { height: '100%', borderRadius: 7 },
  sliderThumb: {
    position: 'absolute',
    top: -12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background.elevated,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  sliderThumbRainbow: {
    borderColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  sliderEndLabel: { ...Typography.small, color: Colors.text.tertiary },

  dotRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  dotButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotButtonActive: { backgroundColor: Colors.brand.primary },
  dotText: { ...Typography.smallBold, color: Colors.text.tertiary },
  dotTextActive: { color: 'white' },

  motivationBar: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
    backgroundColor: Colors.brand.primary + '10',
  },
  motivationText: { ...Typography.caption, color: Colors.text.secondary, fontStyle: 'italic' },

  // ── I Am ──
  iAmRow: { flexDirection: 'row', alignItems: 'center' },
  iAmBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 12,
  },
  iAmPrefixBold: {
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
  },
  iAmInput: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Typography.body,
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // ── 10x Focus ──
  focusInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    fontWeight: '600',
    color: '#F0F0FF',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  actionLabel: { ...Typography.captionBold },
  actionPoints: { ...Typography.small, color: Colors.text.tertiary, marginLeft: 6 },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
    padding: 12,
  },
  actionCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.brand.primary + '50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionCheckActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  actionText: { flex: 1, ...Typography.body, color: Colors.text.primary },
  actionTextDone: { textDecorationLine: 'line-through', color: Colors.text.tertiary },
  setBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.brand.primary },
  setBtnText: { ...Typography.smallBold, color: Colors.brand.primary },

  // ── Text Areas ──
  textArea: {
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#E8E8FF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#E8E8FF',
    minHeight: 50,
    textAlignVertical: 'top',
  },

  // ── Checkboxes ──
  miniCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniCheckActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },

  // ── 10X Unicorn Checklist ──
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  checklistTitle: { ...Typography.h4, color: Colors.text.primary, fontWeight: '800', letterSpacing: 1 },
  checklistRule: { ...Typography.small, color: Colors.text.secondary, marginBottom: 16 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  checklistCheck: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.brand.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checklistCheckDone: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  checklistLabel: { ...Typography.bodyBold, color: Colors.text.primary },
  checklistLabelDone: { textDecorationLine: 'line-through', color: Colors.text.tertiary },
  checklistSub: { ...Typography.small, color: Colors.text.tertiary, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.border.default + '40', marginLeft: 40 },

  // ── Wormhole ──
  contactPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  contactPickerText: { ...Typography.body, color: Colors.text.secondary, flex: 1 },
  linkText: { ...Typography.captionBold, color: Colors.brand.primary },

  // ── Compound ──
  streakBadge: {
    backgroundColor: Colors.brand.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  streakNumber: { ...Typography.h3, color: Colors.brand.primary },
  streakLabel: { ...Typography.small, color: Colors.text.tertiary },
  compoundRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 16, gap: 16 },
  compoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  compoundNum: { ...Typography.h2, color: Colors.text.primary },
  compoundEditInput: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 80,
  },
  compoundUnit: { ...Typography.small, color: Colors.text.tertiary },

  // ── Switch Row ──
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  switchLabel: { ...Typography.caption, color: Colors.text.secondary, flex: 1 },

  // ── AI Card ──
  aiCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.primary + '30',
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  aiTitle: { ...Typography.bodyBold, color: Colors.text.primary },
  aiSub: { ...Typography.small, color: Colors.text.tertiary, marginTop: 2 },

  // ── Signals ──
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
  },
  signalTitle: { ...Typography.captionBold, color: Colors.text.primary },
  signalDone: { textDecorationLine: 'line-through', color: Colors.text.tertiary },
  signalSub: { ...Typography.small, color: Colors.text.tertiary, marginTop: 2 },
  signalPoints: { ...Typography.captionBold, color: Colors.brand.primary },
  emptySignals: { alignItems: 'center', paddingVertical: 20 },
  emptyTitle: { ...Typography.body, color: Colors.text.secondary },
  emptySub: { ...Typography.small, color: Colors.text.tertiary, textAlign: 'center', marginTop: 4 },

  // ── Modals ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border.default, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...Typography.h4, color: Colors.text.primary, textAlign: 'center', marginBottom: 16 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalRowActive: { backgroundColor: Colors.brand.primary + '15' },
  modalDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  modalRowText: { ...Typography.body, color: Colors.text.secondary, flex: 1 },

  // ── Contact Search Modal ──
  searchInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#E8E8FF',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default + '40',
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInitial: { ...Typography.bodyBold, color: Colors.brand.primary },
  contactName: { ...Typography.body, color: Colors.text.primary },
  contactCompany: { ...Typography.small, color: Colors.text.tertiary },
  cancelBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.background.primary },
  cancelBtnText: { ...Typography.bodyBold, color: Colors.text.secondary },

  // ── Swipe Actions ──
  swipeEditAction: {
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 10,
    marginRight: 4,
    gap: 2,
  },
  swipeDeleteAction: {
    backgroundColor: Colors.status.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 10,
    marginLeft: 4,
    gap: 2,
  },
  swipeActionText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },

  // ── Edit Signal Modal ──
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
    marginTop: 10,
  },
  editInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: 8,
  },
  editChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  editChipActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  editChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  editScoreBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editScoreBtnActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  editScoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  editSaveBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editSaveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },

  // ── Add Signal to Today Modal ──
  addSignalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default + '40',
  },
  addSignalEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.brand.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSignalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.brand.primary,
  },

  // ── WIN Banner ──
  winBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  winBannerGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winBannerText: {
    fontSize: 26,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  miniWinBanner: {
    alignItems: 'center',
    marginBottom: 8,
  },
  miniWinText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: 1,
  },

  // ── Glow Stat Boxes ──
  glowStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  glowStatBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default + '40',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  glowStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  glowStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // ── Checklist Done States ──
  checklistRowDone: {
    backgroundColor: '#00E67612',
    borderRadius: 10,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});

export default TODAY_SCREEN;
