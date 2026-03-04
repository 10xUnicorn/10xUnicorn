import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Generate activity heatmap data (365 days)
const generateHeatmapData = (entries: any[]) => {
  const data: Record<string, number> = {};
  entries.forEach((e: any) => {
    if (e.date && e.final_status) {
      let level = 0;
      if (e.final_status === 'unicorn_win') level = 4;
      else if (e.final_status === 'priority_win') level = 3;
      else if (e.final_status === 'course_corrected') level = 2;
      else if (e.final_status === 'loss' || e.final_status === 'lesson') level = 1;
      data[e.date] = level;
    }
  });
  return data;
};

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const HEATMAP_COLORS = ['#2D2D50', '#0e4429', '#006d32', '#26a641', '#39d353'];

export default function DashboardScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', deadline: '', target_number: '' });
  const [entries, setEntries] = useState<any[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const [data, entriesData] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/daily-entries?limit=365'),
      ]);
      setStats(data);
      setEntries(entriesData || []);
      if (data.goal) {
        setGoalForm({
          title: data.goal.title || '',
          description: data.goal.description || '',
          deadline: data.goal.deadline || data.goal.end_date || '',
          target_number: data.goal.target_number?.toString() || '',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, []);

  const saveGoal = async () => {
    try {
      await api.put('/goal', {
        title: goalForm.title,
        description: goalForm.description,
        deadline: goalForm.deadline,
        target_number: goalForm.target_number ? parseFloat(goalForm.target_number) : null,
      });
      setShowEditGoal(false);
      loadStats();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Calculate last 7 days data
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const entry = entries.find((e: any) => e.date === dateStr);
      const fiveStatuses = entry?.five_item_statuses || {};
      const completed = Object.values(fiveStatuses).filter(Boolean).length;
      days.push({ date: dateStr, day: dayName, completed, isToday: i === 0 });
    }
    return days;
  };

  // Calculate determination trend (last 7 days)
  const getDeterminationTrend = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const entry = entries.find((e: any) => e.date === dateStr);
      const value = entry?.determination_level || 0;
      days.push({ date: dateStr, day: dayName, value, isToday: i === 0 });
    }
    return days;
  };

  // Generate heatmap grid
  const heatmapData = generateHeatmapData(entries);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const last7Days = getLast7Days();
  const determinationTrend = getDeterminationTrend();
  const unicornDays = stats?.unicorn_wins || 0;
  const priorityWins = stats?.priority_wins || 0;
  const currentStreak = stats?.win_streak || 0;
  const bestStreak = stats?.longest_win_streak || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} tintColor={Colors.brand.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>10x Unicorn <Text style={{ fontSize: 24 }}>🦄</Text></Text>
        </View>

        {/* My 10x Goal Card */}
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>🦄 MY 10X GOAL</Text>
          <Text style={styles.goalTitle}>{stats?.goal?.title || 'No goal set'}</Text>
          {stats?.goal?.end_date && (
            <Text style={styles.goalMeta}>
              {stats.goal.deadline ? `Deadline: ${stats.goal.deadline}` : ''} 
              {stats.goal.start_date ? ` • Started ${stats.goal.start_date}` : ''}
            </Text>
          )}
          <TouchableOpacity
            testID="edit-goal-btn"
            style={styles.editGoalBtn}
            onPress={() => setShowEditGoal(true)}
          >
            <Text style={styles.editGoalBtnText}>Edit Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid - 2x2 */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{currentStreak}</Text>
              <Text style={{ fontSize: 24 }}>🔥</Text>
            </View>
            <Text style={styles.statLabel}>CURRENT STREAK</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{bestStreak}</Text>
              <Text style={{ fontSize: 24 }}>⭐</Text>
            </View>
            <Text style={styles.statLabel}>BEST STREAK</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.brand.primary }]}>{unicornDays}</Text>
            <Text style={styles.statLabelEmoji}>🦄 UNICORN DAYS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.status.success }]}>{priorityWins}</Text>
            <Text style={styles.statLabelEmoji}>⭐ PRIORITY WINS</Text>
          </View>
        </View>

        {/* Last 7 Days */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={{ fontSize: 16 }}>📅</Text>
            <Text style={styles.cardTitle}>LAST 7 DAYS</Text>
          </View>
          <View style={styles.daysRow}>
            {last7Days.map((day, i) => (
              <View key={i} style={styles.dayCol}>
                <View style={[styles.dayCircle, day.isToday && styles.dayCircleToday]}>
                  <View style={[styles.dayProgress, { height: `${(day.completed / 5) * 100}%` }]} />
                  <Text style={styles.dayDot}>•</Text>
                </View>
                <Text style={styles.dayLabel}>{day.day}</Text>
                <Text style={styles.dayCount}>{day.completed}/5</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Determination Trend */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={styles.cardTitle}>DETERMINATION TREND</Text>
          </View>
          <View style={styles.trendRow}>
            {determinationTrend.map((day, i) => {
              const maxHeight = 80;
              const barHeight = Math.max((day.value / 10) * maxHeight, 8);
              const isHigh = day.value >= 8;
              return (
                <View key={i} style={styles.trendCol}>
                  <Text style={[styles.trendValue, isHigh && styles.trendValueHigh]}>{day.value}</Text>
                  <LinearGradient
                    colors={isHigh ? ['#EF4444', '#F97316'] : ['#F97316', '#F59E0B']}
                    style={[styles.trendBar, { height: barHeight }]}
                  />
                  <Text style={styles.trendLabel}>{day.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Activity Heatmap */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { marginBottom: 16 }]}>Activity</Text>
          <View style={styles.heatmapContainer}>
            {/* Month labels */}
            <View style={styles.heatmapMonths}>
              <View style={{ width: 30 }} />
              {MONTHS.map((m, i) => (
                <Text key={i} style={styles.monthLabel}>{m}</Text>
              ))}
            </View>
            {/* Heatmap grid */}
            <View style={styles.heatmapGrid}>
              {/* Day labels */}
              <View style={styles.heatmapDays}>
                {DAYS.map((d, i) => (
                  <Text key={i} style={styles.dayLabelSmall}>{d}</Text>
                ))}
              </View>
              {/* Cells */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.heatmapCells}>
                  {Array.from({ length: 52 }).map((_, weekIdx) => (
                    <View key={weekIdx} style={styles.heatmapWeek}>
                      {Array.from({ length: 7 }).map((_, dayIdx) => {
                        const daysAgo = (51 - weekIdx) * 7 + (6 - dayIdx);
                        const d = new Date();
                        d.setDate(d.getDate() - daysAgo);
                        const dateStr = d.toISOString().split('T')[0];
                        const level = heatmapData[dateStr] || 0;
                        return (
                          <View
                            key={dayIdx}
                            style={[styles.heatmapCell, { backgroundColor: HEATMAP_COLORS[level] }]}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
            {/* Legend */}
            <View style={styles.heatmapLegend}>
              <Text style={styles.legendText}>Less</Text>
              {HEATMAP_COLORS.map((color, i) => (
                <View key={i} style={[styles.legendCell, { backgroundColor: color }]} />
              ))}
              <Text style={styles.legendText}>More</Text>
            </View>
          </View>
        </View>

        {/* Wormhole Network Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={{ fontSize: 16 }}>🌀</Text>
            <Text style={styles.cardTitle}>WORMHOLE NETWORK</Text>
          </View>
          {stats?.total_contacts > 0 ? (
            <>
              <Text style={styles.networkCount}>{stats.total_contacts} contacts</Text>
              {stats?.most_activated_contacts?.slice(0, 3).map((c: any, i: number) => (
                <View key={i} style={styles.contactRow}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitial}>{c.name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactScore}>{c.score} touches</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyText}>No contacts yet.</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Goal Modal */}
      <Modal visible={showEditGoal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Goal</Text>
              <TouchableOpacity onPress={() => setShowEditGoal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Goal Title</Text>
            <TextInput
              testID="goal-title-input"
              style={styles.input}
              value={goalForm.title}
              onChangeText={t => setGoalForm({ ...goalForm, title: t })}
              placeholder="1000 10xUnicorn members in 90 days"
              placeholderTextColor={Colors.text.tertiary}
            />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              testID="goal-desc-input"
              style={[styles.input, { minHeight: 80 }]}
              value={goalForm.description}
              onChangeText={t => setGoalForm({ ...goalForm, description: t })}
              placeholder="Why this goal matters..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
            />
            <Text style={styles.inputLabel}>Deadline (MM/DD/YY)</Text>
            <TextInput
              testID="goal-deadline-input"
              style={styles.input}
              value={goalForm.deadline}
              onChangeText={t => setGoalForm({ ...goalForm, deadline: t })}
              placeholder="03/31/26"
              placeholderTextColor={Colors.text.tertiary}
            />
            <Text style={styles.inputLabel}>Target Number (optional)</Text>
            <TextInput
              testID="goal-target-input"
              style={styles.input}
              value={goalForm.target_number}
              onChangeText={t => setGoalForm({ ...goalForm, target_number: t })}
              placeholder="1000"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="numeric"
            />
            <TouchableOpacity
              testID="save-goal-btn"
              style={styles.saveBtn}
              onPress={saveGoal}
            >
              <Text style={styles.saveBtnText}>Save Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 20 
  },
  appTitle: { 
    fontSize: FontSize.xxl, 
    fontWeight: '900', 
    color: Colors.brand.primary,
    letterSpacing: -0.5,
  },

  // Goal Card
  goalCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.brand.primary + '40',
    alignItems: 'center',
  },
  goalLabel: { 
    color: Colors.brand.red, 
    fontSize: FontSize.xs, 
    fontWeight: '700', 
    letterSpacing: 1,
    marginBottom: 8,
  },
  goalTitle: { 
    color: Colors.text.primary, 
    fontSize: FontSize.xl, 
    fontWeight: '800', 
    textAlign: 'center',
    marginBottom: 4,
  },
  goalMeta: { 
    color: Colors.text.tertiary, 
    fontSize: FontSize.sm, 
    marginBottom: 16,
  },
  editGoalBtn: {
    backgroundColor: Colors.bg.input,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  editGoalBtnText: { 
    color: Colors.text.secondary, 
    fontSize: FontSize.sm, 
    fontWeight: '600' 
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    width: '47%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  statValueRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  statValue: { 
    fontSize: FontSize.xxxl, 
    fontWeight: '900', 
    color: Colors.text.primary 
  },
  statLabel: { 
    color: Colors.text.tertiary, 
    fontSize: FontSize.xs, 
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  statLabelEmoji: { 
    color: Colors.text.tertiary, 
    fontSize: FontSize.xs, 
    fontWeight: '600',
    marginTop: 8,
  },

  // Cards
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 16 
  },
  cardTitle: { 
    fontSize: FontSize.sm, 
    fontWeight: '700', 
    color: Colors.text.secondary,
    letterSpacing: 0.5,
  },

  // Last 7 Days
  daysRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  dayCol: { 
    alignItems: 'center', 
    gap: 6 
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bg.input,
    borderWidth: 2,
    borderColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dayCircleToday: {
    borderColor: Colors.brand.primary,
    borderWidth: 2,
  },
  dayProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.brand.primary + '40',
  },
  dayDot: { 
    color: Colors.text.tertiary, 
    fontSize: 20 
  },
  dayLabel: { 
    color: Colors.text.tertiary, 
    fontSize: FontSize.xs 
  },
  dayCount: { 
    color: Colors.text.secondary, 
    fontSize: FontSize.xs, 
    fontWeight: '600' 
  },

  // Determination Trend
  trendRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end',
    height: 120,
  },
  trendCol: { 
    alignItems: 'center', 
    gap: 6 
  },
  trendValue: { 
    color: Colors.text.secondary, 
    fontSize: FontSize.sm, 
    fontWeight: '600' 
  },
  trendValueHigh: { 
    color: Colors.status.error 
  },
  trendBar: { 
    width: 28, 
    borderRadius: 4,
    minHeight: 8,
  },
  trendLabel: { 
    color: Colors.text.tertiary, 
    fontSize: FontSize.xs 
  },

  // Activity Heatmap
  heatmapContainer: { },
  heatmapMonths: { 
    flexDirection: 'row', 
    marginBottom: 8,
    paddingLeft: 30,
  },
  monthLabel: { 
    color: Colors.text.tertiary, 
    fontSize: 10, 
    width: 30,
    textAlign: 'center',
  },
  heatmapGrid: { 
    flexDirection: 'row' 
  },
  heatmapDays: { 
    width: 30, 
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  dayLabelSmall: { 
    color: Colors.text.tertiary, 
    fontSize: 10,
    height: 12,
  },
  heatmapCells: { 
    flexDirection: 'row' 
  },
  heatmapWeek: { 
    flexDirection: 'column', 
    gap: 3 
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 3,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
  },
  legendText: { 
    color: Colors.text.tertiary, 
    fontSize: 10 
  },
  legendCell: { 
    width: 12, 
    height: 12, 
    borderRadius: 2 
  },

  // Wormhole Network
  networkCount: { 
    color: Colors.text.tertiary, 
    fontSize: FontSize.sm, 
    marginBottom: 12 
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInitial: { 
    color: Colors.text.primary, 
    fontWeight: '700', 
    fontSize: FontSize.base 
  },
  contactName: { 
    color: Colors.text.primary, 
    fontSize: FontSize.base, 
    flex: 1 
  },
  contactScore: { 
    color: Colors.text.tertiary, 
    fontSize: FontSize.sm 
  },
  emptyText: { 
    color: Colors.text.tertiary, 
    fontSize: FontSize.sm, 
    textAlign: 'center', 
    padding: 20 
  },

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
    padding: 24 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  modalTitle: { 
    color: Colors.text.primary, 
    fontSize: FontSize.xxl, 
    fontWeight: '800' 
  },
  inputLabel: { 
    color: Colors.text.secondary, 
    fontSize: FontSize.sm, 
    fontWeight: '600', 
    marginBottom: 6, 
    marginTop: 12 
  },
  input: { 
    backgroundColor: Colors.bg.input, 
    borderRadius: Radius.md, 
    padding: 14, 
    color: Colors.text.primary, 
    fontSize: FontSize.base, 
    borderWidth: 1, 
    borderColor: Colors.border.default 
  },
  saveBtn: { 
    backgroundColor: Colors.brand.primary, 
    borderRadius: Radius.md, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 24 
  },
  saveBtnText: { 
    color: Colors.text.primary, 
    fontSize: FontSize.lg, 
    fontWeight: '700' 
  },
});
