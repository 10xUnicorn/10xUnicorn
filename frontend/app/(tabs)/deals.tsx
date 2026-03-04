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

const STAGES = [
  { key: 'lead', label: 'Lead', color: Colors.text.tertiary },
  { key: 'qualified', label: 'Qualified', color: Colors.brand.accent },
  { key: 'proposal', label: 'Proposal', color: Colors.status.warning },
  { key: 'negotiation', label: 'Negotiation', color: Colors.brand.primary },
  { key: 'closed_won', label: 'Won', color: Colors.status.success },
  { key: 'closed_lost', label: 'Lost', color: Colors.status.error },
];

const NEEDS = [
  'capital', 'marketing', 'social_media', 'community_management', 'operations',
  'tech_development', 'podcast_booking', 'speaking', 'sponsorships', 'events',
  'communities', 'financial_services', 'coaching', 'design', 'sales', 'legal', 'hr'
];

const FINANCIAL_SERVICES = [
  'accounting', 'bookkeeping', 'tax_planning', 'financial_planning', 'wealth_management',
  'venture_capital', 'private_equity', 'angel_investment', 'debt_financing',
  'revenue_based_financing', 'fractional_cfo', 'ma_advisory', 'fundraising_strategy'
];

export default function DealsScreen() {
  const [deals, setDeals] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showMatches, setShowMatches] = useState<any[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [filterStage, setFilterStage] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<any>({});
  const [formLoading, setFormLoading] = useState(false);

  const resetForm = () => {
    setForm({
      name: '', contact_id: '', company: '', value: '',
      stage: 'lead', notes: '', needs: [], financial_services: [], other_needs: ''
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

  const saveDeal = async (isNew = true) => {
    if (!form.name?.trim()) return;
    setFormLoading(true);
    try {
      const payload = {
        ...form,
        value: form.value ? parseFloat(form.value) : null,
        contact_id: form.contact_id || null,
      };
      if (isNew) {
        await api.post('/deals', payload);
        setShowAdd(false);
      } else {
        await api.put(`/deals/${showDetail.id}`, payload);
        setShowDetail(null);
      }
      resetForm();
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const deleteDeal = async (id: string) => {
    Alert.alert('Delete Deal', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.delete(`/deals/${id}`);
        setShowDetail(null);
        loadData();
      }}
    ]);
  };

  const updateStage = async (dealId: string, stage: string) => {
    try {
      await api.put(`/deals/${dealId}`, { stage });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const findMatches = async (dealId: string) => {
    try {
      const matches = await api.get(`/matching/for-deal/${dealId}`);
      setShowMatches(matches);
      setShowMatchModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (deal: any) => {
    setForm({
      name: deal.name || '',
      contact_id: deal.contact_id || '',
      company: deal.company || '',
      value: deal.value?.toString() || '',
      stage: deal.stage || 'lead',
      notes: deal.notes || '',
      needs: deal.needs || [],
      financial_services: deal.financial_services || [],
      other_needs: deal.other_needs || '',
    });
    setShowDetail(deal);
  };

  const toggleNeed = (need: string) => {
    const current = form.needs || [];
    if (current.includes(need)) {
      setForm({ ...form, needs: current.filter((n: string) => n !== need) });
    } else {
      setForm({ ...form, needs: [...current, need] });
    }
  };

  const toggleFinancial = (service: string) => {
    const current = form.financial_services || [];
    if (current.includes(service)) {
      setForm({ ...form, financial_services: current.filter((s: string) => s !== service) });
    } else {
      setForm({ ...form, financial_services: [...current, service] });
    }
  };

  const getStageColor = (stage: string) => {
    return STAGES.find(s => s.key === stage)?.color || Colors.text.tertiary;
  };

  const formatValue = (value: number) => {
    if (!value) return '';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.primary} /></View>
      </SafeAreaView>
    );
  }

  const filteredDeals = filterStage ? deals.filter(d => d.stage === filterStage) : deals;
  const totalValue = deals.filter(d => d.stage !== 'closed_lost').reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = deals.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Deals</Text>
        <TouchableOpacity testID="add-deal-btn" style={styles.addBtn} onPress={() => { resetForm(); setShowAdd(true); }}>
          <Ionicons name="add" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Pipeline Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatValue(totalValue) || '$0'}</Text>
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
            <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
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
          <TouchableOpacity testID={`deal-${item.id}`} style={styles.dealCard} onPress={() => openEdit(item)}>
            <View style={styles.dealHeader}>
              <Text style={styles.dealName}>{item.name}</Text>
              {item.value && <Text style={styles.dealValue}>{formatValue(item.value)}</Text>}
            </View>
            {item.company && <Text style={styles.dealCompany}>{item.company}</Text>}
            {item.contact_name && <Text style={styles.dealContact}>👤 {item.contact_name}</Text>}
            <View style={styles.dealFooter}>
              <View style={[styles.stageBadge, { backgroundColor: getStageColor(item.stage) + '20' }]}>
                <View style={[styles.stageDot, { backgroundColor: getStageColor(item.stage) }]} />
                <Text style={[styles.stageText, { color: getStageColor(item.stage) }]}>
                  {STAGES.find(s => s.key === item.stage)?.label || item.stage}
                </Text>
              </View>
              {(item.needs?.length > 0 || item.financial_services?.length > 0) && (
                <TouchableOpacity style={styles.matchBtn} onPress={() => findMatches(item.id)}>
                  <Ionicons name="people" size={14} color={Colors.brand.accent} />
                  <Text style={styles.matchBtnText}>Find Help</Text>
                </TouchableOpacity>
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

      {/* Add/Edit Deal Modal */}
      <Modal visible={showAdd || !!showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{showDetail ? 'Edit Deal' : 'New Deal'}</Text>
                <TouchableOpacity onPress={() => { setShowAdd(false); setShowDetail(null); }}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Deal Name *</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({...form, name: t})} placeholder="e.g., Enterprise Contract" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Company</Text>
                <TextInput style={styles.input} value={form.company} onChangeText={t => setForm({...form, company: t})} placeholder="Company name" placeholderTextColor={Colors.text.tertiary} />

                <Text style={styles.inputLabel}>Value ($)</Text>
                <TextInput style={styles.input} value={form.value} onChangeText={t => setForm({...form, value: t})} placeholder="50000" placeholderTextColor={Colors.text.tertiary} keyboardType="numeric" />

                <Text style={styles.inputLabel}>Stage</Text>
                <View style={styles.stageRow}>
                  {STAGES.map(stage => (
                    <TouchableOpacity
                      key={stage.key}
                      style={[styles.stageBtn, form.stage === stage.key && { backgroundColor: stage.color + '30', borderColor: stage.color }]}
                      onPress={() => setForm({...form, stage: stage.key})}
                    >
                      <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                      <Text style={[styles.stageBtnText, form.stage === stage.key && { color: stage.color }]}>{stage.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Associated Contact</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.contactRow}>
                    <TouchableOpacity
                      style={[styles.contactChip, !form.contact_id && styles.contactChipActive]}
                      onPress={() => setForm({...form, contact_id: ''})}
                    >
                      <Text style={[styles.contactChipText, !form.contact_id && styles.contactChipTextActive]}>None</Text>
                    </TouchableOpacity>
                    {contacts.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.contactChip, form.contact_id === c.id && styles.contactChipActive]}
                        onPress={() => setForm({...form, contact_id: c.id})}
                      >
                        <Text style={[styles.contactChipText, form.contact_id === c.id && styles.contactChipTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput style={[styles.input, { minHeight: 80 }]} value={form.notes} onChangeText={t => setForm({...form, notes: t})} placeholder="Deal notes..." placeholderTextColor={Colors.text.tertiary} multiline />

                <Text style={styles.sectionLabel}>What Do You Need?</Text>
                <Text style={styles.sectionHint}>Select resources needed to close this deal</Text>
                <View style={styles.needsGrid}>
                  {NEEDS.map(need => {
                    const selected = (form.needs || []).includes(need);
                    return (
                      <TouchableOpacity key={need} style={[styles.needChip, selected && styles.needChipActive]} onPress={() => toggleNeed(need)}>
                        <Text style={[styles.needChipText, selected && styles.needChipTextActive]}>{need.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {(form.needs || []).includes('financial_services') && (
                  <>
                    <Text style={styles.sectionLabel}>Financial Services Needed</Text>
                    <View style={styles.needsGrid}>
                      {FINANCIAL_SERVICES.map(service => {
                        const selected = (form.financial_services || []).includes(service);
                        return (
                          <TouchableOpacity key={service} style={[styles.needChip, selected && styles.needChipActive]} onPress={() => toggleFinancial(service)}>
                            <Text style={[styles.needChipText, selected && styles.needChipTextActive]}>{service.replace('_', ' ')}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                <Text style={styles.inputLabel}>Other Needs</Text>
                <TextInput style={styles.input} value={form.other_needs} onChangeText={t => setForm({...form, other_needs: t})} placeholder="Custom needs (e.g., intro to CTO)" placeholderTextColor={Colors.text.tertiary} />

                <TouchableOpacity style={[styles.saveBtn, (!form.name?.trim() || formLoading) && styles.saveBtnDisabled]} onPress={() => saveDeal(!showDetail)} disabled={!form.name?.trim() || formLoading}>
                  {formLoading ? <ActivityIndicator color={Colors.text.primary} /> : <Text style={styles.saveBtnText}>{showDetail ? 'Save Changes' : 'Create Deal'}</Text>}
                </TouchableOpacity>

                {showDetail && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDeal(showDetail.id)}>
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

      {/* Service Matches Modal */}
      <Modal visible={showMatchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Service Matches</Text>
              <TouchableOpacity onPress={() => setShowMatchModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={showMatches}
              keyExtractor={(item, i) => `${item.user_id}-${i}`}
              renderItem={({ item }) => (
                <View style={styles.matchCard}>
                  <View style={styles.matchHeader}>
                    <Text style={styles.matchName}>{item.display_name}</Text>
                    <Text style={styles.matchScore}>{item.match_score} pts</Text>
                  </View>
                  {item.company_name && <Text style={styles.matchCompany}>{item.company_name}</Text>}
                  {item.matched_services?.length > 0 && (
                    <View style={styles.matchedServices}>
                      {item.matched_services.map((s: string, i: number) => (
                        <View key={i} style={styles.matchServiceBadge}>
                          <Text style={styles.matchServiceText}>{s.replace('_', ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {item.booking_link && (
                    <View style={styles.matchLink}>
                      <Ionicons name="calendar" size={14} color={Colors.brand.accent} />
                      <Text style={styles.matchLinkText}>{item.booking_link}</Text>
                    </View>
                  )}
                  {item.email && (
                    <View style={styles.matchLink}>
                      <Ionicons name="mail" size={14} color={Colors.brand.accent} />
                      <Text style={styles.matchLinkText}>{item.email}</Text>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyMatches}>
                  <Ionicons name="search-outline" size={40} color={Colors.text.tertiary} />
                  <Text style={styles.emptyMatchText}>No matches found</Text>
                  <Text style={styles.emptyMatchSub}>Members haven't added matching services yet</Text>
                </View>
              }
            />
          </View>
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

  // Summary
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border.default },
  summaryValue: { color: Colors.text.primary, fontSize: FontSize.xl, fontWeight: '800' },
  summaryLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: 2 },

  // Filter
  filterScroll: { maxHeight: 50, marginBottom: 12 },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default },
  filterChipActive: { backgroundColor: Colors.brand.primary + '20', borderColor: Colors.brand.primary },
  filterText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  filterTextActive: { color: Colors.brand.primary, fontWeight: '600' },
  stageDot: { width: 8, height: 8, borderRadius: 4 },

  // Deal Card
  dealCard: { backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border.default },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dealName: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700', flex: 1 },
  dealValue: { color: Colors.status.success, fontSize: FontSize.lg, fontWeight: '800' },
  dealCompany: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  dealContact: { color: Colors.brand.accent, fontSize: FontSize.sm, marginTop: 2 },
  dealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  stageBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  stageText: { fontSize: FontSize.sm, fontWeight: '600' },
  matchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchBtnText: { color: Colors.brand.accent, fontSize: FontSize.sm },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: Colors.text.secondary, fontSize: FontSize.lg, fontWeight: '600' },
  emptySub: { color: Colors.text.tertiary, fontSize: FontSize.sm },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalWrap: { maxHeight: '90%' },
  modal: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  inputLabel: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default },
  sectionLabel: { color: Colors.brand.primary, fontSize: FontSize.sm, fontWeight: '700', marginTop: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  sectionHint: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginBottom: 12 },

  // Stage Row
  stageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default },
  stageBtnText: { color: Colors.text.secondary, fontSize: FontSize.sm },

  // Contact Row
  contactRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  contactChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default },
  contactChipActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  contactChipText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  contactChipTextActive: { color: Colors.text.primary },

  // Needs Grid
  needsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  needChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default },
  needChipActive: { backgroundColor: Colors.brand.accent + '20', borderColor: Colors.brand.accent },
  needChipText: { color: Colors.text.secondary, fontSize: FontSize.sm, textTransform: 'capitalize' },
  needChipTextActive: { color: Colors.brand.accent },

  saveBtn: { backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.status.error },
  deleteBtnText: { color: Colors.status.error, fontSize: FontSize.base },

  // Match Card
  matchCard: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, marginBottom: 12 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchName: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  matchScore: { color: Colors.brand.primary, fontSize: FontSize.sm, fontWeight: '600' },
  matchCompany: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 2 },
  matchedServices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  matchServiceBadge: { backgroundColor: Colors.status.success + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  matchServiceText: { color: Colors.status.success, fontSize: FontSize.xs, textTransform: 'capitalize' },
  matchLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  matchLinkText: { color: Colors.brand.accent, fontSize: FontSize.sm },
  emptyMatches: { alignItems: 'center', padding: 40, gap: 8 },
  emptyMatchText: { color: Colors.text.secondary, fontSize: FontSize.base, fontWeight: '600' },
  emptyMatchSub: { color: Colors.text.tertiary, fontSize: FontSize.sm, textAlign: 'center' },
});
