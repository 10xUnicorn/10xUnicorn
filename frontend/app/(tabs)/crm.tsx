import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, FlatList, Modal,
  KeyboardAvoidingView, Platform, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';
import { Linking } from 'react-native';
import { CalendarContent, getSmartDefaultDate } from '../../src/components/CalendarPicker';

const STAGES = [
  { key: 'lead', label: 'Lead', color: Colors.text.tertiary },
  { key: 'qualified', label: 'Qualified', color: Colors.brand.accent },
  { key: 'proposal', label: 'Proposal', color: Colors.status.warning },
  { key: 'negotiation', label: 'Negotiation', color: Colors.brand.primary },
  { key: 'closed_won', label: 'Won', color: Colors.status.success },
  { key: 'closed_lost', label: 'Lost', color: Colors.status.error },
];

// Signal types
const SIGNAL_TYPES = [
  { key: '10x_action', label: '10x Action Item', color: '#A855F7' },
  { key: 'revenue', label: 'Revenue Generating Activity', color: '#10B981' },
  { key: 'wormhole', label: 'Wormhole Activity', color: '#3B82F6' },
];

const CONTACT_LABELS = [
  { key: 'prospect', label: 'Prospect', color: Colors.brand.accent },
  { key: 'referral_partner', label: 'Referral Partner', color: Colors.status.warning },
  { key: 'strategic_partner', label: 'Strategic Partner', color: Colors.brand.primary },
  { key: 'client', label: 'Client', color: Colors.status.success },
  { key: 'wormhole', label: 'Wormhole', color: Colors.brand.secondary },
  { key: 'resource', label: 'Resource', color: Colors.text.tertiary },
];

// Connection levels with colors - matching screenshot exactly
const CONNECTION_LEVELS = [
  { key: 'active_professional', label: 'Active / Professional', color: '#8B5CF6' },
  { key: 'warm_local', label: 'Warm / Local', color: '#10B981' },
  { key: 'building', label: 'Building', color: '#F59E0B' },
  { key: 'mid_aspirational', label: 'Mid-Aspirational', color: '#F97316' },
  { key: 'close_personal', label: 'Close / Personal', color: '#EC4899' },
];

// Contact tags - matching screenshot exactly  
const CONTACT_TAGS = [
  { key: 'influencer', label: 'Influencer', color: '#8B5CF6' },
  { key: 'speaker', label: 'Speaker', color: '#F97316' },
  { key: 'business_owner', label: 'Business Owner', color: '#10B981' },
  { key: 'access', label: 'Access', color: '#3B82F6' },
  { key: 'mindset', label: 'Mindset', color: '#EC4899' },
  { key: 'future_self', label: 'Future Self', color: '#14B8A6' },
  { key: 'community_partner', label: 'Community Partner', color: '#6366F1' },
  { key: 'motivation', label: 'Motivation', color: '#F59E0B' },
];

// Engagement types with colors - matching screenshot
const ENGAGEMENT_TYPES = [
  { key: 'dms', label: 'DMs', color: '#3B82F6' },
  { key: 'replies_to_comments', label: 'Replies to Comments', color: '#1E40AF' },
  { key: 'shares_posts', label: 'Shares Posts', color: '#A855F7' },
  { key: 'collaborates_on_posts', label: 'Collaborates on Posts', color: '#F97316' },
  { key: 'tags_in_posts', label: 'Tags in Posts', color: '#10B981' },
  { key: 'tags_in_comments', label: 'Tags in Comments', color: '#06B6D4' },
];

// Platform options
const PLATFORM_OPTIONS = [
  { key: 'text', label: 'Text' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'in_person', label: 'In-Person' },
  { key: 'dm_instagram', label: 'IG DM' },
  { key: 'dm_linkedin', label: 'LinkedIn' },
  { key: 'video_call', label: 'Video Call' },
  { key: 'voice_call', label: 'Voice Call' },
  { key: 'meetings_app', label: 'Meetings App' },
];

// Log action types
const LOG_ACTION_TYPES = [
  { key: 'call', label: 'Call', icon: 'call' },
  { key: 'meeting', label: 'Meeting', icon: 'people' },
  { key: 'dm', label: 'DM', icon: 'chatbubble' },
  { key: 'email', label: 'Email', icon: 'mail' },
  { key: 'coffee_chat', label: 'Coffee Chat', icon: 'cafe' },
  { key: 'collaboration', label: 'Collaboration', icon: 'hand-left' },
  { key: 'intro_made', label: 'Intro Made', icon: 'git-branch' },
  { key: 'follow_up', label: 'Follow Up', icon: 'refresh' },
];

type CRMTab = 'signals' | 'contacts' | 'deals';

