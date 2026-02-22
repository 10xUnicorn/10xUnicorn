import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get('/dashboard/stats');
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} tintColor={Colors.brand.primary} />}
      >
        <Text style={styles.pageTitle}>Momentum Engine</Text>

        {/* Active Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalIcon}>
            <Ionicons name="flag" size={24} color={Colors.brand.primary} />
          </View>
          <Text style={styles.goalLabel}>10x Goal</Text>
          <Text style={styles.goalTitle}>{stats?.goal?.title || 'No active goal'}</Text>
          {stats?.goal?.description ? <Text style={styles.goalDesc}>{stats.goal.description}</Text> : null}
        </View>

        {/* Compound Streak */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardTitle}>Daily Compound</Text>
              <Text style={styles.habitLabel}>{stats?.habit?.habit_title || 'Not set'}</Text>
            </View>
            <View style={styles.streakCircle}>
              <Text style={styles.streakNum}>{stats?.compound_streak || 0}</Text>
              <Text style={styles.streakUnit}>day streak</Text>
            </View>
          </View>
          <View style={styles.pctRow}>
            <StatPill label="7d" value={`${stats?.compound_7d || 0}%`} />
            <StatPill label="30d" value={`${stats?.compound_30d || 0}%`} />
            <StatPill label="90d" value={`${stats?.compound_90d || 0}%`} />
          </View>
        </View>

        {/* Win Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Win Performance</Text>
          <View style={styles.statsGrid}>
            <StatBox label="Win Rate" value={`${stats?.win_rate || 0}%`} color={Colors.status.success} />
            <StatBox label="Unicorn Rate" value={`${stats?.unicorn_rate || 0}%`} color={Colors.brand.primary} />
            <StatBox label="Current Streak" value={`${stats?.win_streak || 0}`} color={Colors.status.warning} />
            <StatBox label="Longest Streak" value={`${stats?.longest_win_streak || 0}`} color={Colors.status.info} />
          </View>
          <View style={styles.winBreakdown}>
            <WinRow label="Unicorn Wins" count={stats?.unicorn_wins || 0} emoji="🦄" />
            <WinRow label="Priority Wins" count={stats?.priority_wins || 0} emoji="🎯" />
            <WinRow label="Course Corrected" count={stats?.course_corrected || 0} emoji="🔄" />
            <WinRow label="Total Entries" count={stats?.total_entries || 0} emoji="📅" />
          </View>
        </View>

        {/* Five Action Completion Rates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Core Action Rates</Text>
          {stats?.five_completion_rates && Object.entries(stats.five_completion_rates).map(([key, val]: any) => (
            <View key={key} style={styles.barRow}>
              <Text style={styles.barLabel}>{key.replace('_', ' ')}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(val, 100)}%` }]} />
              </View>
              <Text style={styles.barValue}>{val}%</Text>
            </View>
          ))}
        </View>

        {/* Determination Trend */}
        {stats?.determination_trend?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Determination Trend</Text>
            <View style={styles.trendRow}>
              {stats.determination_trend.map((d: any, i: number) => (
                <View key={i} style={styles.trendCol}>
                  <View style={[styles.trendBar, { height: Math.max(d.value * 8, 4) }]} />
                  <Text style={styles.trendLabel}>{d.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Wormhole Metrics */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>Wormhole Network</Text>
            <Text style={styles.contactCount}>{stats?.total_contacts || 0} contacts</Text>
          </View>
          {stats?.most_activated_contacts?.length > 0 ? (
            stats.most_activated_contacts.map((c: any, i: number) => (
              <View key={i} style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactInitial}>{c.name?.[0]?.toUpperCase()}</Text>
                </View>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactScore}>{c.score} touches</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No contacts yet</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WinRow({ label, count, emoji }: { label: string; count: number; emoji: string }) {
  return (
    <View style={styles.winRow}>
      <Text style={styles.winEmoji}>{emoji}</Text>
      <Text style={styles.winLabel}>{label}</Text>
      <Text style={styles.winCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  pageTitle: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.text.primary, marginBottom: 24, letterSpacing: -0.5 },
  goalCard: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 24,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.brand.primary, alignItems: 'center',
  },
  goalIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(127,0,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  goalLabel: { color: Colors.text.tertiary, fontSize: FontSize.sm, marginBottom: 4 },
  goalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800', textAlign: 'center' },
  goalDesc: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 8, textAlign: 'center' },
  card: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border.default,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary, marginBottom: 12 },
  habitLabel: { color: Colors.text.secondary, fontSize: FontSize.sm },
  streakCircle: {
    alignItems: 'center', backgroundColor: 'rgba(127,0,255,0.1)',
    borderRadius: Radius.lg, padding: 14, minWidth: 70,
  },
  streakNum: { color: Colors.brand.primary, fontSize: FontSize.xxxl, fontWeight: '900' },
  streakUnit: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  pctRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  pill: {
    flex: 1, backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 12, alignItems: 'center',
  },
  pillLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  pillValue: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  statBox: {
    width: '48%', backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: '900' },
  statLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: 4 },
  winBreakdown: { marginTop: 16 },
  winRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: 10,
  },
  winEmoji: { fontSize: 18 },
  winLabel: { color: Colors.text.secondary, fontSize: FontSize.base, flex: 1 },
  winCount: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  barRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10,
  },
  barLabel: { color: Colors.text.secondary, fontSize: FontSize.sm, width: 80, textTransform: 'capitalize' },
  barTrack: {
    flex: 1, height: 8, backgroundColor: Colors.bg.input, borderRadius: 4, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: Colors.brand.primary, borderRadius: 4 },
  barValue: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '600', width: 36, textAlign: 'right' },
  trendRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  trendCol: { alignItems: 'center', gap: 4 },
  trendBar: { width: 20, backgroundColor: Colors.brand.primary, borderRadius: 4, minHeight: 4 },
  trendLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  contactCount: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  contactAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.brand.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  contactInitial: { color: Colors.text.primary, fontWeight: '700', fontSize: FontSize.base },
  contactName: { color: Colors.text.primary, fontSize: FontSize.base, flex: 1 },
  contactScore: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  emptyText: { color: Colors.text.tertiary, fontSize: FontSize.sm, textAlign: 'center', padding: 20 },
});
