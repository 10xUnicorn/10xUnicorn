import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, FlatList, Modal,
  KeyboardAvoidingView, Platform, RefreshControl, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';

const IMPACT_LABELS: Record<number, string> = {
  1: 'Easy',
  2: '',
  3: 'Low',
  4: '',
  5: 'Medium',
  6: '',
  7: 'Moderate',
  8: '',
  9: 'Hard',
  10: 'High Impact',
};

const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function SignalsScreen() {
  const [signals, setSignals] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [pointsSummary, setPointsSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showComplete, setShowComplete] = useState<any>(null);
  
  // Add form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImpact, setNewImpact] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState(getTomorrow());
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  
  // Complete form state
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [signalsData, completionsData, pointsData] = await Promise.all([
        api.get('/signals'),
        api.get('/signal-completions?limit=20'),
        api.get('/points/summary'),
      ]);
      setSignals(signalsData);
      setCompletions(completionsData);
      setPointsSummary(pointsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const createSignal = async () => {
    if (!newName.trim()) return;
    setAddLoading(true);
    try {
      await api.post('/signals', {
        name: newName.trim(),
        description: newDescription.trim(),
        impact_rating: newImpact,
        due_date: newDueDate,
        is_public: newIsPublic,
      });
      setShowAdd(false);
      setNewName(''); setNewDescription(''); setNewImpact(null); setNewDueDate(getTomorrow()); setNewIsPublic(true);
      loadData();
    } catch (e: any) {
      console.error(e);
    } finally {
      setAddLoading(false);
    }
  };

  const completeSignal = async () => {
    if (!showComplete) return;
    setCompleteLoading(true);
    try {
      await api.post(`/signals/${showComplete.id}/complete`, {
        signal_id: showComplete.id,
        notes: completeNotes.trim(),
      });
      setShowComplete(null);
      setCompleteNotes('');
      loadData();
    } catch (e: any) {
      console.error(e);
    } finally {
      setCompleteLoading(false);
    }
  };

  const deleteSignal = async (id: string) => {
    try {
      await api.delete(`/signals/${id}`);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.primary} /></View>
      </SafeAreaView>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCompletions = completions.filter(c => c.date === todayStr);
  const completedSignalIds = new Set(todayCompletions.map(c => c.signal_id));

  // Check if due date qualifies for planned ahead bonus
  const checkPlannedAhead = (signal: any) => {
    if (!signal.due_date || !signal.created_at) return false;
    try {
      const due = new Date(signal.due_date);
      const created = new Date(signal.created_at);
      return (due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) >= 1;
    } catch {
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.brand.primary} />}
      >
        {/* Points Header */}
        <LinearGradient
          colors={[Colors.brand.primary + '30', 'transparent']}
          style={styles.pointsHeader}
        >
          <View style={styles.pointsRow}>
            <View style={styles.pointsMain}>
              <Text style={styles.pointsValue}>{pointsSummary?.total_points || 0}</Text>
              <Text style={styles.pointsLabel}>Total Points</Text>
            </View>
            <View style={styles.pointsStats}>
              <View style={styles.pointsStat}>
                <Text style={styles.statValue}>{pointsSummary?.weekly_points || 0}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
              <View style={styles.pointsStat}>
                <Text style={styles.statValue}>{pointsSummary?.signal_streak || 0}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
              <View style={styles.pointsStat}>
                <Text style={styles.statValue}>#{pointsSummary?.rank || '-'}</Text>
                <Text style={styles.statLabel}>Rank</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* My Signals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Signals</Text>
            <TouchableOpacity
              testID="add-signal-btn"
              style={styles.addBtn}
              onPress={() => setShowAdd(true)}
            >
              <Ionicons name="add" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          {signals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="flash-outline" size={40} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No signals yet</Text>
              <Text style={styles.emptySub}>Create measurable actions tied to your 10x goal</Text>
            </View>
          ) : (
            signals.map(signal => {
              const isCompleted = completedSignalIds.has(signal.id);
              const plannedAhead = checkPlannedAhead(signal);
              const impact = signal.impact_rating || 5;
              return (
                <View key={signal.id} style={[styles.signalCard, isCompleted && styles.signalCardCompleted]}>
                  <View style={styles.signalInfo}>
                    <View style={styles.signalHeader}>
                      <Text style={styles.signalName}>{signal.name}</Text>
                      {signal.impact_rating && (
                        <View style={styles.impactBadge}>
                          <Text style={styles.impactBadgeText}>{signal.impact_rating} pts</Text>
                        </View>
                      )}
                    </View>
                    {signal.description ? (
                      <Text style={styles.signalDesc}>{signal.description}</Text>
                    ) : null}
                    <View style={styles.signalMeta}>
                      {signal.due_date && (
                        <View style={styles.dueDateBadge}>
                          <Ionicons name="calendar-outline" size={12} color={Colors.text.tertiary} />
                          <Text style={styles.dueDateText}>{formatDate(signal.due_date)}</Text>
                        </View>
                      )}
                      {plannedAhead && (
                        <View style={styles.plannedBadge}>
                          <Ionicons name="moon" size={12} color={Colors.brand.accent} />
                          <Text style={styles.plannedText}>+5 bonus</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.publicToggle, signal.is_public && styles.publicToggleActive]}
                      >
                        <Ionicons 
                          name={signal.is_public ? "globe" : "lock-closed"} 
                          size={14} 
                          color={signal.is_public ? Colors.brand.accent : Colors.text.tertiary} 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteSignal(signal.id)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.text.tertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {isCompleted ? (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={28} color={Colors.status.success} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      testID={`complete-signal-${signal.id}`}
                      style={styles.completeBtn}
                      onPress={() => setShowComplete(signal)}
                    >
                      <Ionicons name="flash" size={20} color={Colors.text.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Today's Completions */}
        {todayCompletions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Wins</Text>
            {todayCompletions.map(c => (
              <View key={c.id} style={styles.completionCard}>
                <View style={styles.completionInfo}>
                  <Text style={styles.completionName}>{c.signal_name}</Text>
                  {c.notes ? <Text style={styles.completionNotes}>{c.notes}</Text> : null}
                  {c.bonuses?.length > 0 && (
                    <View style={styles.bonusList}>
                      {c.bonuses.map((b: any, i: number) => (
                        <View key={i} style={styles.bonusTag}>
                          <Text style={styles.bonusText}>+{b.points} {b.type.replace('_', ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.completionPoints}>
                  <Text style={styles.completionPointsValue}>+{c.total_points}</Text>
                  <Text style={styles.completionPointsLabel}>pts</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Signal Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Signal</Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.inputLabel}>Signal Name *</Text>
                <TextInput
                  testID="signal-name-input"
                  style={styles.modalInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g., Booked a meeting"
                  placeholderTextColor={Colors.text.tertiary}
                />
                
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  testID="signal-desc-input"
                  style={[styles.modalInput, { minHeight: 80 }]}
                  value={newDescription}
                  onChangeText={setNewDescription}
                  placeholder="What does completing this look like?"
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />
                
                <Text style={styles.inputLabel}>Due Date</Text>
                <TextInput
                  testID="signal-due-input"
                  style={styles.modalInput}
                  value={newDueDate}
                  onChangeText={setNewDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.text.tertiary}
                />
                <Text style={styles.inputHint}>Set a future date to earn +5 planned ahead bonus</Text>
                
                <Text style={styles.inputLabel}>Impact Rating (Points Value)</Text>
                <View style={styles.impactRow}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <TouchableOpacity
                      key={n}
                      testID={`impact-${n}`}
                      style={[styles.impactBtn, newImpact === n && styles.impactBtnActive]}
                      onPress={() => setNewImpact(n)}
                    >
                      <Text style={[styles.impactNum, newImpact === n && styles.impactNumActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.impactLabels}>
                  <Text style={styles.impactLabelLeft}>Easy / Low</Text>
                  <Text style={styles.impactLabelRight}>Hard / High</Text>
                </View>
                {newImpact && (
                  <Text style={styles.impactSelected}>
                    {newImpact} point{newImpact > 1 ? 's' : ''} • {newImpact <= 3 ? 'Easy task' : newImpact <= 6 ? 'Moderate effort' : 'High impact'}
                  </Text>
                )}
                
                <View style={styles.publicRow}>
                  <View style={styles.publicInfo}>
                    <Ionicons name="globe" size={20} color={newIsPublic ? Colors.brand.accent : Colors.text.tertiary} />
                    <Text style={styles.publicLabel}>Public Signal</Text>
                  </View>
                  <Switch
                    value={newIsPublic}
                    onValueChange={setNewIsPublic}
                    trackColor={{ false: Colors.bg.input, true: Colors.brand.accent }}
                    thumbColor={Colors.text.primary}
                  />
                </View>
                <Text style={styles.publicHint}>Public signals appear in the community feed</Text>
                
                <TouchableOpacity
                  testID="save-signal-btn"
                  style={[styles.saveBtn, (!newName.trim() || addLoading) && styles.saveBtnDisabled]}
                  onPress={createSignal}
                  disabled={!newName.trim() || addLoading}
                >
                  {addLoading ? <ActivityIndicator color={Colors.text.primary} /> : <Text style={styles.saveBtnText}>Create Signal</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Complete Signal Modal */}
      <Modal visible={!!showComplete} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Complete Signal</Text>
                <TouchableOpacity onPress={() => setShowComplete(null)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.completeSignalInfo}>
                  <Text style={styles.completeSignalName}>{showComplete?.name}</Text>
                  <View style={styles.impactBadge}>
                    <Text style={styles.impactBadgeText}>{showComplete?.impact_rating || 5} base pts</Text>
                  </View>
                </View>
                
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  testID="complete-notes-input"
                  style={[styles.modalInput, { minHeight: 80 }]}
                  value={completeNotes}
                  onChangeText={setCompleteNotes}
                  placeholder="What did you accomplish?"
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />
                
                <View style={styles.bonusSection}>
                  <Text style={styles.bonusSectionTitle}>Potential Bonuses</Text>
                  
                  {showComplete && checkPlannedAhead(showComplete) && (
                    <View style={styles.bonusRow}>
                      <View style={styles.bonusInfo}>
                        <Ionicons name="moon" size={18} color={Colors.brand.accent} />
                        <Text style={styles.bonusLabel}>Planned Ahead</Text>
                        <Text style={styles.bonusPoints}>+5 pts</Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.status.success} />
                    </View>
                  )}
                  
                  <View style={styles.bonusRow}>
                    <View style={styles.bonusInfo}>
                      <Ionicons name="sunny" size={18} color={Colors.status.warning} />
                      <Text style={styles.bonusLabel}>Before 6 PM</Text>
                      <Text style={styles.bonusPoints}>+10 pts</Text>
                    </View>
                    <Text style={styles.bonusAuto}>Auto</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  testID="confirm-complete-btn"
                  style={[styles.completeConfirmBtn, completeLoading && styles.saveBtnDisabled]}
                  onPress={completeSignal}
                  disabled={completeLoading}
                >
                  {completeLoading ? (
                    <ActivityIndicator color={Colors.text.primary} />
                  ) : (
                    <>
                      <Ionicons name="flash" size={20} color={Colors.text.primary} />
                      <Text style={styles.saveBtnText}>Complete & Earn Points</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  
  // Points Header
  pointsHeader: { borderRadius: Radius.lg, padding: 20, marginBottom: 20 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pointsMain: { alignItems: 'flex-start' },
  pointsValue: { fontSize: 48, fontWeight: '900', color: Colors.text.primary },
  pointsLabel: { fontSize: FontSize.sm, color: Colors.text.secondary },
  pointsStats: { flexDirection: 'row', gap: 16 },
  pointsStat: { alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.brand.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  
  // Section
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  
  // Empty State
  emptyCard: { 
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 32, 
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border.default,
    borderStyle: 'dashed',
  },
  emptyText: { color: Colors.text.secondary, fontSize: FontSize.lg, fontWeight: '600', marginTop: 12 },
  emptySub: { color: Colors.text.tertiary, fontSize: FontSize.sm, marginTop: 4, textAlign: 'center' },
  
  // Signal Card
  signalCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border.default,
  },
  signalCardCompleted: { borderColor: Colors.status.success, opacity: 0.7 },
  signalInfo: { flex: 1 },
  signalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary, flex: 1 },
  impactBadge: { backgroundColor: Colors.brand.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  impactBadgeText: { color: Colors.brand.primary, fontSize: FontSize.xs, fontWeight: '600' },
  signalDesc: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  signalMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  dueDateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bg.input, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dueDateText: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  plannedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.brand.accent + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  plannedText: { color: Colors.brand.accent, fontSize: FontSize.xs },
  publicToggle: { padding: 4 },
  publicToggleActive: {},
  deleteBtn: { padding: 4 },
  completeBtn: { 
    width: 44, height: 44, borderRadius: 22, 
    backgroundColor: Colors.brand.primary, 
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 12,
  },
  completedBadge: { marginLeft: 12 },
  
  // Completion Card
  completionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.status.success + '40',
  },
  completionInfo: { flex: 1 },
  completionName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  completionNotes: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  bonusList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  bonusTag: { backgroundColor: Colors.status.success + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  bonusText: { color: Colors.status.success, fontSize: FontSize.xs, fontWeight: '500' },
  completionPoints: { alignItems: 'center', marginLeft: 12 },
  completionPointsValue: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.status.success },
  completionPointsLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalWrap: { maxHeight: '90%' },
  modal: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, maxHeight: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  inputLabel: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  inputHint: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: 4 },
  modalInput: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default },
  
  // Impact Rating
  impactRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  impactBtn: { 
    flex: 1, paddingVertical: 12, borderRadius: Radius.sm, 
    backgroundColor: Colors.bg.input, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border.default,
  },
  impactBtnActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  impactNum: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600' },
  impactNumActive: { color: Colors.text.primary },
  impactLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  impactLabelLeft: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  impactLabelRight: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  impactSelected: { color: Colors.brand.primary, fontSize: FontSize.sm, textAlign: 'center', marginTop: 8 },
  
  publicRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  publicInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  publicLabel: { color: Colors.text.primary, fontSize: FontSize.base },
  publicHint: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: 4 },
  saveBtn: { backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  
  // Complete Modal
  completeSignalInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  completeSignalName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary, flex: 1 },
  bonusSection: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 16, marginTop: 16 },
  bonusSectionTitle: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600', marginBottom: 12 },
  bonusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  bonusInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  bonusLabel: { color: Colors.text.primary, fontSize: FontSize.base, flex: 1 },
  bonusPoints: { color: Colors.status.success, fontSize: FontSize.sm, fontWeight: '600' },
  bonusAuto: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  completeConfirmBtn: { 
    backgroundColor: Colors.status.success, borderRadius: Radius.md, padding: 16, 
    alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 8 
  },
});
