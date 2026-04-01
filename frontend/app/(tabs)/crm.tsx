import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import CosmicBackground from '../../src/components/CosmicBackground';
import UnicornHeader from '../../src/components/UnicornHeader';
import {
  signals as signalsDb,
  deals as dealsDb,
  contacts as contactsDb,
  contactNotes,
  interactions,
} from '../../src/utils/database';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  SIGNAL_TYPE_LABELS,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
  INTERACTION_TYPE_LABELS,
  INTERACTION_WEIGHTS,
} from '../../src/constants/theme';
import {
  Signal,
  Deal,
  Contact,
  SignalType,
  SignalStatus,
  DealStage,
  ContactType,
  InteractionType,
} from '../../src/types/database';

const { height, width } = Dimensions.get('window');

type TabType = 'contacts' | 'signals' | 'deals';

export default function CRMScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  // Contacts tab state
  const [contactSearch, setContactSearch] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState<ContactType | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactDetailsVisible, setContactDetailsVisible] = useState(false);
  const [contactNotesList, setContactNotesList] = useState<any[]>([]);
  const [contactInteractions, setContactInteractions] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingContactNote, setEditingContactNote] = useState('');

  // Signals tab state
  const [signalModalVisible, setSignalModalVisible] = useState(false);
  const [newSignal, setNewSignal] = useState<Partial<Signal>>({
    type: 'revenue_generating' as SignalType,
    status: 'not_started' as SignalStatus,
    due_date: new Date().toISOString().split('T')[0],
  });
  const [signalStatusFilter, setSignalStatusFilter] = useState<SignalStatus | null>(null);
  const [signalTypeFilter, setSignalTypeFilter] = useState<SignalType | null>(null);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [dealSearchQuery, setDealSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState<Contact[]>([]);
  const [dealSearchResults, setDealSearchResults] = useState<Deal[]>([]);
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [showDealSearch, setShowDealSearch] = useState(false);

  // Deals tab state
  const [dealModalVisible, setDealModalVisible] = useState(false);
  const [newDeal, setNewDeal] = useState<Partial<Deal>>({
    stage: 'lead' as DealStage,
  });
  const [dealStageFilter, setDealStageFilter] = useState<DealStage | null>(null);
  const [showDealDatePicker, setShowDealDatePicker] = useState(false);

  // Interaction logging state
  const [logInteractionVisible, setLogInteractionVisible] = useState(false);
  const [newInteraction, setNewInteraction] = useState<Partial<any>>({
    types: [],
    impact_rating: 5,
  });

  // Edit contact state
  const [editContactVisible, setEditContactVisible] = useState(false);
  const [editContactData, setEditContactData] = useState<Partial<Contact>>({});

  // Edit deal state
  const [editDealVisible, setEditDealVisible] = useState(false);
  const [editDealData, setEditDealData] = useState<Partial<Deal>>({});

  // Edit signal state
  const [editSignalVisible, setEditSignalVisible] = useState(false);
  const [editSignalData, setEditSignalData] = useState<Partial<Signal>>({});

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [contactsResult, signalsResult, dealsResult] = await Promise.all([
        contactsDb.list(user.id),
        signalsDb.list(user.id),
        dealsDb.list(user.id),
      ]);
      setContacts(contactsResult?.data || []);
      setSignals(signalsResult?.data || []);
      setDeals(dealsResult?.data || []);
    } catch (error) {
      console.error('Error loading CRM data:', error);
      setContacts([]);
      setSignals([]);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const loadContactDetails = async (contact: Contact) => {
    try {
      const [notesResult, interactionResult] = await Promise.all([
        contactNotes.list(contact.id),
        interactions.list(contact.id),
      ]);
      setContactNotesList(notesResult?.data || []);
      setContactInteractions(interactionResult?.data || []);
      setSelectedContact(contact);
      setContactDetailsVisible(true);
    } catch (error) {
      console.error('Error loading contact details:', error);
    }
  };

  const saveContactNote = async () => {
    if (!user || !selectedContact || !editingContactNote.trim()) return;
    try {
      const { error } = await contactNotes.create(user.id, selectedContact.id, editingContactNote);
      if (error) {
        console.error('Error saving note:', error);
        Alert.alert('Error', 'Failed to save note');
        return;
      }
      setEditingContactNote('');
      await loadContactDetails(selectedContact);
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const saveSignal = async () => {
    if (!user || !newSignal.title?.trim()) {
      Alert.alert('Error', 'Please enter a signal title');
      return;
    }
    try {
      // Normalize due_date to YYYY-MM-DD format for consistent date matching
      const normalizedDueDate = newSignal.due_date
        ? newSignal.due_date.split('T')[0]
        : new Date().toISOString().split('T')[0];
      const signalData: Partial<Signal> = {
        ...newSignal,
        due_date: normalizedDueDate,
        user_id: user.id,
        created_at: new Date().toISOString(),
      };
      await signalsDb.create(user.id, signalData);
      setNewSignal({ type: 'revenue_generating', status: 'not_started', due_date: new Date().toISOString().split('T')[0] });
      setSignalModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error saving signal:', error);
      Alert.alert('Error', 'Failed to save signal');
    }
  };

  const toggleSignalCompletion = async (signal: Signal) => {
    try {
      await signalsDb.update(signal.id, {
        status: signal.status === 'complete' ? 'not_started' : 'complete',
      });
      await loadData();
    } catch (error) {
      console.error('Error updating signal:', error);
    }
  };

  const saveDeal = async () => {
    if (!user || !newDeal.title?.trim() || !newDeal.value) {
      Alert.alert('Error', 'Please enter a deal title and value');
      return;
    }
    try {
      const dealData: Partial<Deal> = {
        title: newDeal.title,
        value: newDeal.value,
        stage: newDeal.stage || 'lead',
        contact_id: newDeal.contact_id || null,
        expected_close_date: newDeal.expected_close_date || null,
        details: newDeal.details || null,
        service_needs: newDeal.service_needs || null,
      };
      await dealsDb.create(user.id, dealData);
      setNewDeal({ stage: 'lead' });
      setDealModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error saving deal:', error);
      Alert.alert('Error', 'Failed to save deal');
    }
  };

  const deleteDeal = async (deal: Deal) => {
    Alert.alert('Delete Deal', 'Are you sure you want to delete this deal?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await dealsDb.delete(deal.id);
            await loadData();
          } catch (error) {
            console.error('Error deleting deal:', error);
            Alert.alert('Error', 'Failed to delete deal');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const logInteraction = async () => {
    if (!user || !selectedContact || !newInteraction.types?.length) {
      Alert.alert('Error', 'Please select at least one interaction type');
      return;
    }
    try {
      // DB has single `type` column — log one interaction per type selected
      for (const interactionType of newInteraction.types) {
        const { error } = await interactions.create(user.id, selectedContact.id, {
          type: interactionType as any,
          description: newInteraction.description || undefined,
          impact_rating: newInteraction.impact_rating || 5,
        });
        if (error) {
          console.error('Error logging interaction:', error);
          Alert.alert('Error', 'Failed to log interaction');
          return;
        }
      }
      setNewInteraction({ types: [], impact_rating: 5 });
      setLogInteractionVisible(false);
      await loadContactDetails(selectedContact);
    } catch (error) {
      console.error('Error logging interaction:', error);
      Alert.alert('Error', 'Failed to log interaction');
    }
  };

  const openEditContact = (contact: Contact) => {
    setEditContactData({ ...contact });
    setEditContactVisible(true);
  };

  const saveEditContact = async () => {
    if (!user) return;
    try {
      if (editContactData.id) {
        // Update existing
        const { error } = await contactsDb.update(editContactData.id, editContactData);
        if (error) {
          Alert.alert('Error', 'Failed to update contact');
          return;
        }
        if (selectedContact?.id === editContactData.id) {
          setSelectedContact({ ...selectedContact, ...editContactData } as Contact);
        }
      } else {
        // Create new
        if (!editContactData.full_name?.trim()) {
          Alert.alert('Error', 'Please enter a contact name');
          return;
        }
        const { error } = await contactsDb.create(user.id, editContactData);
        if (error) {
          Alert.alert('Error', 'Failed to create contact');
          return;
        }
      }
      setEditContactVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const openEditDeal = (deal: Deal) => {
    setEditDealData({ ...deal });
    setEditDealVisible(true);
  };

  const saveEditDeal = async () => {
    if (!editDealData.id) return;
    try {
      const { error } = await dealsDb.update(editDealData.id, {
        title: editDealData.title,
        value: editDealData.value,
        stage: editDealData.stage,
        contact_id: editDealData.contact_id,
        expected_close_date: editDealData.expected_close_date,
        details: editDealData.details,
      });
      if (error) {
        Alert.alert('Error', 'Failed to update deal');
        return;
      }
      setEditDealVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error updating deal:', error);
      Alert.alert('Error', 'Failed to update deal');
    }
  };

  const openEditSignal = (signal: Signal) => {
    setEditSignalData({ ...signal });
    setEditSignalVisible(true);
  };

  const saveEditSignal = async () => {
    if (!editSignalData.id) return;
    try {
      const { error } = await signalsDb.update(editSignalData.id, {
        title: editSignalData.title,
        details: editSignalData.details,
        type: editSignalData.type,
        score: editSignalData.score,
        due_date: editSignalData.due_date,
      });
      if (error) {
        Alert.alert('Error', 'Failed to update signal');
        return;
      }
      setEditSignalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error updating signal:', error);
      Alert.alert('Error', 'Failed to update signal');
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

  // Filtered data
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch = (c.full_name || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(contactSearch.toLowerCase()));
      const matchesType = !contactTypeFilter || c.type === contactTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [contacts, contactSearch, contactTypeFilter]);

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      const matchesStatus = !signalStatusFilter || s.status === signalStatusFilter;
      const matchesType = !signalTypeFilter || s.type === signalTypeFilter;
      return matchesStatus && matchesType;
    });
  }, [signals, signalStatusFilter, signalTypeFilter]);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => !dealStageFilter || d.stage === dealStageFilter);
  }, [deals, dealStageFilter]);

  const pipelineValue = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = filteredDeals
    .filter((d) => d.stage === 'closed_won')
    .reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <CosmicBackground>
    <View style={styles.container}>
      <UnicornHeader>
        <View>
          <Text style={styles.headerTitle}>CRM Hub</Text>
          <Text style={styles.headerSubtitle}>
            {contacts.length} contacts · {signals.length} signals · {deals.length} deals
          </Text>
        </View>
      </UnicornHeader>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {(['contacts', 'signals', 'deals'] as TabType[]).map((tab) => {
          const icons: Record<TabType, string> = { contacts: 'people', signals: 'flash', deals: 'briefcase' };
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons name={icons[tab] as any} size={16} color={isActive ? Colors.brand.primary : Colors.text.tertiary} style={{ marginBottom: 2 }} />
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : (
        <>
          {/* CONTACTS TAB */}
          {activeTab === 'contacts' && (
            <View style={styles.tabContent}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.text.secondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChangeText={setContactSearch}
                />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs, gap: Spacing.sm, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[styles.filterChip, !contactTypeFilter && styles.activeFilter]}
                    onPress={() => setContactTypeFilter(null)}
                  >
                    <Text style={[styles.filterText, !contactTypeFilter && styles.activeFilterText]}>All</Text>
                  </TouchableOpacity>
                  {Object.entries(CONTACT_TYPE_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.filterChip, contactTypeFilter === key && styles.activeFilter, { borderLeftColor: CONTACT_TYPE_COLORS[key], borderLeftWidth: 3 }]}
                      onPress={() => setContactTypeFilter(contactTypeFilter === key ? null : (key as ContactType))}
                    >
                      <Text style={[styles.filterText, contactTypeFilter === key && styles.activeFilterText]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.contactCard, { borderLeftWidth: 3, borderLeftColor: CONTACT_TYPE_COLORS[item.type] || Colors.border.default }]}
                    onPress={() => loadContactDetails(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.contactCardHeader}>
                      <View style={styles.contactAvatarSmall}>
                        <Text style={styles.contactInitialSmall}>{(item.full_name || '?')[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.contactName}>{item.full_name}</Text>
                          {item.is_wormhole && <Ionicons name="planet" size={14} color={Colors.brand.primary} />}
                        </View>
                        {item.company && <Text style={styles.contactCompany} numberOfLines={2}>{item.company}{item.title ? ` · ${item.title}` : ''}</Text>}
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: CONTACT_TYPE_COLORS[item.type] + '20', borderWidth: 1, borderColor: CONTACT_TYPE_COLORS[item.type] + '40' }]}>
                        <Text style={[styles.typeBadgeText, { color: CONTACT_TYPE_COLORS[item.type] }]}>{CONTACT_TYPE_LABELS[item.type] || item.type}</Text>
                      </View>
                    </View>
                    {item.connection_level != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 50 }}>
                        <View style={styles.connectionBar}>
                          <View style={[styles.connectionFill, { width: `${(item.connection_level / 10) * 100}%`, backgroundColor: CONTACT_TYPE_COLORS[item.type] || Colors.brand.primary }]} />
                        </View>
                        <Text style={styles.connectionLevel}>{item.connection_level}/10</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No contacts found. Add one to get started!</Text>
                }
                contentContainerStyle={{ paddingBottom: Spacing.lg }}
              />

              <TouchableOpacity style={styles.fab} onPress={() => { setEditContactData({ type: 'prospect' as ContactType, connection_level: 5 }); setEditContactVisible(true); }}>
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* SIGNALS TAB */}
          {activeTab === 'signals' && (
            <View style={styles.tabContent}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs, gap: Spacing.sm, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.filterChip, !signalStatusFilter && styles.activeFilter]}
                  onPress={() => setSignalStatusFilter(null)}
                >
                  <Text style={[styles.filterText, !signalStatusFilter && styles.activeFilterText]}>All Status</Text>
                </TouchableOpacity>
                {['not_started', 'in_progress', 'complete'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterChip, signalStatusFilter === status && styles.activeFilter]}
                    onPress={() => setSignalStatusFilter(signalStatusFilter === status ? null : (status as SignalStatus))}
                  >
                    <Text style={[styles.filterText, signalStatusFilter === status && styles.activeFilterText]}>
                      {status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FlatList
                data={filteredSignals}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const typeColor = item.type === 'revenue_generating' ? Colors.status.success
                    : item.type === '10x_action' ? Colors.brand.magenta
                    : item.type === 'marketing' ? Colors.brand.cyan
                    : item.type === 'relational' ? Colors.status.warning
                    : Colors.text.secondary;
                  return (
                    <TouchableOpacity
                      style={[styles.signalCard, item.status === 'complete' && { opacity: 0.6 }]}
                      onPress={() => toggleSignalCompletion(item)}
                      onLongPress={() => openEditSignal(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.signalAccent, { backgroundColor: typeColor }]} />
                      <View style={styles.signalCardContent}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.signalTitle, item.status === 'complete' && { textDecorationLine: 'line-through', color: Colors.text.tertiary }]}>{item.title}</Text>
                          <View style={styles.signalMeta}>
                            <View style={[styles.signalTypeBadge, { backgroundColor: typeColor + '15', borderColor: typeColor + '30' }]}>
                              <Text style={[styles.signalTypeText, { color: typeColor }]}>{SIGNAL_TYPE_LABELS[item.type]}</Text>
                            </View>
                            <Text style={styles.signalScore}>{item.score || 5}pts</Text>
                            {item.due_date && (
                              <Text style={styles.signalDue}>{item.due_date}</Text>
                            )}
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                          <TouchableOpacity onPress={() => openEditSignal(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="create-outline" size={18} color={Colors.text.tertiary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => {
                            Alert.alert('Delete Signal', `Delete "${item.title}"?`, [
                              { text: 'Cancel' },
                              { text: 'Delete', style: 'destructive', onPress: async () => {
                                try { await signalsDb.delete(item.id); await loadData(); } catch (e) { Alert.alert('Error', 'Failed to delete signal'); }
                              }},
                            ]);
                          }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="trash-outline" size={16} color={Colors.status.error + '80'} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => toggleSignalCompletion(item)}>
                            <Ionicons
                              name={item.status === 'complete' ? 'checkmark-circle' : 'ellipse-outline'}
                              size={24}
                              color={item.status === 'complete' ? Colors.status.success : Colors.text.tertiary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No signals yet. Create one to track your progress!</Text>
                }
                contentContainerStyle={{ paddingBottom: Spacing.lg }}
              />

              <TouchableOpacity style={styles.fab} onPress={() => setSignalModalVisible(true)}>
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* DEALS TAB */}
          {activeTab === 'deals' && (
            <View style={styles.tabContent}>
              {/* Summary Metrics */}
              <View style={styles.metricsContainer}>
                <LinearGradient colors={[Colors.brand.primary + '15', Colors.background.elevated]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.metric}>
                  <Ionicons name="trending-up" size={18} color={Colors.brand.primary} style={{ marginBottom: 4 }} />
                  <Text style={styles.metricValue}>${pipelineValue >= 1000 ? (pipelineValue / 1000).toFixed(1) + 'k' : pipelineValue}</Text>
                  <Text style={styles.metricLabel}>Pipeline</Text>
                </LinearGradient>
                <LinearGradient colors={[Colors.status.success + '15', Colors.background.elevated]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.metric}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.status.success} style={{ marginBottom: 4 }} />
                  <Text style={[styles.metricValue, { color: Colors.status.success }]}>${wonValue >= 1000 ? (wonValue / 1000).toFixed(1) + 'k' : wonValue}</Text>
                  <Text style={styles.metricLabel}>Won</Text>
                </LinearGradient>
                <LinearGradient colors={[Colors.brand.cyan + '15', Colors.background.elevated]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.metric}>
                  <Ionicons name="briefcase" size={18} color={Colors.brand.cyan} style={{ marginBottom: 4 }} />
                  <Text style={[styles.metricValue, { color: Colors.brand.cyan }]}>{filteredDeals.length}</Text>
                  <Text style={styles.metricLabel}>Deals</Text>
                </LinearGradient>
              </View>

              {/* Stage Filter */}
              <View style={[styles.stageFilter, { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.xs, gap: 6, alignItems: 'center' }]}>
                <TouchableOpacity
                  style={[styles.stageChip, !dealStageFilter && styles.activeFilter]}
                  onPress={() => setDealStageFilter(null)}
                >
                  <Text style={[styles.filterText, !dealStageFilter && styles.activeFilterText]}>All</Text>
                </TouchableOpacity>
                {Object.entries(DEAL_STAGE_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.stageChip,
                      dealStageFilter === key && styles.activeFilter,
                      { borderLeftColor: DEAL_STAGE_COLORS[key] },
                    ]}
                    onPress={() => setDealStageFilter(dealStageFilter === key ? null : (key as DealStage))}
                  >
                    <Text style={[styles.filterText, dealStageFilter === key && styles.activeFilterText]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FlatList
                data={filteredDeals}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const stageColor = DEAL_STAGE_COLORS[item.stage] || Colors.text.secondary;
                  return (
                    <TouchableOpacity style={[styles.dealCard, { borderLeftWidth: 3, borderLeftColor: stageColor }]} onPress={() => openEditDeal(item)} activeOpacity={0.7}>
                      <View style={styles.dealCardContent}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dealTitle}>{item.title}</Text>
                          {item.contact_id && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                              <Ionicons name="person" size={12} color={Colors.text.tertiary} />
                              <Text style={styles.dealContact}>
                                {contacts.find((c) => c.id === item.contact_id)?.full_name || 'Unknown Contact'}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.dealValue}>${(item.value || 0).toLocaleString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: Spacing.sm }}>
                          <View style={[styles.stageBadge, { backgroundColor: stageColor + '15', borderWidth: 1, borderColor: stageColor + '40' }]}>
                            <Text style={[styles.stageBadgeText, { color: stageColor }]}>{DEAL_STAGE_LABELS[item.stage] || item.stage}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                            <TouchableOpacity onPress={() => openEditDeal(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="create-outline" size={16} color={Colors.text.tertiary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteDeal(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="trash-outline" size={16} color={Colors.status.error + '80'} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No deals yet. Start building your pipeline!</Text>
                }
                contentContainerStyle={{ paddingBottom: Spacing.lg }}
              />

              <TouchableOpacity style={styles.fab} onPress={() => setDealModalVisible(true)}>
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Contact Detail Modal */}
      <Modal visible={contactDetailsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setContactDetailsVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Contact Details</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity onPress={() => {
                  if (!selectedContact) return;
                  Alert.alert('Delete Contact', `Delete ${selectedContact.full_name}?`, [
                    { text: 'Cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                      try {
                        await contactsDb.delete(selectedContact.id);
                        setContactDetailsVisible(false);
                        setSelectedContact(null);
                        await loadData();
                      } catch (e) { Alert.alert('Error', 'Failed to delete contact'); }
                    }},
                  ]);
                }}>
                  <Ionicons name="trash-outline" size={22} color={Colors.status.error} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { if (selectedContact) openEditContact(selectedContact); }}>
                  <Ionicons name="create-outline" size={24} color={Colors.brand.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedContact && (
                <>
                  <View style={styles.contactDetailHeader}>
                    <Text style={styles.contactDetailName}>{selectedContact.full_name}</Text>
                    {selectedContact.company && (
                      <Text style={styles.contactDetailCompany}>{selectedContact.company}</Text>
                    )}
                    {selectedContact.email && (
                      <Text style={styles.contactDetailInfo}>{selectedContact.email}</Text>
                    )}
                    {selectedContact.phone && (
                      <Text style={styles.contactDetailInfo}>{selectedContact.phone}</Text>
                    )}
                  </View>

                  {/* Notes Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.noteInputContainer}>
                      <TextInput
                        style={styles.noteInput}
                        placeholder="Add a timestamped note..."
                        placeholderTextColor={Colors.text.secondary}
                        value={editingContactNote}
                        onChangeText={setEditingContactNote}
                        multiline
                      />
                      <TouchableOpacity
                        style={styles.noteButton}
                        onPress={saveContactNote}
                      >
                        <Ionicons name="checkmark" size={18} color="white" />
                      </TouchableOpacity>
                    </View>

                    {contactNotesList.length > 0 && (
                      <View style={styles.notesList}>
                        {contactNotesList.map((note) => (
                          <View key={note.id} style={styles.noteItem}>
                            <Text style={styles.noteTime}>
                              {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString()}
                            </Text>
                            <Text style={styles.noteContent}>{note.content}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Interaction Log */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Interaction Log</Text>
                      <TouchableOpacity
                        style={styles.addInteractionButton}
                        onPress={() => setLogInteractionVisible(true)}
                      >
                        <Ionicons name="add" size={16} color={Colors.brand.primary} />
                      </TouchableOpacity>
                    </View>

                    {contactInteractions.length > 0 ? (
                      contactInteractions.map((interaction) => (
                        <View key={interaction.id} style={styles.interactionItem}>
                          <View style={styles.interactionHeader}>
                            <Text style={styles.interactionDate}>
                              {new Date(interaction.created_at).toLocaleDateString()}
                            </Text>
                            <Text style={styles.interactionRating}>
                              Impact: {interaction.impact_rating}/10
                            </Text>
                          </View>
                          <View style={styles.interactionTypes}>
                            <Text style={styles.interactionType}>
                              {INTERACTION_TYPE_LABELS[interaction.type] || interaction.type}
                            </Text>
                          </View>
                          {interaction.description && (
                            <Text style={styles.interactionDesc}>{interaction.description}</Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No interactions logged yet</Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Log Interaction Modal */}
      <Modal visible={logInteractionVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setLogInteractionVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Log Interaction</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Interaction Types</Text>
              <View style={styles.typeGrid}>
                {Object.entries(INTERACTION_TYPE_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.typeButton,
                      newInteraction.types?.includes(key) && styles.typeButtonActive,
                    ]}
                    onPress={() => {
                      const types = newInteraction.types || [];
                      if (types.includes(key)) {
                        setNewInteraction({
                          ...newInteraction,
                          types: types.filter((t) => t !== key),
                        });
                      } else {
                        setNewInteraction({
                          ...newInteraction,
                          types: [...types, key],
                        });
                      }
                    }}
                  >
                    <Text style={[styles.typeButtonText, newInteraction.types?.includes(key) && styles.typeButtonActiveText]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Impact Rating: {newInteraction.impact_rating}/10</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      newInteraction.impact_rating === rating && styles.ratingButtonActive,
                    ]}
                    onPress={() => setNewInteraction({ ...newInteraction, impact_rating: rating })}
                  >
                    <Text style={[styles.ratingText, newInteraction.impact_rating === rating && styles.ratingTextActive]}>
                      {rating}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Add details about this interaction..."
                placeholderTextColor={Colors.text.secondary}
                value={newInteraction.description || ''}
                onChangeText={(text) => setNewInteraction({ ...newInteraction, description: text })}
                multiline
              />

              <TouchableOpacity style={styles.primaryButton} onPress={logInteraction}>
                <Text style={styles.primaryButtonText}>Log Interaction</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Signal Modal */}
      <Modal visible={signalModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSignalModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Signal</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Signal title..."
                value={newSignal.title || ''}
                onChangeText={(text) => setNewSignal({ ...newSignal, title: text })}
              />

              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerContainer}>
                {(['revenue_generating', '10x_action', 'marketing', 'general_business', 'relational'] as SignalType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pickerOption, newSignal.type === type && styles.pickerOptionActive]}
                    onPress={() => setNewSignal({ ...newSignal, type })}
                  >
                    <Text style={[styles.pickerOptionText, newSignal.type === type && styles.pickerOptionActiveText]}>
                      {SIGNAL_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Score</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <TouchableOpacity
                    key={score}
                    style={[
                      styles.ratingButton,
                      newSignal.score === score && styles.ratingButtonActive,
                    ]}
                    onPress={() => setNewSignal({ ...newSignal, score })}
                  >
                    <Text style={[styles.ratingText, newSignal.score === score && styles.ratingTextActive]}>
                      {score}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDueDatePicker(true)}
              >
                <Ionicons name="calendar" size={18} color={Colors.brand.primary} />
                <Text style={styles.dateButtonText}>
                  {newSignal.due_date || 'Select date'}
                </Text>
              </TouchableOpacity>

              {showDueDatePicker && (() => {
                // Mini calendar logic
                const selectedDate = newSignal.due_date ? new Date(newSignal.due_date + 'T12:00:00') : new Date();
                const calMonth = selectedDate.getMonth();
                const calYear = selectedDate.getFullYear();
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                const monthLabel = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const calDays: (number | null)[] = [];
                for (let i = 0; i < firstDay; i++) calDays.push(null);
                for (let d = 1; d <= daysInMonth; d++) calDays.push(d);
                const todayStr = new Date().toISOString().split('T')[0];

                return (
                  <Modal visible={showDueDatePicker} transparent animationType="fade">
                    <TouchableOpacity style={styles.datePickerOverlay} activeOpacity={1} onPress={() => setShowDueDatePicker(false)}>
                      <View style={styles.datePickerContainer} onStartShouldSetResponder={() => true}>
                        <View style={styles.datePickerHeader}>
                          <Text style={styles.datePickerTitle}>Select Due Date</Text>
                          <TouchableOpacity onPress={() => setShowDueDatePicker(false)}>
                            <Ionicons name="close" size={24} color={Colors.text.primary} />
                          </TouchableOpacity>
                        </View>

                        {/* Quick presets */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                          {[
                            { label: 'Today', date: todayStr },
                            { label: 'Tomorrow', date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })() },
                            { label: 'Next Week', date: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })() },
                          ].map((preset) => (
                            <TouchableOpacity
                              key={preset.label}
                              style={[styles.datePresetBtn, newSignal.due_date === preset.date && { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary }]}
                              onPress={() => { setNewSignal({ ...newSignal, due_date: preset.date }); setShowDueDatePicker(false); }}
                            >
                              <Text style={[styles.datePresetText, newSignal.due_date === preset.date && { color: 'white' }]}>{preset.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Calendar Month Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <TouchableOpacity onPress={() => {
                            const prev = new Date(calYear, calMonth - 1, 1);
                            setNewSignal({ ...newSignal, due_date: prev.toISOString().split('T')[0] });
                          }}>
                            <Ionicons name="chevron-back" size={20} color={Colors.text.secondary} />
                          </TouchableOpacity>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.text.primary }}>{monthLabel}</Text>
                          <TouchableOpacity onPress={() => {
                            const next = new Date(calYear, calMonth + 1, 1);
                            setNewSignal({ ...newSignal, due_date: next.toISOString().split('T')[0] });
                          }}>
                            <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
                          </TouchableOpacity>
                        </View>

                        {/* Day headers */}
                        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' }}>{d}</Text>
                            </View>
                          ))}
                        </View>

                        {/* Calendar Grid */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {calDays.map((day, idx) => {
                            if (day === null) return <View key={`empty-${idx}`} style={{ width: '14.28%', height: 36 }} />;
                            const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = dayStr === newSignal.due_date;
                            const isToday = dayStr === todayStr;
                            return (
                              <TouchableOpacity
                                key={dayStr}
                                style={{
                                  width: '14.28%',
                                  height: 36,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  ...(isSelected ? { backgroundColor: Colors.brand.primary, borderRadius: 8 } : {}),
                                  ...(isToday && !isSelected ? { borderWidth: 1, borderColor: Colors.brand.primary + '50', borderRadius: 8 } : {}),
                                }}
                                onPress={() => { setNewSignal({ ...newSignal, due_date: dayStr }); setShowDueDatePicker(false); }}
                              >
                                <Text style={{ fontSize: 14, fontWeight: isSelected ? '700' : '400', color: isSelected ? 'white' : Colors.text.primary }}>{day}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <TouchableOpacity style={[styles.datePickerConfirm, { marginTop: 16 }]} onPress={() => setShowDueDatePicker(false)}>
                          <Text style={styles.datePickerConfirmText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                );
              })()}

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

      {/* Edit Contact Modal */}
      <Modal visible={editContactVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditContactVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Contact</Text>
              <TouchableOpacity onPress={saveEditContact}>
                <Ionicons name="checkmark" size={24} color={Colors.brand.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={editContactData.full_name || ''} onChangeText={(t) => setEditContactData({ ...editContactData, full_name: t })} placeholder="Full name" placeholderTextColor={Colors.text.secondary} />
              <Text style={styles.label}>Company</Text>
              <TextInput style={styles.input} value={editContactData.company || ''} onChangeText={(t) => setEditContactData({ ...editContactData, company: t })} placeholder="Company" placeholderTextColor={Colors.text.secondary} />
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={editContactData.title || ''} onChangeText={(t) => setEditContactData({ ...editContactData, title: t })} placeholder="Job title" placeholderTextColor={Colors.text.secondary} />
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={editContactData.email || ''} onChangeText={(t) => setEditContactData({ ...editContactData, email: t })} placeholder="Email" keyboardType="email-address" placeholderTextColor={Colors.text.secondary} />
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={editContactData.phone || ''} onChangeText={(t) => setEditContactData({ ...editContactData, phone: t })} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor={Colors.text.secondary} />
              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerContainer}>
                {Object.entries(CONTACT_TYPE_LABELS).map(([key, label]) => (
                  <TouchableOpacity key={key} style={[styles.pickerOption, editContactData.type === key && styles.pickerOptionActive]} onPress={() => setEditContactData({ ...editContactData, type: key as ContactType })}>
                    <Text style={[styles.pickerOptionText, editContactData.type === key && styles.pickerOptionActiveText]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Wormhole Contact</Text>
              <TouchableOpacity style={[styles.pickerOption, { flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={() => setEditContactData({ ...editContactData, is_wormhole: !editContactData.is_wormhole })}>
                <Ionicons name={editContactData.is_wormhole ? 'checkbox' : 'square-outline'} size={20} color={editContactData.is_wormhole ? Colors.brand.primary : Colors.text.secondary} />
                <Text style={[styles.pickerOptionText, editContactData.is_wormhole && { color: Colors.brand.primary }]}>{editContactData.is_wormhole ? 'Yes — In Wormhole' : 'No — Not in Wormhole'}</Text>
              </TouchableOpacity>
              <Text style={styles.label}>Connection Level: {editContactData.connection_level || 5}/10</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                  <TouchableOpacity key={lvl} style={[styles.ratingButton, editContactData.connection_level === lvl && styles.ratingButtonActive]} onPress={() => setEditContactData({ ...editContactData, connection_level: lvl })}>
                    <Text style={[styles.ratingText, editContactData.connection_level === lvl && styles.ratingTextActive]}>{lvl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Details</Text>
              <TextInput style={styles.textArea} value={editContactData.details || ''} onChangeText={(t) => setEditContactData({ ...editContactData, details: t })} placeholder="Notes about this contact..." placeholderTextColor={Colors.text.secondary} multiline />
              <TouchableOpacity style={styles.primaryButton} onPress={saveEditContact}>
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Signal Modal */}
      <Modal visible={editSignalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditSignalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Signal</Text>
              <TouchableOpacity onPress={saveEditSignal}>
                <Ionicons name="checkmark" size={24} color={Colors.brand.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={editSignalData.title || ''} onChangeText={(t) => setEditSignalData({ ...editSignalData, title: t })} placeholder="Signal title" placeholderTextColor={Colors.text.secondary} />
              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerContainer}>
                {(['revenue_generating', '10x_action', 'marketing', 'general_business', 'relational'] as SignalType[]).map((type) => (
                  <TouchableOpacity key={type} style={[styles.pickerOption, editSignalData.type === type && styles.pickerOptionActive]} onPress={() => setEditSignalData({ ...editSignalData, type })}>
                    <Text style={[styles.pickerOptionText, editSignalData.type === type && styles.pickerOptionActiveText]}>{SIGNAL_TYPE_LABELS[type]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Score</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <TouchableOpacity key={score} style={[styles.ratingButton, editSignalData.score === score && styles.ratingButtonActive]} onPress={() => setEditSignalData({ ...editSignalData, score })}>
                    <Text style={[styles.ratingText, editSignalData.score === score && styles.ratingTextActive]}>{score}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Due Date</Text>
              <TextInput style={styles.input} value={editSignalData.due_date || ''} onChangeText={(t) => setEditSignalData({ ...editSignalData, due_date: t })} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.text.secondary} />
              <Text style={styles.label}>Details</Text>
              <TextInput style={styles.textArea} value={editSignalData.details || ''} onChangeText={(t) => setEditSignalData({ ...editSignalData, details: t })} placeholder="Signal details..." placeholderTextColor={Colors.text.secondary} multiline />
              <TouchableOpacity style={styles.primaryButton} onPress={saveEditSignal}>
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Deal Modal */}
      <Modal visible={editDealVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditDealVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Deal</Text>
              <TouchableOpacity onPress={saveEditDeal}>
                <Ionicons name="checkmark" size={24} color={Colors.brand.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={editDealData.title || ''} onChangeText={(t) => setEditDealData({ ...editDealData, title: t })} placeholder="Deal title" placeholderTextColor={Colors.text.secondary} />
              <Text style={styles.label}>Value</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={editDealData.value?.toString() || ''} onChangeText={(t) => setEditDealData({ ...editDealData, value: parseInt(t) || 0 })} placeholder="Amount" placeholderTextColor={Colors.text.secondary} />
              <Text style={styles.label}>Stage</Text>
              <View style={styles.pickerContainer}>
                {(['lead', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as DealStage[]).map((stage) => (
                  <TouchableOpacity key={stage} style={[styles.pickerOption, editDealData.stage === stage && styles.pickerOptionActive]} onPress={() => setEditDealData({ ...editDealData, stage })}>
                    <Text style={[styles.pickerOptionText, editDealData.stage === stage && styles.pickerOptionActiveText]}>{DEAL_STAGE_LABELS[stage]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Details</Text>
              <TextInput style={styles.textArea} value={editDealData.details || ''} onChangeText={(t) => setEditDealData({ ...editDealData, details: t })} placeholder="Deal details..." placeholderTextColor={Colors.text.secondary} multiline />
              <TouchableOpacity style={styles.primaryButton} onPress={saveEditDeal}>
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Deal Modal */}
      <Modal visible={dealModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setDealModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Deal</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Deal title..."
                value={newDeal.title || ''}
                onChangeText={(text) => setNewDeal({ ...newDeal, title: text })}
              />

              <Text style={styles.label}>Value *</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                placeholder="Amount..."
                value={newDeal.value?.toString() || ''}
                onChangeText={(text) => setNewDeal({ ...newDeal, value: parseInt(text) || 0 })}
              />

              <Text style={styles.label}>Stage</Text>
              <View style={styles.pickerContainer}>
                {(['lead', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as DealStage[]).map((stage) => (
                  <TouchableOpacity
                    key={stage}
                    style={[styles.pickerOption, newDeal.stage === stage && styles.pickerOptionActive]}
                    onPress={() => setNewDeal({ ...newDeal, stage })}
                  >
                    <Text style={[styles.pickerOptionText, newDeal.stage === stage && styles.pickerOptionActiveText]}>
                      {DEAL_STAGE_LABELS[stage]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Associated Contact</Text>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => setShowContactSearch(!showContactSearch)}
              >
                <Ionicons name="search" size={18} color={Colors.brand.primary} />
                <Text style={styles.searchButtonText}>
                  {newDeal.contact_id
                    ? contacts.find((c) => c.id === newDeal.contact_id)?.full_name || 'Select contact'
                    : 'Search contacts...'}
                </Text>
              </TouchableOpacity>

              {showContactSearch && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Type contact name..."
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
                          setNewDeal({ ...newDeal, contact_id: item.id });
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

              <Text style={styles.label}>Expected Close Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDealDatePicker(true)}
              >
                <Ionicons name="calendar" size={18} color={Colors.brand.primary} />
                <Text style={styles.dateButtonText}>
                  {newDeal.expected_close_date ? new Date(newDeal.expected_close_date).toLocaleDateString() : 'Select date'}
                </Text>
              </TouchableOpacity>

              {showDealDatePicker && (
                <Modal visible={showDealDatePicker} transparent animationType="fade">
                  <View style={styles.datePickerOverlay}>
                    <View style={styles.datePickerContainer}>
                      <View style={styles.datePickerHeader}>
                        <Text style={styles.datePickerTitle}>Select Expected Close Date</Text>
                        <TouchableOpacity onPress={() => setShowDealDatePicker(false)}>
                          <Ionicons name="close" size={24} color={Colors.text.primary} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.text.secondary}
                        value={newDeal.expected_close_date ? new Date(newDeal.expected_close_date).toISOString().split('T')[0] : ''}
                        onChangeText={(text) => {
                          if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                            setNewDeal({ ...newDeal, expected_close_date: new Date(text).toISOString() });
                          } else if (text.trim() === '') {
                            setNewDeal({ ...newDeal, expected_close_date: undefined });
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={styles.datePickerConfirm}
                        onPress={() => setShowDealDatePicker(false)}
                      >
                        <Text style={styles.datePickerConfirmText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}

              <Text style={styles.label}>Details (Optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Add details about this deal..."
                placeholderTextColor={Colors.text.secondary}
                value={newDeal.details || ''}
                onChangeText={(text) => setNewDeal({ ...newDeal, details: text })}
                multiline
              />

              <TouchableOpacity style={styles.primaryButton} onPress={saveDeal}>
                <Text style={styles.primaryButtonText}>Create Deal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  headerGlow: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.brand.primary + '15',
    borderWidth: 1,
    borderColor: Colors.brand.primary + '25',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default + '60',
    backgroundColor: Colors.background.secondary,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.brand.primary,
  },
  tabText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.brand.primary,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },
  filterChips: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.elevated,
    borderWidth: 1,
    borderColor: Colors.border.default,
    flexShrink: 0,
    flexGrow: 0,
    alignSelf: 'flex-start',
  },
  activeFilter: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  filterText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  activeFilterText: {
    color: 'white',
  },
  contactCard: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    marginBottom: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border.default + '60',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  contactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.brand.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInitialSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.primary,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  contactCompany: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm + 2,
    marginLeft: 50,
    height: 6,
    backgroundColor: Colors.border.default + '40',
    borderRadius: 3,
    flex: 1,
  },
  connectionFill: {
    height: '100%',
    borderRadius: 3,
    opacity: 0.8,
  },
  connectionLevel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginLeft: 8,
    fontWeight: '700',
    minWidth: 30,
  },
  signalCard: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border.default + '60',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  signalAccent: {
    width: 4,
  },
  signalCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  signalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  signalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  signalTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  signalTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  signalScore: {
    fontSize: 12,
    color: Colors.brand.primary,
    fontWeight: '700',
  },
  signalDue: {
    fontSize: 10,
    color: Colors.text.tertiary,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metric: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default + '40',
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.brand.primary,
    marginBottom: 2,
  },
  stageFilter: {
    marginBottom: Spacing.md,
  },
  stageChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.elevated,
    borderLeftWidth: 3,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border.default + '60',
    flexShrink: 0,
    flexGrow: 0,
    alignSelf: 'flex-start',
  },
  dealCard: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    marginBottom: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border.default + '60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dealCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  dealContact: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  dealValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.brand.primary,
    marginTop: 2,
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    padding: Spacing.sm,
    alignSelf: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.88,
    paddingBottom: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default + '40',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default + '40',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalBody: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  label: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background.primary,
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
    backgroundColor: Colors.background.primary,
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
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pickerOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  pickerOptionActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  pickerOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  pickerOptionActiveText: {
    color: 'white',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
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
    backgroundColor: Colors.background.primary,
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
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
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
    backgroundColor: Colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  contactDetailHeader: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  contactDetailName: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  contactDetailCompany: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  contactDetailInfo: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  noteInputContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  noteInput: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
  },
  noteButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesList: {
    gap: Spacing.md,
  },
  noteItem: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
  },
  noteTime: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  noteContent: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  addInteractionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  interactionItem: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  interactionDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
  },
  interactionRating: {
    fontSize: Typography.sizes.xs,
    color: Colors.brand.primary,
    fontWeight: '600',
  },
  interactionTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  interactionType: {
    fontSize: Typography.sizes.xs,
    backgroundColor: Colors.brand.primary + '20',
    color: Colors.brand.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  interactionDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: 18,
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
    backgroundColor: Colors.background.primary,
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
  },
  typeButtonActiveText: {
    color: 'white',
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ratingButton: {
    width: '18%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  ratingButtonActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  ratingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  ratingTextActive: {
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
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.lg,
  },
  datePresetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.brand.primary + '12',
    borderWidth: 1,
    borderColor: Colors.brand.primary + '25',
    alignItems: 'center',
  },
  datePresetText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brand.primary,
  },
  datePickerConfirm: {
    backgroundColor: Colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  datePickerConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
});
