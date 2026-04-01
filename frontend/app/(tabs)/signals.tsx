import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import {
  signals as signalsDb,
  contacts as contactsDb,
  deals as dealsDb,
} from '../../src/utils/database';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  SIGNAL_TYPE_LABELS,
} from '../../src/constants/theme';
import {
  Signal,
  Contact,
  Deal,
  SignalType,
  SignalStatus,
} from '../../src/types/database';

const { height } = Dimensions.get('window');

const SIGNAL_POINTS: Record<SignalType, number> = {
  revenue_generating: 100,
  '10x_action': 120,
  marketing: 80,
  general_business: 50,
  relational: 60,
};

export default function SignalsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [dealSearchQuery, setDealSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState<Contact[]>([]);
  const [dealSearchResults, setDealSearchResults] = useState<Deal[]>([]);
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [showDealSearch, setShowDealSearch] = useState(false);

  const [newSignal, setNewSignal] = useState<Partial<Signal>>({
    type: 'revenue_generating' as SignalType,
    status: 'not_started' as SignalStatus,
    due_date: new Date().toISOString().split('T')[0],
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [signalsResult, contactsResult, dealsResult] = await Promise.all([
        signalsDb.list(user.id),
        contactsDb.list(user.id),
        dealsDb.list(user.id),
      ]);
      setSignals(signalsResult?.data || []);
      setContacts(contactsResult?.data || []);
      setDeals(dealsResult?.data || []);
    } catch (error) {
      console.error('Error loading signals:', error);
      setSignals([]);
      setContacts([]);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleSignalCompletion = async (signal: Signal) => {
    try {
      const newStatus = signal.status === 'complete' ? 'not_started' : 'complete';
      await signalsDb.update(signal.id, { status: newStatus });
      await loadData();
    } catch (error) {
      console.error('Error updating signal:', error);
    }
  };

  const saveSignal = async () => {
    if (!user || !newSignal.title?.trim()) {
      return;
    }
    try {
      const signalData: Partial<Signal> = {
        ...newSignal,
        user_id: user.id,
        created_at: new Date().toISOString(),
      };
      await signalsDb.create(user.id, signalData);
      setNewSignal({ type: 'revenue_generating', status: 'not_started', due_date: new Date().toISOString().split('T')[0] });
      setCreateModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error saving signal:', error);
    }
  };

  const searchContacts = (query: string) => {
    setContactSearchQuery(query);
    if (query.trim()) {
      const results = contacts.filter((c) =>
        (c.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(query.toLowerCase()))
      );
      setContactSearchResults(results);
    } else {
      setContactSearchResults([]);
    }
  };

  const searchDeals = (query: string) => {
    setDealSearchQuery(query);
    if (query.trim()) {
      const results = deals.filter((d) =>
        d.title.toLowerCase().includes(query.toLowerCase())
      );
      setDealSearchResults(results);
    } else {
      setDealSearchResults([]);
    }
  };

  // Calculate stats
  const activeSignals = useMemo(() => signals.filter((s) => s.status !== 'complete'), [signals]);
  const completedSignals = useMemo(() => signals.filter((s) => s.status === 'complete'), [signals]);

  const totalPointsEarned = useMemo(() => {
    return completedSignals.reduce((sum, signal) => {
      return sum + SIGNAL_POINTS[signal.type];
    }, 0);
  }, [completedSignals]);

  const weeklyPoints = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return completedSignals
      .filter((s) => new Date(s.completed_at || s.created_at) >= oneWeekAgo)
      .reduce((sum, signal) => sum + SIGNAL_POINTS[signal.type], 0);
  }, [completedSignals]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);

    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayCompletions = completedSignals.filter((s) => {
        const completedDate = new Date(s.completed_at || s.created_at);
        return completedDate >= dayStart && completedDate <= dayEnd;
      });

      if (dayCompletions.length > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [completedSignals]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={Colors.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <Text style={styles.headerTitle}>Signals & Progress</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={[{ type: 'header' }, { type: 'content' }]}
          keyExtractor={(item) => item.type}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View>
                  {/* Points Header */}
                  <View style={styles.pointsSection}>
                    <View style={styles.pointCard}>
                      <View style={styles.pointCardContent}>
                        <Text style={styles.pointCardLabel}>Total Points</Text>
                        <Text style={styles.pointCardValue}>{totalPointsEarned}</Text>
                      </View>
                      <Ionicons name="star" size={32} color={Colors.brand.primary} />
                    </View>

                    <View style={styles.pointCard}>
                      <View style={styles.pointCardContent}>
                        <Text style={styles.pointCardLabel}>Weekly Points</Text>
                        <Text style={styles.pointCardValue}>{weeklyPoints}</Text>
                      </View>
                      <Ionicons name="flame" size={32} color={Colors.status.success} />
                    </View>

                    <View style={styles.pointCard}>
                      <View style={styles.pointCardContent}>
                        <Text style={styles.pointCardLabel}>Streak</Text>
                        <Text style={styles.pointCardValue}>{currentStreak}</Text>
                      </View>
                      <Ionicons name="trending-up" size={32} color={Colors.status.warning} />
                    </View>
                  </View>

                  {/* Active Signals Header */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Signals</Text>
                    <Text style={styles.sectionCount}>{activeSignals.length}</Text>
                  </View>
                </View>
              );
            }

            return (
              <View style={{ paddingBottom: 20 }}>
                {/* Active Signals List */}
                {activeSignals.length > 0 ? (
                  <FlatList
                    data={activeSignals}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.signalCard}
                        onPress={() => toggleSignalCompletion(item)}
                      >
                        <View style={styles.signalCardLeft}>
                          <View style={styles.checkboxContainer}>
                            <Ionicons
                              name={item.status === 'complete' ? 'checkmark-circle' : 'ellipse-outline'}
                              size={28}
                              color={item.status === 'complete' ? Colors.status.success : Colors.text.secondary}
                            />
                          </View>
                          <View style={styles.signalInfo}>
                            <Text style={styles.signalTitle}>{item.title}</Text>
                            <View style={styles.signalMeta}>
                              <Text style={styles.signalType}>{SIGNAL_TYPE_LABELS[item.type]}</Text>
                              <Text style={styles.signalScore}>Score: {item.score || 5}/10</Text>
                              {item.due_date && (
                                <Text style={styles.signalDueDate}>
                                  Due: {new Date(item.due_date).toLocaleDateString()}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                        <View style={styles.signalReward}>
                          <Text style={styles.signalPoints}>{SIGNAL_POINTS[item.type]}</Text>
                          <Ionicons name="star" size={16} color={Colors.primary} />
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No active signals</Text>
                    }
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-done-outline" size={48} color={Colors.primary} />
                    <Text style={styles.emptyMessage}>All signals complete! Create new ones to continue.</Text>
                  </View>
                )}

                {/* Today's Wins Section */}
                {completedSignals.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Completed Signals</Text>
                      <Text style={styles.sectionCount}>{completedSignals.length}</Text>
                    </View>

                    <FlatList
                      data={completedSignals}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.signalCard, styles.completedSignalCard]}
                          onPress={() => toggleSignalCompletion(item)}
                        >
                          <View style={styles.signalCardLeft}>
                            <View style={styles.checkboxContainer}>
                              <Ionicons
                                name="checkmark-circle"
                                size={28}
                                color={Colors.status.success}
                              />
                            </View>
                            <View style={styles.signalInfo}>
                              <Text style={[styles.signalTitle, styles.completedSignalTitle]}>
                                {item.title}
                              </Text>
                              <View style={styles.signalMeta}>
                                <Text style={styles.signalType}>{SIGNAL_TYPE_LABELS[item.type]}</Text>
                                {item.completed_at && (
                                  <Text style={styles.completedDate}>
                                    Completed: {new Date(item.completed_at).toLocaleDateString()}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                          <View style={styles.signalReward}>
                            <Text style={[styles.signalPoints, styles.earnedPoints]}>
                              +{SIGNAL_POINTS[item.type]}
                            </Text>
                            <Ionicons name="star" size={16} color={Colors.status.success} />
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  </>
                )}
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: Spacing.lg }}
        />
      )}

      {/* Create Signal FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateModalVisible(true)}>
        <Ionicons name="add-circle" size={24} color="white" />
      </TouchableOpacity>

      {/* Create Signal Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Signal</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Signal title..."
                placeholderTextColor={Colors.textSecondary}
                value={newSignal.title || ''}
                onChangeText={(text) => setNewSignal({ ...newSignal, title: text })}
              />

              <Text style={styles.label}>Details (Optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Add context and details..."
                placeholderTextColor={Colors.textSecondary}
                value={newSignal.details || ''}
                onChangeText={(text) => setNewSignal({ ...newSignal, details: text })}
                multiline
              />

              <Text style={styles.label}>Type</Text>
              <View style={styles.typeGrid}>
                {(['revenue_generating', 'cost_saving', 'expansion', 'risk'] as SignalType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newSignal.type === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewSignal({ ...newSignal, type })}
                  >
                    <Text style={[styles.typeButtonText, newSignal.type === type && styles.typeButtonActiveText]}>
                      {SIGNAL_TYPE_LABELS[type]}
                    </Text>
                    <Text style={[styles.typePoints, newSignal.type === type && styles.typePointsActive]}>
                      {SIGNAL_POINTS[type]} pts
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Score (1-10)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={Colors.textSecondary}
                value={newSignal.score?.toString() || '5'}
                onChangeText={(text) => setNewSignal({ ...newSignal, score: Math.min(10, Math.max(1, parseInt(text) || 5)) })}
              />

              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDueDatePicker(true)}
              >
                <Ionicons name="calendar" size={18} color={Colors.brand.primary} />
                <Text style={styles.dateButtonText}>
                  {newSignal.due_date ? new Date(newSignal.due_date).toLocaleDateString() : 'Select date'}
                </Text>
              </TouchableOpacity>

              {showDueDatePicker && (
                <Modal visible={showDueDatePicker} transparent animationType="fade">
                  <View style={styles.datePickerOverlay}>
                    <View style={styles.datePickerContainer}>
                      <View style={styles.datePickerHeader}>
                        <Text style={styles.datePickerTitle}>Select Due Date</Text>
                        <TouchableOpacity onPress={() => setShowDueDatePicker(false)}>
                          <Ionicons name="close" size={24} color={Colors.text} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.textSecondary}
                        value={newSignal.due_date ? new Date(newSignal.due_date).toISOString().split('T')[0] : ''}
                        onChangeText={(text) => {
                          if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                            setNewSignal({ ...newSignal, due_date: new Date(text).toISOString() });
                          } else if (text.trim() === '') {
                            setNewSignal({ ...newSignal, due_date: undefined });
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={styles.datePickerConfirm}
                        onPress={() => setShowDueDatePicker(false)}
                      >
                        <Text style={styles.datePickerConfirmText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}

              <Text style={styles.label}>Associated Contact</Text>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => setShowContactSearch(!showContactSearch)}
              >
                <Ionicons name="search" size={18} color={Colors.brand.primary} />
                <Text style={styles.searchButtonText}>
                  {newSignal.contact_id
                    ? contacts.find((c) => c.id === newSignal.contact_id)?.full_name || 'Select contact'
                    : 'Search contacts...'}
                </Text>
              </TouchableOpacity>

              {showContactSearch && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Type contact name..."
                    placeholderTextColor={Colors.textSecondary}
                    value={contactSearchQuery}
                    onChangeText={searchContacts}
                  />
                  <FlatList
                    data={contactSearchResults}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.searchResult}
                        onPress={() => {
                          setNewSignal({ ...newSignal, contact_id: item.id });
                          setShowContactSearch(false);
                          setContactSearchQuery('');
                        }}
                      >
                        <Text style={styles.searchResultText}>{item.full_name}</Text>
                        {item.company && <Text style={styles.searchResultSubtext}>{item.company}</Text>}
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}

              <Text style={styles.label}>Associated Deal</Text>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => setShowDealSearch(!showDealSearch)}
              >
                <Ionicons name="search" size={18} color={Colors.brand.primary} />
                <Text style={styles.searchButtonText}>
                  {newSignal.deal_id
                    ? deals.find((d) => d.id === newSignal.deal_id)?.title || 'Select deal'
                    : 'Search deals...'}
                </Text>
              </TouchableOpacity>

              {showDealSearch && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Type deal name..."
                    placeholderTextColor={Colors.textSecondary}
                    value={dealSearchQuery}
                    onChangeText={searchDeals}
                  />
                  <FlatList
                    data={dealSearchResults}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.searchResult}
                        onPress={() => {
                          setNewSignal({ ...newSignal, deal_id: item.id });
                          setShowDealSearch(false);
                          setDealSearchQuery('');
                        }}
                      >
                        <Text style={styles.searchResultText}>{item.title}</Text>
                        <Text style={styles.searchResultSubtext}>${item.value?.toLocaleString()}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}

              <TouchableOpacity style={styles.primaryButton} onPress={saveSignal}>
                <Text style={styles.primaryButtonText}>Create Signal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  pointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  pointCardContent: {
    flex: 1,
  },
  pointCardLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  pointCardValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.brand.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sectionCount: {
    fontSize: Typography.sizes.md,
    color: Colors.brand.primary,
    fontWeight: '600',
  },
  signalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.elevated,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  completedSignalCard: {
    opacity: 0.7,
  },
  signalCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkboxContainer: {
    width: 28,
    justifyContent: 'center',
  },
  signalInfo: {
    flex: 1,
  },
  signalTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  completedSignalTitle: {
    textDecorationLine: 'line-through',
    color: Colors.text.secondary,
  },
  signalMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  signalType: {
    fontSize: Typography.sizes.xs,
    color: Colors.brand.primary,
    backgroundColor: Colors.brand.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  signalScore: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
  },
  signalDueDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.status.warning,
  },
  completedDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.status.success,
  },
  signalReward: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  signalPoints: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.brand.primary,
  },
  earnedPoints: {
    color: Colors.status.success,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    marginTop: Spacing.lg,
  },
  emptyMessage: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.elevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: height * 0.9,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
  },
  textArea: {
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  typeButton: {
    flex: 0.45,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.input,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  typeButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  typeButtonActiveText: {
    color: 'white',
  },
  typePoints: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
  },
  typePointsActive: {
    color: 'white',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  dateButtonText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  searchButtonText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },
  searchResult: {
    backgroundColor: Colors.background.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  searchResultSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  primaryButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: 'white',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: Colors.background.elevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  datePickerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  dateInput: {
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.lg,
  },
  datePickerConfirm: {
    backgroundColor: Colors.brand.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: 'white',
  },
});