export default function CRMScreen() {
  const [activeTab, setActiveTab] = useState<CRMTab>('signals');
  const [signals, setSignals] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Signal state
  const [showAddSignal, setShowAddSignal] = useState(false);
  const [showEditSignal, setShowEditSignal] = useState<any>(null);
  const [signalForm, setSignalForm] = useState<any>({ name: '', description: '', impact_rating: 5, deal_id: '', notes: '', signal_type: '10x_action', due_date: '' });
  const [signalFormLoading, setSignalFormLoading] = useState(false);
  const [showSignalCalendar, setShowSignalCalendar] = useState(false);
  
  // Deal state
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showDealDetail, setShowDealDetail] = useState<any>(null);
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [dealForm, setDealForm] = useState<any>({});
  const [dealFormLoading, setDealFormLoading] = useState(false);
  
  // Contact state
  const [showAddContact, setShowAddContact] = useState(false);
  const [showContactDetail, setShowContactDetail] = useState<any>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<any>({});
  const [contactFormLoading, setContactFormLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAllFields, setShowAllFields] = useState(false);
  
  // Wormhole detail state
  const [showWormholeDetail, setShowWormholeDetail] = useState<any>(null);
  const [wormholeLogs, setWormholeLogs] = useState<any[]>([]);
  const [showAddLog, setShowAddLog] = useState(false);
  const [logForm, setLogForm] = useState({ action_type: 'call', notes: '' });

  const resetDealForm = () => {
    setDealForm({
      name: '', contact_id: '', company: '', value: '',
      stage: 'lead', close_date: '', notes: '', needs: [],
      notifications_enabled: true
    });
  };

  const resetContactForm = () => {
    setContactForm({
      name: '', company: '', title: '', location: '', email: '', phone: '',
      label: 'prospect', connection_level: 'warm_local', tags: [],
      website: '', linkedin: '', instagram: '', twitter: '', youtube: '', tiktok: '',
      activation_next_step: '', preferred_platform: '', power_leverage: '',
      engagement_level: 'moderate', engagement_types: [], reciprocity_notes: '', notes: '',
      set_meeting: false, tagging_in_posts: false, tagging_in_comments: false,
      last_contact_date: '', engagement_strength: 5,
    });
    setShowAllFields(false);
  };

  const loadData = useCallback(async () => {
    try {
      const [signalsData, dealsData, contactsData] = await Promise.all([
        api.get('/signals'),
        api.get('/deals'),
        api.get('/wormhole-contacts'),
      ]);
      setSignals(signalsData || []);
      setDeals(dealsData || []);
      setContacts(contactsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  // Signal handlers
  const saveSignal = async (isNew = true) => {
    if (!signalForm.name?.trim()) return;
    setSignalFormLoading(true);
    try {
      const payload = {
        ...signalForm,
        impact_rating: signalForm.impact_rating || 5,
      };
      if (isNew) {
        await api.post('/signals', payload);
      } else {
        await api.put(`/signals/${showEditSignal.id}`, payload);
      }
      loadData();
      setShowAddSignal(false);
      setShowEditSignal(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSignalFormLoading(false);
    }
  };

  const deleteSignal = async (signalId: string) => {
    Alert.alert('Delete Signal', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/signals/${signalId}`);
            loadData();
            setShowEditSignal(null);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  // Load wormhole logs when detail view opens
  const loadWormholeLogs = async (contactId: string) => {
    try {
      const data = await api.get(`/wormhole-contacts/${contactId}/logs`);
      setWormholeLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Add wormhole log
  const addWormholeLog = async () => {
    if (!logForm.notes?.trim() || !showWormholeDetail) return;
    try {
      await api.post(`/wormhole-contacts/${showWormholeDetail.id}/logs`, {
        contact_id: showWormholeDetail.id,
        action_type: logForm.action_type,
        notes: logForm.notes,
      });
      setLogForm({ action_type: 'call', notes: '' });
      setShowAddLog(false);
      loadWormholeLogs(showWormholeDetail.id);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Open wormhole detail view
  const openWormholeDetail = async (contact: any) => {
    setShowWormholeDetail(contact);
    setContactForm({ ...contact });
    loadWormholeLogs(contact.id);
  };

  // Deal handlers
  const saveDeal = async (isNew = true) => {
    if (!dealForm.name?.trim()) return;
    setDealFormLoading(true);
    try {
      const payload = {
        ...dealForm,
        value: dealForm.value ? parseFloat(dealForm.value) : null,
        contact_id: dealForm.contact_id || null,
      };
      if (isNew) {
        await api.post('/deals', payload);
        setShowAddDeal(false);
      } else {
        await api.put(`/deals/${showDealDetail.id}`, payload);
        setShowDealDetail(null);
      }
      resetDealForm();
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setDealFormLoading(false);
    }
  };

  const deleteDeal = async (id: string) => {
    Alert.alert('Delete Deal', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.delete(`/deals/${id}`);
        setShowDealDetail(null);
        loadData();
      }}
    ]);
  };

  const openEditDeal = (deal: any) => {
    setDealForm({
      name: deal.name || '',
      contact_id: deal.contact_id || '',
      company: deal.company || '',
      value: deal.value?.toString() || '',
      stage: deal.stage || 'lead',
      close_date: deal.close_date || '',
      notes: deal.notes || '',
      needs: deal.needs || [],
      notifications_enabled: deal.notifications_enabled ?? true,
    });
    setShowDealDetail(deal);
  };

  // Contact handlers
  const saveContact = async (isNew = true) => {
    if (!contactForm.name?.trim()) return;
    setContactFormLoading(true);
    try {
      const contactId = showWormholeDetail?.id || showContactDetail?.id;
      if (isNew) {
        await api.post('/wormhole-contacts', contactForm);
        setShowAddContact(false);
      } else if (showWormholeDetail) {
        await api.put(`/wormhole-contacts/${contactId}`, contactForm);
        setShowWormholeDetail(null);
      } else {
        await api.put(`/wormhole-contacts/${contactId}`, contactForm);
        setShowContactDetail(null);
      }
      resetContactForm();
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setContactFormLoading(false);
    }
  };

  const deleteContact = async (id: string) => {
    Alert.alert('Delete Contact', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.delete(`/wormhole-contacts/${id}`);
        setShowContactDetail(null);
        loadData();
      }}
    ]);
  };

  const openEditContact = (contact: any) => {
    setContactForm({ ...contact });
    setShowContactDetail(contact);
  };

  const getStageColor = (stage: string) => STAGES.find(s => s.key === stage)?.color || Colors.text.tertiary;
  const getLabelColor = (label: string) => CONTACT_LABELS.find(l => l.key === label)?.color || Colors.text.tertiary;
  const getConnectionColor = (level: string) => CONNECTION_LEVELS.find(l => l.key === level)?.color || '#6B7280';
  const getConnectionLabel = (level: string) => CONNECTION_LEVELS.find(l => l.key === level)?.label || 'New';

  const formatValue = (value: number) => {
    if (!value) return '';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Normalize to YYYY-MM-DD first
      let normalized = dateStr;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [mm, dd, yy] = parts;
          normalized = `20${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
      }
      if (dateStr.includes('T')) normalized = dateStr.split('T')[0];
      // Format as readable date
      const d = new Date(normalized + 'T12:00:00');
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatTagLabel = (tag: string) => tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Determine which fields to show based on contact label
  const shouldShowField = (field: string, label: string) => {
    const wormholeFields = ['power_leverage', 'reciprocity_notes', 'tagging_in_posts', 'tagging_in_comments', 'engagement_level'];
    const clientFields = ['last_contact_date', 'set_meeting'];
    const prospectFields = ['activation_next_step', 'preferred_platform'];
    
    if (showAllFields) return true;
    
    if (label === 'wormhole') {
      return true; // Show all fields for wormholes
    }
    if (wormholeFields.includes(field) && label !== 'wormhole') {
      return false;
    }
    return true;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.primary} /></View>
      </SafeAreaView>
    );
  }

  const filteredDeals = filterStage ? deals.filter(d => d.stage === filterStage) : deals;
  const filteredContacts = contacts.filter(c => {
    if (filterLabel && c.label !== filterLabel) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return c.name?.toLowerCase().includes(searchLower) ||
             c.company?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const totalPipeline = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = deals.filter(d => d.stage === 'closed_won')
    .reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>CRM</Text>
        <TouchableOpacity 
          testID="add-crm-btn" 
          style={styles.addBtn} 
          onPress={() => {
            if (activeTab === 'signals') {
              setSignalForm({ name: '', description: '', impact_rating: 5, deal_id: '', notes: '', signal_type: '10x_action', due_date: '' });
              setShowAddSignal(true);
            } else if (activeTab === 'deals') {
              resetDealForm();
              setShowAddDeal(true);
            } else {
              resetContactForm();
              setShowAddContact(true);
            }
          }}
        >
          <Ionicons name="add" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          testID="crm-tab-signals"
          style={[styles.tab, activeTab === 'signals' && styles.tabActive]}
          onPress={() => setActiveTab('signals')}
        >
          <Ionicons name="flash" size={18} color={activeTab === 'signals' ? Colors.brand.primary : Colors.text.tertiary} />
          <Text style={[styles.tabText, activeTab === 'signals' && styles.tabTextActive]}>Signals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="crm-tab-contacts"
          style={[styles.tab, activeTab === 'contacts' && styles.tabActive]}
          onPress={() => setActiveTab('contacts')}
        >
          <Ionicons name="people" size={18} color={activeTab === 'contacts' ? Colors.brand.primary : Colors.text.tertiary} />
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="crm-tab-deals"
          style={[styles.tab, activeTab === 'deals' && styles.tabActive]}
          onPress={() => setActiveTab('deals')}
        >
          <Ionicons name="briefcase" size={18} color={activeTab === 'deals' ? Colors.brand.primary : Colors.text.tertiary} />
          <Text style={[styles.tabText, activeTab === 'deals' && styles.tabTextActive]}>Deals</Text>
        </TouchableOpacity>
      </View>

      {/* Signals Tab */}
      {activeTab === 'signals' && (
        <FlatList
          data={signals}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.brand.primary} />}
          ListHeaderComponent={() => (
            <View style={styles.signalHeader}>
              <Text style={styles.signalCount}>{signals.length} Signals</Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No signals yet</Text>
              <Text style={styles.emptySubtext}>Create signals from the Daily screen</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity 
              testID={`signal-${item.id}`} 
              style={styles.signalCard}
              onPress={() => {
                setSignalForm({
                  name: item.name || '',
                  description: item.description || '',
                  impact_rating: item.impact_rating || 5,
                  deal_id: item.deal_id || '',
                  notes: item.notes || '',
                  signal_type: item.signal_type || '10x_action',
                  due_date: item.due_date || '',
                });
                setShowEditSignal(item);
              }}
            >
              <View style={styles.signalRow}>
                <View style={[styles.signalImpact, item.completed_at && styles.signalImpactCompleted]}>
                  <Text style={styles.signalImpactText}>{item.impact_rating || 5}</Text>
                </View>
                <View style={styles.signalInfo}>
                  <Text style={[styles.signalName, item.completed_at && styles.signalNameCompleted]}>{item.name}</Text>
                  {item.due_date && <Text style={styles.signalDue}>Due: {formatDate(item.due_date)}</Text>}
                  {item.is_top_10x_action && <Text style={styles.signalTop10x}>⭐ Top 10x Action</Text>}
                </View>
                {item.completed_at ? (
                  <View style={styles.signalCompletedBadge}>
                    <Text style={{ fontSize: 16 }}>✅</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Deals Tab */}
      {activeTab === 'deals' && (
        <>
          {/* Pipeline Summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{formatValue(totalPipeline) || '$0'}</Text>
              <Text style={styles.summaryLabel}>Pipeline</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: Colors.status.success }]}>{formatValue(wonValue) || '$0'}</Text>
              <Text style={styles.summaryLabel}>Won</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{deals.length}</Text>
              <Text style={styles.summaryLabel}>Deals</Text>
            </View>
          </View>

          {/* Stage Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !filterStage && styles.filterChipActive]}
              onPress={() => setFilterStage(null)}
            >
              <Text style={[styles.filterText, !filterStage && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            {STAGES.map(stage => (
              <TouchableOpacity
                key={stage.key}
                style={[styles.filterChip, filterStage === stage.key && styles.filterChipActive]}
                onPress={() => setFilterStage(filterStage === stage.key ? null : stage.key)}
              >
                <View style={[styles.dot, { backgroundColor: stage.color }]} />
                <Text style={[styles.filterText, filterStage === stage.key && styles.filterTextActive]}>{stage.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Deals List */}
          <FlatList
            data={filteredDeals}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.brand.primary} />}
            renderItem={({ item }) => (
              <TouchableOpacity testID={`deal-${item.id}`} style={styles.card} onPress={() => openEditDeal(item)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.value && <Text style={styles.cardValue}>{formatValue(item.value)}</Text>}
                </View>
                {item.company && <Text style={styles.cardSubtitle}>{item.company}</Text>}
                {item.contact_name && <Text style={styles.cardContact}>👤 {item.contact_name}</Text>}
                <View style={styles.cardFooter}>
                  <View style={[styles.badge, { backgroundColor: getStageColor(item.stage) + '20' }]}>
                    <View style={[styles.dot, { backgroundColor: getStageColor(item.stage) }]} />
                    <Text style={[styles.badgeText, { color: getStageColor(item.stage) }]}>
                      {STAGES.find(s => s.key === item.stage)?.label || item.stage}
                    </Text>
                  </View>
                  {item.close_date && (
                    <View style={styles.closeDateBadge}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.text.tertiary} />
                      <Text style={styles.closeDateText}>{formatDate(item.close_date)}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="briefcase-outline" size={48} color={Colors.text.tertiary} />
                <Text style={styles.emptyText}>No deals yet</Text>
                <Text style={styles.emptySub}>Track your business opportunities</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        </>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <>
          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.text.tertiary} />
            <TextInput
              testID="contact-search-input"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search contacts..."
              placeholderTextColor={Colors.text.tertiary}
            />
          </View>

          {/* Label Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !filterLabel && styles.filterChipActive]}
              onPress={() => setFilterLabel(null)}
            >
              <Text style={[styles.filterText, !filterLabel && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            {CONTACT_LABELS.map(label => (
              <TouchableOpacity
                key={label.key}
                style={[styles.filterChip, filterLabel === label.key && styles.filterChipActive]}
                onPress={() => setFilterLabel(filterLabel === label.key ? null : label.key)}
              >
                <View style={[styles.dot, { backgroundColor: label.color }]} />
                <Text style={[styles.filterText, filterLabel === label.key && styles.filterTextActive]}>{label.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Contacts List */}
          <FlatList
            data={filteredContacts}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.brand.primary} />}
            renderItem={({ item }) => (
              <TouchableOpacity 
                testID={`contact-${item.id}`} 
                style={styles.card} 
                onPress={() => item.label === 'wormhole' ? openWormholeDetail(item) : openEditContact(item)}
              >
                <View style={styles.contactRow}>
                  <View style={[styles.avatar, { backgroundColor: getLabelColor(item.label) }]}>
                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      {/* Connection Level Pill */}
                      <View style={[styles.connectionPill, { backgroundColor: getConnectionColor(item.connection_level) }]}>
                        <Text style={styles.connectionPillText}>{getConnectionLabel(item.connection_level)}</Text>
                      </View>
                    </View>
                    {item.company && <Text style={styles.cardSubtitle}>{item.company}{item.title ? ` • ${item.title}` : ''}</Text>}
                    {/* Tags Row */}
                    {item.tags?.length > 0 && (
                      <View style={styles.tagsRow}>
                        {item.tags.slice(0, 3).map((tag: string) => (
                          <View key={tag} style={styles.tagChip}>
                            <Text style={styles.tagChipText}>{formatTagLabel(tag)}</Text>
                          </View>
                        ))}
                        {item.tags.length > 3 && <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>}
                      </View>
                    )}
                    <View style={styles.labelRow}>
                      <View style={[styles.labelBadge, { backgroundColor: getLabelColor(item.label) + '20' }]}>
                        <Text style={[styles.labelText, { color: getLabelColor(item.label) }]}>
                          {CONTACT_LABELS.find(l => l.key === item.label)?.label || item.label || 'Prospect'}
                        </Text>
                      </View>
                      {item.last_contact_date && (
                        <Text style={styles.lastContactText}>Last: {item.last_contact_date}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.contactMeta}>
                    <Text style={styles.score}>{item.engagement_score || 0}</Text>
                    <Text style={styles.scoreLabel}>touches</Text>
                    {item.label === 'wormhole' && (
                      <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} style={{ marginTop: 4 }} />
                    )}
                  </View>
                </View>
                {item.activation_next_step && (
                  <View style={styles.nextStepRow}>
                    <Ionicons name="arrow-forward-circle" size={14} color={Colors.brand.accent} />
                    <Text style={styles.nextStepText} numberOfLines={1}>{item.activation_next_step}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color={Colors.text.tertiary} />
                <Text style={styles.emptyText}>No contacts yet</Text>
                <Text style={styles.emptySub}>Add your first connection</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        </>
      )}

      {/* Add/Edit Deal Modal */}
      <Modal visible={showAddDeal || !!showDealDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{showDealDetail ? 'Edit Deal' : 'New Deal'}</Text>
                <TouchableOpacity onPress={() => { setShowAddDeal(false); setShowDealDetail(null); }}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Deal Name *</Text>
                <TextInput style={styles.input} value={dealForm.name} onChangeText={t => setDealForm({...dealForm, name: t})} placeholder="e.g., Enterprise Contract" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Company</Text>
                <TextInput style={styles.input} value={dealForm.company} onChangeText={t => setDealForm({...dealForm, company: t})} placeholder="Company name" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Value ($)</Text>
                <TextInput style={styles.input} value={dealForm.value} onChangeText={t => setDealForm({...dealForm, value: t})} placeholder="50000" placeholderTextColor={Colors.text.tertiary} keyboardType="numeric" />

                <Text style={styles.inputLabel}>Close Date (MM/DD/YY)</Text>
                <TextInput style={styles.input} value={dealForm.close_date} onChangeText={t => setDealForm({...dealForm, close_date: t})} placeholder="12/31/25" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Stage</Text>
                <View style={styles.optionRow}>
                  {STAGES.map(stage => (
                    <TouchableOpacity
                      key={stage.key}
                      style={[styles.optionBtn, dealForm.stage === stage.key && { backgroundColor: stage.color + '30', borderColor: stage.color }]}
                      onPress={() => setDealForm({...dealForm, stage: stage.key})}
                    >
                      <View style={[styles.dot, { backgroundColor: stage.color }]} />
                      <Text style={[styles.optionText, dealForm.stage === stage.key && { color: stage.color }]}>{stage.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Associated Contact</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionRow}>
                    <TouchableOpacity
                      style={[styles.contactChip, !dealForm.contact_id && styles.contactChipActive]}
                      onPress={() => setDealForm({...dealForm, contact_id: ''})}
                    >
                      <Text style={[styles.contactChipText, !dealForm.contact_id && styles.contactChipTextActive]}>None</Text>
                    </TouchableOpacity>
                    {contacts.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.contactChip, dealForm.contact_id === c.id && styles.contactChipActive]}
                        onPress={() => setDealForm({...dealForm, contact_id: c.id})}
                      >
                        <Text style={[styles.contactChipText, dealForm.contact_id === c.id && styles.contactChipTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput style={[styles.input, { minHeight: 80 }]} value={dealForm.notes} onChangeText={t => setDealForm({...dealForm, notes: t})} placeholder="Deal notes..." placeholderTextColor={Colors.text.tertiary} multiline />

                <TouchableOpacity 
                  style={styles.notificationToggle}
                  onPress={() => setDealForm({...dealForm, notifications_enabled: !dealForm.notifications_enabled})}
                >
                  <View style={[styles.toggleBox, dealForm.notifications_enabled && styles.toggleBoxActive]}>
                    {dealForm.notifications_enabled && <Ionicons name="checkmark" size={14} color={Colors.text.primary} />}
                  </View>
                  <Text style={styles.toggleLabel}>Enable close date notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.saveBtn, (!dealForm.name?.trim() || dealFormLoading) && styles.saveBtnDisabled]} onPress={() => saveDeal(!showDealDetail)} disabled={!dealForm.name?.trim() || dealFormLoading}>
                  {dealFormLoading ? <ActivityIndicator color={Colors.text.primary} /> : <Text style={styles.saveBtnText}>{showDealDetail ? 'Save Changes' : 'Create Deal'}</Text>}
                </TouchableOpacity>

                {showDealDetail && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDeal(showDealDetail.id)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.status.error} />
                    <Text style={styles.deleteBtnText}>Delete Deal</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Add/Edit Contact Modal - Dynamic based on label */}
      <Modal visible={showAddContact || !!showContactDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{showContactDetail ? 'Edit Contact' : 'New Contact'}</Text>
                <TouchableOpacity onPress={() => { setShowAddContact(false); setShowContactDetail(null); }}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Basic Info */}
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput style={styles.input} value={contactForm.name} onChangeText={t => setContactForm({...contactForm, name: t})} placeholder="Full name" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Label</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionRow}>
                    {CONTACT_LABELS.map(label => (
                      <TouchableOpacity
                        key={label.key}
                        style={[styles.optionBtn, contactForm.label === label.key && { backgroundColor: label.color + '30', borderColor: label.color }]}
                        onPress={() => setContactForm({...contactForm, label: label.key})}
                      >
                        <View style={[styles.dot, { backgroundColor: label.color }]} />
                        <Text style={[styles.optionText, contactForm.label === label.key && { color: label.color }]}>{label.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.inputLabel}>Company</Text>
                <TextInput style={styles.input} value={contactForm.company} onChangeText={t => setContactForm({...contactForm, company: t})} placeholder="Company name" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Title</Text>
                <TextInput style={styles.input} value={contactForm.title} onChangeText={t => setContactForm({...contactForm, title: t})} placeholder="Job title" placeholderTextColor={Colors.text.tertiary} />

                {/* PROSPECT - Show: Potential Value, Interest Level, Next Step */}
                {contactForm.label === 'prospect' && (
                  <>
                    <Text style={styles.inputLabel}>Potential Value</Text>
                    <TextInput style={styles.input} value={contactForm.power_leverage} onChangeText={t => setContactForm({...contactForm, power_leverage: t})} placeholder="e.g., $10K deal potential" placeholderTextColor={Colors.text.tertiary} />
                    <Text style={styles.inputLabel}>Interest Level</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.optionRow}>
                        {[{key: 'cold', label: 'Cold'}, {key: 'warm', label: 'Warm'}, {key: 'hot', label: 'Hot'}].map(level => (
                          <TouchableOpacity
                            key={level.key}
                            style={[styles.optionBtn, contactForm.connection_level === level.key && styles.optionBtnActive]}
                            onPress={() => setContactForm({...contactForm, connection_level: level.key})}
                          >
                            <Text style={[styles.optionText, contactForm.connection_level === level.key && styles.optionTextActive]}>{level.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    <Text style={styles.inputLabel}>Next Step</Text>
                    <TextInput style={styles.input} value={contactForm.activation_next_step} onChangeText={t => setContactForm({...contactForm, activation_next_step: t})} placeholder="e.g., Send proposal, Schedule demo" placeholderTextColor={Colors.text.tertiary} />
                  </>
                )}

                {/* REFERRAL_PARTNER - Show: Referral History, Commission %, Mutual Value */}
                {contactForm.label === 'referral_partner' && (
                  <>
                    <Text style={styles.inputLabel}>Referral History</Text>
                    <TextInput style={[styles.input, { minHeight: 60 }]} value={contactForm.notes} onChangeText={t => setContactForm({...contactForm, notes: t})} placeholder="Past referrals given/received..." placeholderTextColor={Colors.text.tertiary} multiline />
                    <Text style={styles.inputLabel}>Commission/Value Exchange</Text>
                    <TextInput style={styles.input} value={contactForm.power_leverage} onChangeText={t => setContactForm({...contactForm, power_leverage: t})} placeholder="e.g., 10% commission, mutual intros" placeholderTextColor={Colors.text.tertiary} />
                    <Text style={styles.inputLabel}>Reciprocity Notes</Text>
                    <TextInput style={[styles.input, { minHeight: 60 }]} value={contactForm.reciprocity_notes} onChangeText={t => setContactForm({...contactForm, reciprocity_notes: t})} placeholder="What have you done for each other?" placeholderTextColor={Colors.text.tertiary} multiline />
                  </>
                )}

                {/* STRATEGIC_PARTNER - Show: Partnership Details, Mutual Goals, Collaboration Notes */}
                {contactForm.label === 'strategic_partner' && (
                  <>
                    <Text style={styles.inputLabel}>Partnership Type</Text>
                    <View style={styles.tagsWrap}>
                      {[{key: 'co_marketing', label: 'Co-Marketing'}, {key: 'integration', label: 'Integration'}, {key: 'reseller', label: 'Reseller'}, {key: 'joint_venture', label: 'Joint Venture'}].map(tag => (
                        <TouchableOpacity
                          key={tag.key}
                          style={[styles.tagOption, contactForm.tags?.includes(tag.key) && styles.tagOptionActive]}
                          onPress={() => {
                            const tags = contactForm.tags || [];
                            const newTags = tags.includes(tag.key) ? tags.filter((t: string) => t !== tag.key) : [...tags, tag.key];
                            setContactForm({...contactForm, tags: newTags});
                          }}
                        >
                          <Text style={[styles.tagOptionText, contactForm.tags?.includes(tag.key) && styles.tagOptionTextActive]}>{tag.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.inputLabel}>Mutual Value</Text>
                    <TextInput style={[styles.input, { minHeight: 60 }]} value={contactForm.power_leverage} onChangeText={t => setContactForm({...contactForm, power_leverage: t})} placeholder="What value does this partnership create?" placeholderTextColor={Colors.text.tertiary} multiline />
                    <Text style={styles.inputLabel}>Next Collaboration Step</Text>
                    <TextInput style={styles.input} value={contactForm.activation_next_step} onChangeText={t => setContactForm({...contactForm, activation_next_step: t})} placeholder="e.g., Joint webinar, Feature integration" placeholderTextColor={Colors.text.tertiary} />
                  </>
                )}

                {/* CLIENT - Show: Contract Details, Revenue, Project History */}
                {contactForm.label === 'client' && (
                  <>
                    <Text style={styles.inputLabel}>Contract/Revenue Value</Text>
                    <TextInput style={styles.input} value={contactForm.power_leverage} onChangeText={t => setContactForm({...contactForm, power_leverage: t})} placeholder="e.g., $5K/month retainer" placeholderTextColor={Colors.text.tertiary} />
                    <Text style={styles.inputLabel}>Engagement Status</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.optionRow}>
                        {[{key: 'active', label: 'Active'}, {key: 'paused', label: 'Paused'}, {key: 'churned', label: 'Churned'}, {key: 'upsell', label: 'Upsell Opp'}].map(level => (
                          <TouchableOpacity
                            key={level.key}
                            style={[styles.optionBtn, contactForm.connection_level === level.key && styles.optionBtnActive]}
                            onPress={() => setContactForm({...contactForm, connection_level: level.key})}
                          >
                            <Text style={[styles.optionText, contactForm.connection_level === level.key && styles.optionTextActive]}>{level.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    <Text style={styles.inputLabel}>Project History</Text>
                    <TextInput style={[styles.input, { minHeight: 80 }]} value={contactForm.notes} onChangeText={t => setContactForm({...contactForm, notes: t})} placeholder="Projects completed, deliverables..." placeholderTextColor={Colors.text.tertiary} multiline />
                  </>
                )}

                {/* RESOURCE - Show: Expertise, Hourly Rate, Availability */}
                {contactForm.label === 'resource' && (
                  <>
                    <Text style={styles.inputLabel}>Expertise Areas</Text>
                    <View style={styles.tagsWrap}>
                      {[{key: 'design', label: 'Design'}, {key: 'development', label: 'Development'}, {key: 'marketing', label: 'Marketing'}, {key: 'operations', label: 'Operations'}, {key: 'legal', label: 'Legal'}, {key: 'finance', label: 'Finance'}].map(tag => (
                        <TouchableOpacity
                          key={tag.key}
                          style={[styles.tagOption, contactForm.tags?.includes(tag.key) && styles.tagOptionActive]}
                          onPress={() => {
                            const tags = contactForm.tags || [];
                            const newTags = tags.includes(tag.key) ? tags.filter((t: string) => t !== tag.key) : [...tags, tag.key];
                            setContactForm({...contactForm, tags: newTags});
                          }}
                        >
                          <Text style={[styles.tagOptionText, contactForm.tags?.includes(tag.key) && styles.tagOptionTextActive]}>{tag.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.inputLabel}>Rate / Cost</Text>
                    <TextInput style={styles.input} value={contactForm.power_leverage} onChangeText={t => setContactForm({...contactForm, power_leverage: t})} placeholder="e.g., $150/hr, $2K/project" placeholderTextColor={Colors.text.tertiary} />
                    <Text style={styles.inputLabel}>Availability</Text>
                    <TextInput style={styles.input} value={contactForm.activation_next_step} onChangeText={t => setContactForm({...contactForm, activation_next_step: t})} placeholder="e.g., Part-time, On-demand" placeholderTextColor={Colors.text.tertiary} />
                  </>
                )}

                {/* WORMHOLE - Show all wormhole-specific fields */}
                {(contactForm.label === 'wormhole' || showAllFields) && (
                  <>
                    {/* Connection Level */}
                    <Text style={styles.inputLabel}>Connection Level</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.optionRow}>
                        {CONNECTION_LEVELS.map(level => (
                          <TouchableOpacity
                            key={level.key}
                            style={[styles.connectionBtn, contactForm.connection_level === level.key && { backgroundColor: level.color }]}
                            onPress={() => setContactForm({...contactForm, connection_level: level.key})}
                          >
                            <Text style={[styles.connectionBtnText, contactForm.connection_level === level.key && { color: '#fff' }]}>{level.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Tags */}
                    <Text style={styles.inputLabel}>Tags</Text>
                    <View style={styles.tagsWrap}>
                      {CONTACT_TAGS.map(tag => (
                        <TouchableOpacity
                          key={tag.key}
                          style={[styles.tagOption, contactForm.tags?.includes(tag.key) && { backgroundColor: tag.color + '30', borderColor: tag.color }]}
                          onPress={() => {
                            const tags = contactForm.tags || [];
                            const newTags = tags.includes(tag.key) ? tags.filter((t: string) => t !== tag.key) : [...tags, tag.key];
                            setContactForm({...contactForm, tags: newTags});
                          }}
                        >
                          <Text style={[styles.tagOptionText, contactForm.tags?.includes(tag.key) && { color: tag.color }]}>{tag.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Activation Next Step */}
                    <Text style={styles.inputLabel}>Activation Next Step</Text>
                    <TextInput style={styles.input} value={contactForm.activation_next_step} onChangeText={t => setContactForm({...contactForm, activation_next_step: t})} placeholder="e.g., Book coffee meeting, Send DM" placeholderTextColor={Colors.text.tertiary} />

                    {/* Last Contact & Set Meeting */}
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Last Contact</Text>
                        <TextInput style={styles.input} value={contactForm.last_contact_date} onChangeText={t => setContactForm({...contactForm, last_contact_date: t})} placeholder="MM/DD/YY" placeholderTextColor={Colors.text.tertiary} />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Set Meeting?</Text>
                        <TouchableOpacity style={[styles.toggleBtnLarge, contactForm.set_meeting && styles.toggleBtnLargeActive]} onPress={() => setContactForm({...contactForm, set_meeting: !contactForm.set_meeting})}>
                          <Ionicons name={contactForm.set_meeting ? "checkmark-circle" : "ellipse-outline"} size={20} color={contactForm.set_meeting ? Colors.status.success : Colors.text.tertiary} />
                          <Text style={[styles.toggleBtnLargeText, contactForm.set_meeting && { color: Colors.status.success }]}>{contactForm.set_meeting ? 'Yes' : 'No'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Preferred Platform */}
                    <Text style={styles.inputLabel}>Preferred Platform</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.optionRow}>
                        {PLATFORM_OPTIONS.map(p => (
                          <TouchableOpacity
                            key={p.key}
                            style={[styles.optionBtn, contactForm.preferred_platform === p.key && styles.optionBtnActive]}
                            onPress={() => setContactForm({...contactForm, preferred_platform: p.key})}
                          >
                            <Text style={[styles.optionText, contactForm.preferred_platform === p.key && styles.optionTextActive]}>{p.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Location */}
                    <Text style={styles.inputLabel}>Location</Text>
                    <TextInput style={styles.input} value={contactForm.location} onChangeText={t => setContactForm({...contactForm, location: t})} placeholder="City, State" placeholderTextColor={Colors.text.tertiary} />

                    {/* Power Leverage */}
                    <Text style={styles.inputLabel}>Power Leverage</Text>
                    <TextInput style={[styles.input, { minHeight: 60 }]} value={contactForm.power_leverage} onChangeText={t => setContactForm({...contactForm, power_leverage: t})} placeholder="e.g., 1M+ reach, speaker credibility, strong network" placeholderTextColor={Colors.text.tertiary} multiline />
                  </>
                )}

                {/* Contact Info - Always show */}
                <Text style={styles.sectionTitle}>Contact Info</Text>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput style={styles.input} value={contactForm.email} onChangeText={t => setContactForm({...contactForm, email: t})} placeholder="email@example.com" placeholderTextColor={Colors.text.tertiary} keyboardType="email-address" autoCapitalize="none" />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput style={styles.input} value={contactForm.phone} onChangeText={t => setContactForm({...contactForm, phone: t})} placeholder="+1 (555) 000-0000" placeholderTextColor={Colors.text.tertiary} keyboardType="phone-pad" />
                  </View>
                </View>

                {/* Social Links - Show more for wormhole */}
                {(contactForm.label === 'wormhole' || showAllFields) && (
                  <>
                    <Text style={styles.sectionTitle}>Social Media</Text>
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>LinkedIn</Text>
                        <TextInput style={styles.input} value={contactForm.linkedin} onChangeText={t => setContactForm({...contactForm, linkedin: t})} placeholder="linkedin.com/in/..." placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Instagram</Text>
                        <TextInput style={styles.input} value={contactForm.instagram} onChangeText={t => setContactForm({...contactForm, instagram: t})} placeholder="@handle" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                    </View>
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Twitter</Text>
                        <TextInput style={styles.input} value={contactForm.twitter} onChangeText={t => setContactForm({...contactForm, twitter: t})} placeholder="@handle" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Website</Text>
                        <TextInput style={styles.input} value={contactForm.website} onChangeText={t => setContactForm({...contactForm, website: t})} placeholder="example.com" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                    </View>
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>YouTube</Text>
                        <TextInput style={styles.input} value={contactForm.youtube} onChangeText={t => setContactForm({...contactForm, youtube: t})} placeholder="youtube.com/..." placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>TikTok</Text>
                        <TextInput style={styles.input} value={contactForm.tiktok} onChangeText={t => setContactForm({...contactForm, tiktok: t})} placeholder="@handle" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                    </View>

                    {/* Engagement Types */}
                    <Text style={styles.sectionTitle}>Engagement Types</Text>
                    <View style={styles.engagementTypesWrap}>
                      {ENGAGEMENT_TYPES.map(eng => (
                        <TouchableOpacity
                          key={eng.key}
                          style={[styles.engagementTypeBtn, contactForm.engagement_types?.includes(eng.key) && { backgroundColor: eng.color }]}
                          onPress={() => {
                            const types = contactForm.engagement_types || [];
                            const newTypes = types.includes(eng.key) ? types.filter((t: string) => t !== eng.key) : [...types, eng.key];
                            setContactForm({...contactForm, engagement_types: newTypes});
                          }}
                        >
                          <Text style={[styles.engagementTypeBtnText, contactForm.engagement_types?.includes(eng.key) && { color: '#fff' }]}>{eng.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Reciprocity Notes */}
                    <Text style={styles.inputLabel}>Reciprocity Notes</Text>
                    <TextInput style={[styles.input, { minHeight: 60 }]} value={contactForm.reciprocity_notes} onChangeText={t => setContactForm({...contactForm, reciprocity_notes: t})} placeholder="What value exchange exists?" placeholderTextColor={Colors.text.tertiary} multiline />
                  </>
                )}

                {/* Toggle to show all fields */}
                {contactForm.label !== 'wormhole' && (
                  <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllFields(!showAllFields)}>
                    <Ionicons name={showAllFields ? "chevron-up" : "chevron-down"} size={18} color={Colors.brand.accent} />
                    <Text style={styles.showMoreBtnText}>{showAllFields ? 'Show Less' : 'Show Advanced Fields'}</Text>
                  </TouchableOpacity>
                )}

                {/* Notes */}
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput style={[styles.input, { minHeight: 80 }]} value={contactForm.notes} onChangeText={t => setContactForm({...contactForm, notes: t})} placeholder="Notes..." placeholderTextColor={Colors.text.tertiary} multiline />

                <TouchableOpacity style={[styles.saveBtn, (!contactForm.name?.trim() || contactFormLoading) && styles.saveBtnDisabled]} onPress={() => saveContact(!showContactDetail)} disabled={!contactForm.name?.trim() || contactFormLoading}>
                  {contactFormLoading ? <ActivityIndicator color={Colors.text.primary} /> : <Text style={styles.saveBtnText}>{showContactDetail ? 'Save Changes' : 'Add Contact'}</Text>}
                </TouchableOpacity>

                {showContactDetail && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteContact(showContactDetail.id)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.status.error} />
                    <Text style={styles.deleteBtnText}>Delete Contact</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Wormhole Detail Modal */}
      <Modal visible={!!showWormholeDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fullModal}>
            <View style={styles.wormholeModal}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{showWormholeDetail?.name}</Text>
                  <Text style={styles.wormholeSubtitle}>{showWormholeDetail?.company} • {showWormholeDetail?.title}</Text>
                </View>
                <TouchableOpacity onPress={() => { setShowWormholeDetail(null); setContactForm({}); }}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* Wormhole Tabs */}
              <View style={styles.wormholeTabs}>
                <TouchableOpacity 
                  style={[styles.wormholeTab, !showAddLog && styles.wormholeTabActive]}
                  onPress={() => setShowAddLog(false)}
                >
                  <Text style={[styles.wormholeTabText, !showAddLog && styles.wormholeTabTextActive]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.wormholeTab, showAddLog && styles.wormholeTabActive]}
                  onPress={() => setShowAddLog(true)}
                >
                  <Text style={[styles.wormholeTabText, showAddLog && styles.wormholeTabTextActive]}>Logs ({wormholeLogs.length})</Text>
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {!showAddLog ? (
                  /* Profile Tab */
                  <>
                    {/* Connection Level */}
                    <Text style={styles.inputLabel}>Connection Level</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.optionRow}>
                        {CONNECTION_LEVELS.map(level => (
                          <TouchableOpacity
                            key={level.key}
                            style={[styles.connectionBtn, contactForm.connection_level === level.key && { backgroundColor: level.color }]}
                            onPress={() => setContactForm({...contactForm, connection_level: level.key})}
                          >
                            <Text style={[styles.connectionBtnText, contactForm.connection_level === level.key && { color: '#fff' }]}>{level.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Tags */}
                    <Text style={styles.inputLabel}>Tags</Text>
                    <View style={styles.tagsWrap}>
                      {CONTACT_TAGS.map(tag => (
                        <TouchableOpacity
                          key={tag.key}
                          style={[styles.tagOption, contactForm.tags?.includes(tag.key) && { backgroundColor: tag.color + '30', borderColor: tag.color }]}
                          onPress={() => {
                            const tags = contactForm.tags || [];
                            const newTags = tags.includes(tag.key) ? tags.filter((t: string) => t !== tag.key) : [...tags, tag.key];
                            setContactForm({...contactForm, tags: newTags});
                          }}
                        >
                          <Text style={[styles.tagOptionText, contactForm.tags?.includes(tag.key) && { color: tag.color }]}>
                            {tag.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Activation Next Step */}
                    <Text style={styles.inputLabel}>Activation Next Step</Text>
                    <TextInput style={styles.input} value={contactForm.activation_next_step} onChangeText={t => setContactForm({...contactForm, activation_next_step: t})} placeholder="e.g., Schedule coffee chat" placeholderTextColor={Colors.text.tertiary} />

                    {/* Platform */}
                    <Text style={styles.inputLabel}>Preferred Platform</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.optionRow}>
                        {PLATFORM_OPTIONS.map(p => (
                          <TouchableOpacity
                            key={p.key}
                            style={[styles.optionBtn, contactForm.preferred_platform === p.key && styles.optionBtnActive]}
                            onPress={() => setContactForm({...contactForm, preferred_platform: p.key})}
                          >
                            <Text style={[styles.optionText, contactForm.preferred_platform === p.key && styles.optionTextActive]}>{p.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Power Leverage */}
                    <Text style={styles.inputLabel}>Power Leverage</Text>
                    <TextInput style={[styles.input, { minHeight: 60 }]} value={contactForm.power_leverage} onChangeText={t => setContactForm({...contactForm, power_leverage: t})} placeholder="e.g., 1M+ reach, speaker credibility" placeholderTextColor={Colors.text.tertiary} multiline />

                    {/* Contact Info */}
                    <Text style={styles.sectionTitle}>Contact Info</Text>
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput style={styles.input} value={contactForm.email} onChangeText={t => setContactForm({...contactForm, email: t})} placeholder="email@example.com" placeholderTextColor={Colors.text.tertiary} keyboardType="email-address" autoCapitalize="none" />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Phone</Text>
                        <TextInput style={styles.input} value={contactForm.phone} onChangeText={t => setContactForm({...contactForm, phone: t})} placeholder="+1 555-0000" placeholderTextColor={Colors.text.tertiary} keyboardType="phone-pad" />
                      </View>
                    </View>

                    {/* Social Links */}
                    <Text style={styles.sectionTitle}>Social Media</Text>
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>LinkedIn</Text>
                        <TextInput style={styles.input} value={contactForm.linkedin} onChangeText={t => setContactForm({...contactForm, linkedin: t})} placeholder="linkedin.com/in/..." placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Instagram</Text>
                        <TextInput style={styles.input} value={contactForm.instagram} onChangeText={t => setContactForm({...contactForm, instagram: t})} placeholder="@handle" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                    </View>
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Twitter</Text>
                        <TextInput style={styles.input} value={contactForm.twitter} onChangeText={t => setContactForm({...contactForm, twitter: t})} placeholder="@handle" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.inputLabel}>Website</Text>
                        <TextInput style={styles.input} value={contactForm.website} onChangeText={t => setContactForm({...contactForm, website: t})} placeholder="example.com" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                      </View>
                    </View>

                    {/* Engagement */}
                    <Text style={styles.sectionTitle}>Engagement</Text>
                    <View style={styles.toggleRow}>
                      <TouchableOpacity style={styles.toggleItem} onPress={() => setContactForm({...contactForm, tagging_in_posts: !contactForm.tagging_in_posts})}>
                        <View style={[styles.toggleBox, contactForm.tagging_in_posts && styles.toggleBoxActive]}>
                          {contactForm.tagging_in_posts && <Ionicons name="checkmark" size={14} color={Colors.text.primary} />}
                        </View>
                        <Text style={styles.toggleLabel}>Tag in Posts</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.toggleItem} onPress={() => setContactForm({...contactForm, tagging_in_comments: !contactForm.tagging_in_comments})}>
                        <View style={[styles.toggleBox, contactForm.tagging_in_comments && styles.toggleBoxActive]}>
                          {contactForm.tagging_in_comments && <Ionicons name="checkmark" size={14} color={Colors.text.primary} />}
                        </View>
                        <Text style={styles.toggleLabel}>Tag in Comments</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.toggleItem} onPress={() => setContactForm({...contactForm, set_meeting: !contactForm.set_meeting})}>
                        <View style={[styles.toggleBox, contactForm.set_meeting && styles.toggleBoxActive]}>
                          {contactForm.set_meeting && <Ionicons name="checkmark" size={14} color={Colors.text.primary} />}
                        </View>
                        <Text style={styles.toggleLabel}>Set Meeting</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Reciprocity Notes */}
                    <Text style={styles.inputLabel}>Reciprocity Notes</Text>
                    <TextInput style={[styles.input, { minHeight: 60 }]} value={contactForm.reciprocity_notes} onChangeText={t => setContactForm({...contactForm, reciprocity_notes: t})} placeholder="What value exchange exists?" placeholderTextColor={Colors.text.tertiary} multiline />

                    {/* Notes */}
                    <Text style={styles.inputLabel}>Notes</Text>
                    <TextInput style={[styles.input, { minHeight: 80 }]} value={contactForm.notes} onChangeText={t => setContactForm({...contactForm, notes: t})} placeholder="General notes..." placeholderTextColor={Colors.text.tertiary} multiline />

                    <TouchableOpacity style={styles.saveBtn} onPress={() => saveContact(false)} disabled={contactFormLoading}>
                      {contactFormLoading ? <ActivityIndicator color={Colors.text.primary} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteContact(showWormholeDetail.id)}>
                      <Ionicons name="trash-outline" size={18} color={Colors.status.error} />
                      <Text style={styles.deleteBtnText}>Delete Contact</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* Logs Tab */
                  <>
                    {/* Quick Log Form */}
                    <View style={styles.quickLogCard}>
                      <Text style={styles.quickLogTitle}>Log an Action</Text>
                      <View style={styles.logActionTypes}>
                        {LOG_ACTION_TYPES.map(action => (
                          <TouchableOpacity
                            key={action.key}
                            style={[styles.logTypeBtn, logForm.action_type === action.key && styles.logTypeBtnActive]}
                            onPress={() => setLogForm({...logForm, action_type: action.key})}
                          >
                            <Ionicons name={action.icon as any} size={16} color={logForm.action_type === action.key ? Colors.text.primary : Colors.text.tertiary} />
                            <Text style={[styles.logTypeBtnText, logForm.action_type === action.key && styles.logTypeBtnTextActive]}>{action.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        style={[styles.input, { marginTop: 12 }]}
                        value={logForm.notes}
                        onChangeText={t => setLogForm({...logForm, notes: t})}
                        placeholder="What happened?"
                        placeholderTextColor={Colors.text.tertiary}
                        multiline
                      />
                      <TouchableOpacity style={[styles.addLogBtn, !logForm.notes?.trim() && styles.saveBtnDisabled]} onPress={addWormholeLog} disabled={!logForm.notes?.trim()}>
                        <Ionicons name="add" size={18} color={Colors.text.primary} />
                        <Text style={styles.addLogBtnText}>Add Log</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Logs Timeline */}
                    <Text style={styles.sectionTitle}>Activity Timeline</Text>
                    {wormholeLogs.length === 0 ? (
                      <View style={styles.emptyLogs}>
                        <Ionicons name="document-text-outline" size={40} color={Colors.text.tertiary} />
                        <Text style={styles.emptyLogsText}>No logs yet</Text>
                      </View>
                    ) : (
                      wormholeLogs.map((log, index) => (
                        <View key={log.id || index} style={styles.logItem}>
                          <View style={styles.logIcon}>
                            <Ionicons 
                              name={(LOG_ACTION_TYPES.find(a => a.key === log.action_type)?.icon || 'ellipse') as any} 
                              size={16} 
                              color={Colors.brand.primary} 
                            />
                          </View>
                          <View style={styles.logContent}>
                            <Text style={styles.logType}>{LOG_ACTION_TYPES.find(a => a.key === log.action_type)?.label || log.action_type}</Text>
                            <Text style={styles.logNotes}>{log.notes}</Text>
                            <Text style={styles.logDate}>{log.date}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Add/Edit Signal Modal */}
      <Modal visible={showAddSignal || !!showEditSignal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{showEditSignal ? 'Edit Signal' : 'New Signal'}</Text>
                <TouchableOpacity onPress={() => { setShowAddSignal(false); setShowEditSignal(null); }}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Signal Name *</Text>
                <TextInput
                  testID="signal-name-input"
                  style={styles.input}
                  value={signalForm.name}
                  onChangeText={t => setSignalForm({ ...signalForm, name: t })}
                  placeholder="e.g., Follow up with John"
                  placeholderTextColor={Colors.text.tertiary}
                />

                <Text style={styles.inputLabel}>Signal Type</Text>
                <View style={styles.optionRow}>
                  {SIGNAL_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.optionBtn,
                        signalForm.signal_type === type.key && { backgroundColor: type.color + '30', borderColor: type.color }
                      ]}
                      onPress={() => setSignalForm({ ...signalForm, signal_type: type.key })}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: type.color }} />
                      <Text style={[styles.optionText, signalForm.signal_type === type.key && { color: type.color }]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Due Date</Text>
                <TouchableOpacity
                  testID="crm-signal-due-date-btn"
                  style={styles.datePickerBtn}
                  onPress={() => {
                    if (!signalForm.due_date) setSignalForm({...signalForm, due_date: getSmartDefaultDate()});
                    setShowSignalCalendar(true);
                  }}
                >
                  <Ionicons name="calendar" size={18} color={Colors.brand.accent} />
                  <Text style={styles.datePickerText}>
                    {signalForm.due_date 
                      ? new Date(signalForm.due_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      : 'Select date (defaults smart)'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.text.tertiary} />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Impact Rating (1-10)</Text>
                <View style={styles.optionRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.ratingBtn,
                        signalForm.impact_rating === n && styles.ratingBtnActive
                      ]}
                      onPress={() => setSignalForm({ ...signalForm, impact_rating: n })}
                    >
                      <Text style={[styles.ratingText, signalForm.impact_rating === n && styles.ratingTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Assign to Deal (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.contactChip, !signalForm.deal_id && styles.contactChipActive]}
                      onPress={() => setSignalForm({ ...signalForm, deal_id: '' })}
                    >
                      <Text style={[styles.contactChipText, !signalForm.deal_id && styles.contactChipTextActive]}>None</Text>
                    </TouchableOpacity>
                    {deals.map(d => (
                      <TouchableOpacity
                        key={d.id}
                        style={[styles.contactChip, signalForm.deal_id === d.id && styles.contactChipActive]}
                        onPress={() => setSignalForm({ ...signalForm, deal_id: d.id })}
                      >
                        <Text style={[styles.contactChipText, signalForm.deal_id === d.id && styles.contactChipTextActive]}>{d.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  testID="signal-notes-input"
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={signalForm.notes}
                  onChangeText={t => setSignalForm({ ...signalForm, notes: t })}
                  placeholder="Additional details..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />

                <TouchableOpacity
                  testID="save-signal-btn"
                  style={[styles.saveBtn, (!signalForm.name?.trim() || signalFormLoading) && styles.saveBtnDisabled]}
                  onPress={() => saveSignal(!showEditSignal)}
                  disabled={!signalForm.name?.trim() || signalFormLoading}
                >
                  <Text style={styles.saveBtnText}>{signalFormLoading ? 'Saving...' : (showEditSignal ? 'Update Signal' : 'Create Signal')}</Text>
                </TouchableOpacity>

                {showEditSignal && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteSignal(showEditSignal.id)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.status.error} />
                    <Text style={styles.deleteBtnText}>Delete Signal</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Calendar Picker for Signal Date - inline overlay */}
      {showSignalCalendar && (
        <View style={styles.calendarOverlayFull}>
          <CalendarContent
            onClose={() => setShowSignalCalendar(false)}
            onSelect={(date) => setSignalForm({...signalForm, due_date: date})}
            selectedDate={signalForm.due_date || getSmartDefaultDate()}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, marginBottom: 12 },
  pageTitle: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center' },

  // Tab Bar
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tab: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.bg.card,
  },
  tabActive: { backgroundColor: Colors.brand.primary + '20', borderWidth: 1, borderColor: Colors.brand.primary },
  tabText: { color: Colors.text.tertiary, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.brand.primary },

  // Summary
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border.default },
  summaryValue: { color: Colors.text.primary, fontSize: FontSize.xl, fontWeight: '800' },
  summaryLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: 2 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg.input, borderRadius: Radius.md, marginHorizontal: 20, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border.default, gap: 8 },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: FontSize.base, paddingVertical: 12 },

  // Filter
  filterScroll: { maxHeight: 50, marginBottom: 12 },
  filterRow: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default },
  filterChipActive: { backgroundColor: Colors.brand.primary + '20', borderColor: Colors.brand.primary },
  filterText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  filterTextActive: { color: Colors.brand.primary, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Card
  card: { backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border.default },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '700', flex: 1 },
  cardValue: { color: Colors.status.success, fontSize: FontSize.lg, fontWeight: '800' },
  cardSubtitle: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  cardContact: { color: Colors.brand.accent, fontSize: FontSize.sm, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  badgeText: { fontSize: FontSize.sm, fontWeight: '600' },
  closeDateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  closeDateText: { color: Colors.text.tertiary, fontSize: FontSize.xs },

  // Contact Row
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  contactInfo: { flex: 1 },
  labelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start' },
  labelText: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  contactMeta: { alignItems: 'center' },
  score: { color: Colors.brand.primary, fontSize: FontSize.lg, fontWeight: '700' },
  scoreLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: Colors.text.secondary, fontSize: FontSize.lg, fontWeight: '600' },
  emptySub: { color: Colors.text.tertiary, fontSize: FontSize.sm },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalWrap: { maxHeight: '90%' },
  modal: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, maxHeight: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  inputLabel: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default },
  
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default },
  optionText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  
  contactChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default },
  contactChipActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  contactChipText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  contactChipTextActive: { color: Colors.text.primary },

  notificationToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  toggleBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.border.default, justifyContent: 'center', alignItems: 'center' },
  toggleBoxActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  toggleLabel: { color: Colors.text.secondary, fontSize: FontSize.base },

  saveBtn: { backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.status.error },
  deleteBtnText: { color: Colors.status.error, fontSize: FontSize.base },

  // New Contact Card Styles
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  connectionPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  connectionPillText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tagChip: { backgroundColor: Colors.bg.input, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagChipText: { color: Colors.text.tertiary, fontSize: 10 },
  moreTagsText: { color: Colors.text.tertiary, fontSize: 10, marginLeft: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  lastContactText: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  nextStepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border.default },
  nextStepText: { color: Colors.brand.accent, fontSize: FontSize.sm, flex: 1 },

  // Wormhole Modal
  fullModal: { flex: 1 },
  wormholeModal: { flex: 1, backgroundColor: Colors.bg.default, paddingTop: 50, paddingHorizontal: 20 },
  wormholeSubtitle: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  wormholeTabs: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  wormholeTab: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.bg.card, alignItems: 'center' },
  wormholeTabActive: { backgroundColor: Colors.brand.primary + '20', borderWidth: 1, borderColor: Colors.brand.primary },
  wormholeTabText: { color: Colors.text.tertiary, fontSize: FontSize.sm, fontWeight: '600' },
  wormholeTabTextActive: { color: Colors.brand.primary },

  // Connection Level Buttons
  connectionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default, marginRight: 8 },
  connectionBtnText: { color: Colors.text.secondary, fontSize: FontSize.sm },

  // Tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default },
  tagOptionActive: { backgroundColor: Colors.brand.primary + '30', borderColor: Colors.brand.primary },
  tagOptionText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  tagOptionTextActive: { color: Colors.brand.primary },

  // Option Button Active State
  optionBtnActive: { backgroundColor: Colors.brand.primary + '30', borderColor: Colors.brand.primary },
  optionTextActive: { color: Colors.brand.primary },

  // Section Title
  sectionTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700', marginTop: 20, marginBottom: 8 },

  // Field Rows
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },

  // Toggle Row
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Quick Log
  quickLogCard: { backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border.default, marginBottom: 20 },
  quickLogTitle: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '700', marginBottom: 12 },
  logActionTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  logTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default },
  logTypeBtnActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  logTypeBtnText: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  logTypeBtnTextActive: { color: Colors.text.primary },
  addLogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 12, marginTop: 12 },
  addLogBtnText: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },

  // Logs Timeline
  emptyLogs: { alignItems: 'center', paddingVertical: 40 },
  emptyLogsText: { color: Colors.text.tertiary, fontSize: FontSize.base, marginTop: 8 },
  logItem: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  logIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.brand.primary + '20', justifyContent: 'center', alignItems: 'center' },
  logContent: { flex: 1 },
  logType: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  logNotes: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  logDate: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: 4 },
  
  // Signals List
  signalHeader: { paddingVertical: 16 },
  signalCount: { color: Colors.text.secondary, fontSize: FontSize.sm },
  signalCard: { backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border.default },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signalImpact: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.brand.primary + '20', justifyContent: 'center', alignItems: 'center' },
  signalImpactCompleted: { backgroundColor: Colors.status.success + '20' },
  signalImpactText: { color: Colors.brand.primary, fontSize: FontSize.lg, fontWeight: '700' },
  signalInfo: { flex: 1 },
  signalName: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  signalNameCompleted: { textDecorationLine: 'line-through', color: Colors.text.tertiary },
  signalDue: { color: Colors.text.tertiary, fontSize: FontSize.sm, marginTop: 2 },
  signalTop10x: { color: Colors.status.warning, fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  signalCompletedBadge: { padding: 4 },
  
  // Rating buttons
  ratingBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg.input,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border.default,
  },
  ratingBtnActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  ratingText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600' },
  ratingTextActive: { color: Colors.text.primary },
  
  // New styles for dynamic contact form
  toggleBtnLarge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  toggleBtnLargeActive: { backgroundColor: Colors.status.success + '20', borderColor: Colors.status.success },
  toggleBtnLargeText: { color: Colors.text.secondary, fontSize: FontSize.base },
  
  engagementTypesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  engagementTypeBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default,
  },
  engagementTypeBtnText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600' },
  
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, marginTop: 16,
  },
  showMoreBtnText: { color: Colors.brand.accent, fontSize: FontSize.sm, fontWeight: '600' },
  // Date Picker
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bg.input, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border.default,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 4, marginBottom: 4,
  },
  datePickerText: {
    flex: 1, color: Colors.text.primary, fontSize: FontSize.base,
  },
  calendarOverlayFull: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
    padding: 16, zIndex: 100,
  },
});
