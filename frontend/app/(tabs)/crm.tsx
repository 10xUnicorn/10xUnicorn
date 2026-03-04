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

type CRMTab = 'deals' | 'contacts';

const STAGES = [
  { key: 'lead', label: 'Lead', color: Colors.text.tertiary },
  { key: 'qualified', label: 'Qualified', color: Colors.brand.accent },
  { key: 'proposal', label: 'Proposal', color: Colors.status.warning },
  { key: 'negotiation', label: 'Negotiation', color: Colors.brand.primary },
  { key: 'closed_won', label: 'Won', color: Colors.status.success },
  { key: 'closed_lost', label: 'Lost', color: Colors.status.error },
];

const CONTACT_LABELS = [
  { key: 'prospect', label: 'Prospect', color: Colors.brand.accent },
  { key: 'referral_partner', label: 'Referral Partner', color: Colors.status.warning },
  { key: 'strategic_partner', label: 'Strategic Partner', color: Colors.brand.primary },
  { key: 'client', label: 'Client', color: Colors.status.success },
  { key: 'wormhole', label: 'Wormhole', color: Colors.brand.secondary },
  { key: 'resource', label: 'Resource', color: Colors.text.tertiary },
];

const NEEDS = [
  'capital', 'marketing', 'social_media', 'community_management', 'operations',
  'tech_development', 'podcast_booking', 'speaking', 'sponsorships', 'events',
  'communities', 'financial_services', 'coaching', 'design', 'sales', 'legal', 'hr'
];

export default function CRMScreen() {
  const [activeTab, setActiveTab] = useState<CRMTab>('deals');
  const [deals, setDeals] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
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

  const resetDealForm = () => {
    setDealForm({
      name: '', contact_id: '', company: '', value: '',
      stage: 'lead', close_date: '', notes: '', needs: [],
      notifications_enabled: true
    });
  };

  const resetContactForm = () => {
    setContactForm({
      name: '', company: '', title: '', email: '', phone: '',
      label: 'prospect', notes: '', connection_level: 'warm'
    });
  };

  const loadData = useCallback(async () => {
    try {
      const [dealsData, contactsData] = await Promise.all([
        api.get('/deals'),
        api.get('/wormhole-contacts'),
      ]);
      setDeals(dealsData);
      setContacts(contactsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

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
      if (isNew) {
        await api.post('/wormhole-contacts', contactForm);
        setShowAddContact(false);
      } else {
        await api.put(`/wormhole-contacts/${showContactDetail.id}`, contactForm);
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

  const formatValue = (value: number) => {
    if (!value) return '';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
      if (dateStr.includes('/')) {
        // MM/DD/YY format
        return dateStr;
      }
      // YYYY-MM-DD to MM/DD/YY
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear().toString().slice(-2)}`;
    } catch {
      return dateStr;
    }
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
            if (activeTab === 'deals') {
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
          testID="crm-tab-deals"
          style={[styles.tab, activeTab === 'deals' && styles.tabActive]}
          onPress={() => setActiveTab('deals')}
        >
          <Ionicons name="briefcase" size={18} color={activeTab === 'deals' ? Colors.brand.primary : Colors.text.tertiary} />
          <Text style={[styles.tabText, activeTab === 'deals' && styles.tabTextActive]}>Deals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="crm-tab-contacts"
          style={[styles.tab, activeTab === 'contacts' && styles.tabActive]}
          onPress={() => setActiveTab('contacts')}
        >
          <Ionicons name="people" size={18} color={activeTab === 'contacts' ? Colors.brand.primary : Colors.text.tertiary} />
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>Contacts</Text>
        </TouchableOpacity>
      </View>

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
              <TouchableOpacity testID={`contact-${item.id}`} style={styles.card} onPress={() => openEditContact(item)}>
                <View style={styles.contactRow}>
                  <View style={[styles.avatar, { backgroundColor: getLabelColor(item.label) }]}>
                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.company && <Text style={styles.cardSubtitle}>{item.company}{item.title ? ` • ${item.title}` : ''}</Text>}
                    <View style={[styles.labelBadge, { backgroundColor: getLabelColor(item.label) + '20' }]}>
                      <Text style={[styles.labelText, { color: getLabelColor(item.label) }]}>
                        {CONTACT_LABELS.find(l => l.key === item.label)?.label || item.label || 'Prospect'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.contactMeta}>
                    <Text style={styles.score}>{item.engagement_score || 0}</Text>
                    <Text style={styles.scoreLabel}>touches</Text>
                  </View>
                </View>
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

      {/* Add/Edit Contact Modal */}
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
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput style={styles.input} value={contactForm.name} onChangeText={t => setContactForm({...contactForm, name: t})} placeholder="Full name" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Label</Text>
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

                <Text style={styles.inputLabel}>Company</Text>
                <TextInput style={styles.input} value={contactForm.company} onChangeText={t => setContactForm({...contactForm, company: t})} placeholder="Company name" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Title</Text>
                <TextInput style={styles.input} value={contactForm.title} onChangeText={t => setContactForm({...contactForm, title: t})} placeholder="Job title" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Email</Text>
                <TextInput style={styles.input} value={contactForm.email} onChangeText={t => setContactForm({...contactForm, email: t})} placeholder="email@example.com" placeholderTextColor={Colors.text.tertiary} keyboardType="email-address" autoCapitalize="none" />

                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput style={styles.input} value={contactForm.phone} onChangeText={t => setContactForm({...contactForm, phone: t})} placeholder="+1 (555) 000-0000" placeholderTextColor={Colors.text.tertiary} keyboardType="phone-pad" />

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
});
