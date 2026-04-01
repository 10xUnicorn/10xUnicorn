import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
  Colors,
  Spacing,
  BorderRadius,
  Typography,
} from '../../src/constants/theme';
import { DailyEntry, Goal, Contact } from '../../src/types/database';

const DASHBOARD_SCREEN = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data state
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [unicornDaysCount, setUnicornDaysCount] = useState(0);
  const [priorityWinsCount, setPriorityWinsCount] = useState(0);
  const [lastSevenDays, setLastSevenDays] = useState<(DailyEntry | null)[]>([]);
  const [determinationTrend, setDeterminationTrend] = useState<number[]>([]);
  const [heatmapData, setHeatmapData] = useState<
    { entry_date: string; determination_level: number; compound_count: number; ten_x_action_completed: boolean }[]
  >([]);
  const [topWormholeContacts, setTopWormholeContacts] = useState<Contact[]>([]);

  // Edit goal modal state
  const [editGoalVisible, setEditGoalVisible] = useState(false);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalDescription, setEditGoalDescription] = useState('');
  const [editGoalTargetDate, setEditGoalTargetDate] = useState('');
  const [editGoalTargetNumber, setEditGoalTargetNumber] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load active goal
      const { data: goal } = await goals.getActive(user.id);
      setActiveGoal(goal || null);

      // Load streak data
      const currentStreakData = await streaks.getCurrent(user.id);
      setCurrentStreak(currentStreakData?.count || 0);

      const bestStreakData = await streaks.getBest(user.id);
      setBestStreak(bestStreakData?.count || 0);

      // Load last 7 days — always show a full 7-day array
      const { data: last7 } = await dailyEntries.recent(user.id, 7);
      const last7Entries = last7 || [];

      // Build a map of existing entries keyed by date string (YYYY-MM-DD)
      const entryByDate: Record<string, DailyEntry> = {};
      for (const entry of last7Entries) {
        const key = (entry.entry_date || '').slice(0, 10);
        entryByDate[key] = entry;
      }

      // Generate full 7-day array (today back 6 days)
      const fullSevenDays: (DailyEntry | null)[] = [];
      const fullDeterminationTrend: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const entry = entryByDate[key] || null;
        fullSevenDays.push(entry);
        fullDeterminationTrend.push(entry ? (entry.determination_level || 0) : 0);
      }

      setLastSevenDays(fullSevenDays);
      setDeterminationTrend(fullDeterminationTrend);

      // Load 52-week heatmap
      const { data: heatmap } = await dailyEntries.heatmap(user.id, 52);
      setHeatmapData(heatmap || []);

      // Count unicorn days (from actual entries, not null placeholders)
      const actualEntries = fullSevenDays.filter((e): e is DailyEntry => e !== null);
      const unicornCount = actualEntries.filter(
        (entry) => entry.status === 'stacking_wins' || entry.status === 'ten_x_unicorn_win'
      ).length;
      setUnicornDaysCount(unicornCount);

      // Count priority wins
      const priorityCount = actualEntries.filter(
        (entry) => entry.ten_x_action_completed
      ).length;
      setPriorityWinsCount(priorityCount);

      // Load top wormhole contacts
      const { data: topContacts } = await contacts.topWormhole(user.id, 3);
      setTopWormholeContacts(topContacts || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData().finally(() => setRefreshing(false));
  }, [user]);

  const handleEditGoal = () => {
    if (!activeGoal) return;
    setEditGoalTitle(activeGoal.title);
    setEditGoalDescription(activeGoal.description || '');
    setEditGoalTargetDate(activeGoal.target_date || '');
    setEditGoalTargetNumber(activeGoal.target_number?.toString() || '');
    setEditGoalVisible(true);
  };

  const handleSaveGoal = async () => {
    if (!activeGoal) return;
    try {
      const { error } = await goals.update(activeGoal.id, {
        title: editGoalTitle,
        description: editGoalDescription || null,
        target_date: editGoalTargetDate || null,
        target_number: editGoalTargetNumber ? parseFloat(editGoalTargetNumber) : null,
      });
      if (error) throw error;
      setEditGoalVisible(false);
      loadDashboardData();
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal');
    }
  };

  // Format date for display
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get intensity level for heatmap (0-4)
  const getIntensityLevel = (intensity: number) => {
    if (intensity === 0) return 0;
    if (intensity <= 2) return 1;
    if (intensity <= 4) return 2;
    if (intensity <= 6) return 3;
    return 4;
  };

  const getHeatmapColor = (intensity: number) => {
    const level = getIntensityLevel(intensity);
    const colors = [Colors.border.default, '#C6E48B', '#7BC96F', '#239A3B', '#196127'];
    return colors[level];
  };

  // Determine the max determination for chart scaling
  const maxDetermination = Math.max(...determinationTrend, 10);

  // Get days of week for last 7 days
  const getDayLabels = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return lastSevenDays.map((entry) => {
      if (!entry) return '';
      const date = new Date(entry.entry_date);
      return days[date.getDay()];
    });
  };

  // Build heatmap grid (52 weeks, 7 days each) from sparse entry data
  const buildHeatmapGrid = () => {
    // Build lookup map from entry_date -> entry
    const entryMap: Record<string, typeof heatmapData[0]> = {};
    for (const entry of heatmapData) {
      entryMap[(entry.entry_date || '').slice(0, 10)] = entry;
    }

    // Build full 52-week (364-day) grid ending today
    const today = new Date();
    const grid: ({ intensity: number } | null)[][] = [];

    // Start from 51 weeks ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (51 * 7) - today.getDay());

    for (let w = 0; w < 52; w++) {
      const week: ({ intensity: number } | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(cellDate.getDate() + (w * 7) + d);

        // Skip future dates
        if (cellDate > today) {
          week.push(null);
          continue;
        }

        const key = cellDate.toISOString().slice(0, 10);
        const entry = entryMap[key];
        if (entry) {
          // Calculate intensity: determination + bonus for completed actions
          const intensity = (entry.determination_level || 0)
            + (entry.ten_x_action_completed ? 2 : 0)
            + Math.min(entry.compound_count || 0, 3);
          week.push({ intensity });
        } else {
          week.push({ intensity: 0 });
        }
      }
      grid.push(week);
    }

    return grid;
  };

  const heatmapGrid = buildHeatmapGrid();

  return (
    <CosmicBackground>
    <View style={styles.container}>
      <UnicornHeader>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Your 10x Progress</Text>
        </View>
      </UnicornHeader>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* 10x Goal Card */}
        {activeGoal && (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleContainer}>
                <Text style={styles.goalTitle}>{activeGoal.title}</Text>
                {activeGoal.target_number && (
                  <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.brand.primary, marginTop: 4 }}>
                    ${Number(activeGoal.target_number).toLocaleString()}
                  </Text>
                )}
                <Text style={styles.goalDeadline}>
                  Deadline: {activeGoal.target_date ? formatDate(activeGoal.target_date) : 'Not set'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleEditGoal}
                style={styles.goalEditButton}
              >
                <Ionicons name="pencil" size={20} color={Colors.brand.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.goalDescription}>
              {activeGoal.description}
            </Text>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPercent}>
                  {activeGoal.progress || 0}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[Colors.brand.primary, Colors.brand.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(activeGoal.progress || 0, 100)}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={[Colors.brand.primary + '20', Colors.brand.primary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <Ionicons
              name="flame"
              size={32}
              color={Colors.brand.primary}
              style={styles.statIcon}
            />
          </LinearGradient>

          <LinearGradient
            colors={[Colors.brand.secondary + '20', Colors.brand.secondary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{bestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            <Ionicons
              name="trophy"
              size={32}
              color={Colors.brand.secondary}
              style={styles.statIcon}
            />
          </LinearGradient>

          <LinearGradient
            colors={['#FFB84D' + '20', '#FFB84D' + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{unicornDaysCount}</Text>
              <Text style={styles.statLabel}>Unicorn Days</Text>
            </View>
            <Ionicons
              name="sparkles"
              size={32}
              color="#FFB84D"
              style={styles.statIcon}
            />
          </LinearGradient>

          <LinearGradient
            colors={['#00D084' + '20', '#00D084' + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{priorityWinsCount}</Text>
              <Text style={styles.statLabel}>Priority Wins</Text>
            </View>
            <Ionicons
              name="checkmark-circle"
              size={32}
              color="#00D084"
              style={styles.statIcon}
            />
          </LinearGradient>
        </View>

        {/* Last 7 Days Completion */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 7 Days</Text>
          <View style={styles.completionCircles}>
            {lastSevenDays.map((entry, index) => {
              const isCompleted = entry
                ? entry.status === 'stacking_wins' ||
                  entry.status === 'ten_x_unicorn_win' ||
                  entry.status === 'priority_win' ||
                  entry.ten_x_action_completed
                : false;
              const d = new Date();
              d.setDate(d.getDate() - (6 - index));
              const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                d.getDay()
              ];

              return (
                <View key={index} style={styles.completionCircleContainer}>
                  <View
                    style={[
                      styles.completionCircle,
                      isCompleted && styles.completionCircleComplete,
                    ]}
                  >
                    {isCompleted && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Text style={styles.dayLabel}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Determination Trend Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Determination Trend (7 Days)</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartYAxis}>
              <Text style={styles.chartLabel}>10</Text>
              <Text style={styles.chartLabel}>5</Text>
              <Text style={styles.chartLabel}>0</Text>
            </View>
            <View style={styles.chartBars}>
              {determinationTrend.map((value, index) => {
                const height = (value / maxDetermination) * 150;
                const d = new Date();
                d.setDate(d.getDate() - (6 - index));
                const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][
                  d.getDay()
                ];

                return (
                  <View key={index} style={styles.barContainer}>
                    <LinearGradient
                      colors={[Colors.brand.primary, Colors.brand.secondary]}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={[
                        styles.bar,
                        {
                          height: Math.max(height, 8),
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* 52-Week Heatmap */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>52-Week Activity</Text>
          <View style={styles.heatmapContainer}>
            <View style={styles.heatmapWeeks}>
              {heatmapGrid.map((week, weekIndex) => (
                <View key={weekIndex} style={styles.heatmapWeek}>
                  {week.map((day, dayIndex) => (
                    <View
                      key={`${weekIndex}-${dayIndex}`}
                      style={[
                        styles.heatmapCell,
                        {
                          backgroundColor: day
                            ? getHeatmapColor(day.intensity)
                            : Colors.border.default,
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
          <View style={styles.heatmapLegend}>
            <Text style={styles.heatmapLegendLabel}>Less</Text>
            {[0, 1, 2, 3, 4].map((level) => {
              const colors = [Colors.border.default, '#C6E48B', '#7BC96F', '#239A3B', '#196127'];
              return (
                <View
                  key={level}
                  style={[styles.heatmapCell, { backgroundColor: colors[level] }]}
                />
              );
            })}
            <Text style={styles.heatmapLegendLabel}>More</Text>
          </View>
        </View>

        {/* Wormhole Network Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wormhole Network</Text>
          <Text style={styles.cardSubtitle}>
            Top Contacts (Last 7 Days)
          </Text>
          {topWormholeContacts.length > 0 ? (
            <View style={styles.contactsList}>
              {topWormholeContacts.map((contact, index) => (
                <View key={contact.id} style={styles.contactItem}>
                  <View style={styles.contactRank}>
                    <Text style={styles.contactRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactName}>{contact.full_name}</Text>
                    <Text style={styles.contactInfo}>
                      {contact.relationship_type || 'Contact'}
                    </Text>
                  </View>
                  <View style={styles.contactCount}>
                    <Text style={styles.contactCountText}>
                      {contact.activation_count || 0}x
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No wormhole activations yet. Start connecting!
            </Text>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Edit Goal Modal */}
      <Modal
        visible={editGoalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditGoalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Goal</Text>
              <TouchableOpacity onPress={() => setEditGoalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={editGoalTitle}
              onChangeText={setEditGoalTitle}
              placeholder="Goal title"
              placeholderTextColor={Colors.text.tertiary}
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={editGoalDescription}
              onChangeText={setEditGoalDescription}
              placeholder="Goal description"
              placeholderTextColor={Colors.text.tertiary}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.modalLabel}>10x Target Number</Text>
            <TextInput
              style={styles.modalInput}
              value={editGoalTargetNumber}
              onChangeText={setEditGoalTargetNumber}
              placeholder="1000000"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="number-pad"
            />

            <Text style={styles.modalLabel}>Target Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={editGoalTargetDate}
              onChangeText={setEditGoalTargetDate}
              placeholder="2026-12-31"
              placeholderTextColor={Colors.text.tertiary}
            />

            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveGoal}>
              <LinearGradient
                colors={[Colors.brand.primary, Colors.brand.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalSaveGradient}
              >
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </CosmicBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background.elevated,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  goalCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brand.primary,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  goalTitleContainer: {
    flex: 1,
  },
  goalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  goalDeadline: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  goalEditButton: {
    padding: Spacing.sm,
  },
  goalDescription: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  progressSection: {
    marginTop: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  progressPercent: {
    ...Typography.body,
    color: Colors.brand.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background.primary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  statCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  statIcon: {
    marginLeft: Spacing.sm,
  },
  card: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  cardSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  completionCircles: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  completionCircleContainer: {
    alignItems: 'center',
  },
  completionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  completionCircleComplete: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  dayLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontSize: 11,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 180,
    alignItems: 'flex-end',
  },
  chartYAxis: {
    width: 35,
    justifyContent: 'space-between',
    marginRight: Spacing.sm,
  },
  chartLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontSize: 10,
    textAlign: 'right',
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: Spacing.sm,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: '70%',
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  barLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontSize: 10,
  },
  heatmapContainer: {
    paddingVertical: Spacing.md,
  },
  heatmapWeeks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  heatmapWeek: {
    gap: 3,
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  heatmapLegendLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontSize: 10,
  },
  contactsList: {
    gap: Spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
  },
  contactRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  contactRankText: {
    ...Typography.caption,
    color: 'white',
    fontWeight: '700',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  contactInfo: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  contactCount: {
    backgroundColor: Colors.brand.primary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  contactCountText: {
    ...Typography.caption,
    color: Colors.brand.primary,
    fontWeight: '600',
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  bottomSpacing: {
    height: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  modalLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  modalInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text.primary,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalSaveButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  modalSaveGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  modalSaveText: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '600',
  },
});

export default DASHBOARD_SCREEN;
