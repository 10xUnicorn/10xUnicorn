/**
 * Deals Tab — (tabs)/deals.tsx
 * Deal pipeline tracker with metrics, filtering, and CRUD operations
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { Colors, Spacing, BorderRadius, Typography } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { deals as dealsDb, contacts as contactsDb } from '../../src/utils/database';
import { Deal, DealStage, Contact } from '../../src/types/database';

const DEAL_STAGES: DealStage[] = ['lead', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
const STAGE_COLORS: Record<DealStage, string> = {
  lead: Colors.status.warning,
  proposal: Colors.brand.primary,
  negotiation: Colors.brand.primaryDark || Colors.brand.primary,
  closed_won: Colors.status.success,
  closed_lost: Colors.status.error,
};

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeStageFilter, setActiveStageFilter] = useState<DealStage | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formStage, setFormStage] = useState<DealStage>('lead');
  const [formContactId, setFormContactId] = useState<string | null>(null);
  const [formExpectedClose, setFormExpectedClose] = useState(new Date());
  const [formDetails, setFormDetails] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const contactSearchRef = useRef<FlatList>(null);

  // Load deals and contacts
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [dealsResult, contactsResult] = await Promise.all([
        dealsDb.list(user.id),
        contactsDb.list(user.id),
      ]);
      setDeals(dealsResult?.data || []);
      setContacts(contactsResult?.data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Filter deals by stage
  const filteredDeals = useMemo(() => {
    let result = deals;
    if (activeStageFilter) {
      result = result.filter((d) => d.stage === activeStageFilter);
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [deals, activeStageFilter]);

  // Calculate pipeline metrics
  const metrics = useMemo(() => {
    const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const wonValue = deals
      .filter((d) => d.stage === 'closed_won')
      .reduce((sum, d) => sum + (d.value || 0), 0);
    const dealCount = deals.length;
    return { totalValue, wonValue, dealCount };
  }, [deals]);

  // Filtered contacts for picker
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        (c.full_name || '').toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormValue('');
    setFormStage('lead');
    setFormContactId(null);
    setFormExpectedClose(new Date());
    setFormDetails('');
    setSearchQuery('');
  }, []);

  const handleCreateDeal = useCallback(async () => {
    if (!user?.id || !formTitle.trim()) {
      Alert.alert('Error', 'Please enter a deal title');
      return;
    }

    try {
      const newDeal: Deal = {
        id: `deal_${Date.now()}`,
        user_id: user.id,
        title: formTitle,
        value: parseInt(formValue) || 0,
        stage: formStage,
        contact_id: formContactId,
        expected_close_date: formExpectedClose.toISOString(),
        details: formDetails,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await dealsDb.create(newDeal);
      setDeals((prev) => [newDeal, ...prev]);
      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create deal');
      console.error('Error creating deal:', error);
    }
  }, [user?.id, formTitle, formValue, formStage, formContactId, formExpectedClose, formDetails, resetForm]);

  const handleDeleteDeal = useCallback(async () => {
    if (!selectedDealId || !user?.id) return;

    try {
      await dealsDb.delete(selectedDealId);
      setDeals((prev) => prev.filter((d) => d.id !== selectedDealId));
      setShowDeleteConfirm(false);
      setSelectedDealId(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete deal');
      console.error('Error deleting deal:', error);
    }
  }, [selectedDealId, user?.id]);

  const handleDateChange = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        setFormExpectedClose(date);
        setShowDatePicker(false);
      }
    } catch (err) {
      console.error('Invalid date:', err);
    }
  };

  const getContactName = useCallback(
    (contactId: string | null) => {
      if (!contactId) return 'Select contact';
      return contacts.find((c) => c.id === contactId)?.full_name || 'Unknown';
    },
    [contacts]
  );

  const formatCurrency = (value: number) => {
    return `$${(value / 1000).toFixed(0)}k`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Render pipeline metrics
  const renderMetrics = () => (
    <View style={styles.metricsContainer}>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Total Value</Text>
        <Text style={styles.metricValue}>{formatCurrency(metrics.totalValue)}</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Won Value</Text>
        <Text style={[styles.metricValue, { color: Colors.status.success }]}>
          {formatCurrency(metrics.wonValue)}
        </Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Deals</Text>
        <Text style={styles.metricValue}>{metrics.dealCount}</Text>
      </View>
    </View>
  );

  // Render stage filter chips
  const renderStageFilters = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            activeStageFilter === null && styles.filterChipActive,
          ]}
          onPress={() => setActiveStageFilter(null)}
        >
          <Text
            style={[
              styles.filterChipText,
              activeStageFilter === null && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {DEAL_STAGES.map((stage) => (
          <TouchableOpacity
            key={stage}
            style={[
              styles.filterChip,
              activeStageFilter === stage && styles.filterChipActive,
            ]}
            onPress={() => setActiveStageFilter(stage)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeStageFilter === stage && styles.filterChipTextActive,
              ]}
            >
              {stage.charAt(0).toUpperCase() + stage.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render deal card
  const renderDealCard = ({ item }: { item: Deal }) => (
    <TouchableOpacity
      style={styles.dealCard}
      onLongPress={() => {
        setSelectedDealId(item.id);
        setShowDeleteConfirm(true);
      }}
    >
      <View style={styles.dealHeader}>
        <Text style={styles.dealTitle}>{item.title}</Text>
        <View style={[styles.stageBadge, { backgroundColor: STAGE_COLORS[item.stage] }]}>
          <Text style={styles.stageBadgeText}>
            {item.stage.charAt(0).toUpperCase() + item.stage.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.dealMeta}>
        {item.contact_id && (
          <Text style={styles.dealMetaText}>
            {getContactName(item.contact_id)}
          </Text>
        )}
        {item.value > 0 && (
          <Text style={styles.dealMetaValue}>{formatCurrency(item.value)}</Text>
        )}
      </View>

      {item.expected_close && (
        <View style={styles.dealDate}>
          <Ionicons
            name="calendar"
            size={14}
            color={Colors.text.secondary}
          />
          <Text style={styles.dealDateText}>{formatDate(item.expected_close)}</Text>
        </View>
      )}

      {item.details && (
        <Text style={styles.dealDetails} numberOfLines={2}>
          {item.details}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deals</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Ionicons
            name="add"
            size={24}
            color={Colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Metrics */}
      {renderMetrics()}

      {/* Filters */}
      {renderStageFilters()}

      {/* Deals List */}
      <FlatList
        data={filteredDeals}
        keyExtractor={(item) => item.id}
        renderItem={renderDealCard}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="briefcase"
              size={48}
              color={Colors.text.secondary}
            />
            <Text style={styles.emptyText}>No deals yet</Text>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Text style={styles.modalHeaderClose}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalHeaderTitle}>New Deal</Text>
                <TouchableOpacity onPress={handleCreateDeal}>
                  <Text style={styles.modalHeaderSave}>Save</Text>
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.formLabel}>Deal Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter deal title"
                placeholderTextColor={Colors.text.secondary}
                value={formTitle}
                onChangeText={setFormTitle}
                returnKeyType="next"
              />

              {/* Value */}
              <Text style={styles.formLabel}>Deal Value</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter value (e.g., 50000)"
                placeholderTextColor={Colors.text.secondary}
                value={formValue}
                onChangeText={setFormValue}
                keyboardType="number-pad"
                returnKeyType="next"
              />

              {/* Stage */}
              <Text style={styles.formLabel}>Stage</Text>
              <View style={styles.stageSelector}>
                {DEAL_STAGES.map((stage) => (
                  <TouchableOpacity
                    key={stage}
                    style={[
                      styles.stageOption,
                      formStage === stage && styles.stageOptionActive,
                    ]}
                    onPress={() => setFormStage(stage)}
                  >
                    <Text
                      style={[
                        styles.stageOptionText,
                        formStage === stage && styles.stageOptionTextActive,
                      ]}
                    >
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Contact Picker */}
              <Text style={styles.formLabel}>Contact</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowContactPicker(true)}
              >
                <Text style={styles.pickerButtonText}>{getContactName(formContactId)}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={Colors.text.secondary}
                />
              </TouchableOpacity>

              {/* Expected Close Date */}
              <Text style={styles.formLabel}>Expected Close</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.pickerButtonText}>{formatDate(formExpectedClose.toISOString())}</Text>
                <Ionicons
                  name="calendar"
                  size={20}
                  color={Colors.text.secondary}
                />
              </TouchableOpacity>

              {/* Details */}
              <Text style={styles.formLabel}>Details</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                placeholder="Enter deal details"
                placeholderTextColor={Colors.text.secondary}
                value={formDetails}
                onChangeText={setFormDetails}
                multiline
                numberOfLines={4}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Contact Picker Modal */}
      <Modal visible={showContactPicker} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowContactPicker(false)}>
              <Ionicons
                name="close"
                size={24}
                color={Colors.text.primary}
              />
            </TouchableOpacity>
            <Text style={styles.pickerHeaderTitle}>Select Contact</Text>
            <View style={{ width: 24 }} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={Colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <FlatList
            ref={contactSearchRef}
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.contactOption}
                onPress={() => {
                  setFormContactId(item.id);
                  setShowContactPicker(false);
                }}
              >
                <View>
                  <Text style={styles.contactOptionName}>{item.full_name}</Text>
                  {item.company && (
                    <Text style={styles.contactOptionCompany}>{item.company}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No contacts found</Text>
            }
          />
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Text style={styles.modalHeaderClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.pickerHeaderTitle}>Select Date</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg }}>
            <TextInput
              style={styles.formInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.text.secondary}
              value={formExpectedClose.toISOString().split('T')[0]}
              onChangeText={handleDateChange}
            />
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>Delete Deal?</Text>
            <Text style={styles.confirmMessage}>
              This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={handleDeleteDeal}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text.primary,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
  },
  filterChipText: {
    ...Typography.body2,
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: Colors.background.primary,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  dealCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  dealTitle: {
    ...Typography.body1,
    color: Colors.text.primary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  stageBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  stageBadgeText: {
    ...Typography.caption,
    color: Colors.background.primary,
    fontWeight: 'bold',
  },
  dealMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dealMetaText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  dealMetaValue: {
    ...Typography.body2,
    color: Colors.accent,
    fontWeight: 'bold',
  },
  dealDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dealDateText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  dealDetails: {
    ...Typography.body2,
    color: Colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    ...Typography.body1,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  // Modal styles
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  modalHeaderTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  modalHeaderClose: {
    ...Typography.body1,
    color: Colors.text.secondary,
  },
  modalHeaderSave: {
    ...Typography.body1,
    color: Colors.accent,
    fontWeight: 'bold',
  },
  formLabel: {
    ...Typography.body2,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontWeight: 'bold',
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    ...Typography.body2,
    backgroundColor: Colors.background.primary,
  },
  formInputMultiline: {
    textAlignVertical: 'top',
  },
  stageSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  stageOption: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  stageOptionActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  stageOptionText: {
    ...Typography.body2,
    color: Colors.text.secondary,
  },
  stageOptionTextActive: {
    color: Colors.background.primary,
    fontWeight: 'bold',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
  },
  pickerButtonText: {
    ...Typography.body2,
    color: Colors.text.primary,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  pickerHeaderTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  searchInput: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    color: Colors.text.primary,
    ...Typography.body2,
    backgroundColor: Colors.background.primary,
  },
  contactOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  contactOptionName: {
    ...Typography.body1,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  contactOptionCompany: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  // Confirmation dialog styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDialog: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '80%',
  },
  confirmTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  confirmMessage: {
    ...Typography.body2,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
  },
  confirmCancelText: {
    ...Typography.body1,
    color: Colors.text.secondary,
  },
  confirmDelete: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.status.error,
    alignItems: 'center',
  },
  confirmDeleteText: {
    ...Typography.body1,
    color: Colors.background.primary,
    fontWeight: 'bold',
  },
});
