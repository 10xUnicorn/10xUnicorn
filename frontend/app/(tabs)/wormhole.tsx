import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, FlatList, Modal,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';

export default function WormholeScreen() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [search, setSearch] = useState('');

  // Add form
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newNextStep, setNewNextStep] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Interaction
  const [interactionText, setInteractionText] = useState('');

  const loadContacts = useCallback(async () => {
    try {
      const data = await api.get('/wormhole-contacts');
      setContacts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadContacts(); }, []);

  const addContact = async () => {
    if (!newName.trim()) return;
    setAddLoading(true);
    try {
      await api.post('/wormhole-contacts', {
        name: newName.trim(),
        company: newCompany.trim(),
        title: newTitle.trim(),
        activation_next_step: newNextStep.trim(),
      });
      setShowAdd(false);
      setNewName(''); setNewCompany(''); setNewTitle(''); setNewNextStep('');
      loadContacts();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAddLoading(false);
    }
  };

  const importFromPhone = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant contacts permission to import');
        return;
      }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Company] });
      if (!data.length) {
        Alert.alert('No contacts', 'No contacts found on device');
        return;
      }
      const toImport = data.slice(0, 20).filter(c => c.name).map(c => ({
        name: c.name || 'Unknown',
        phone: c.phoneNumbers?.[0]?.number || '',
        email: c.emails?.[0]?.email || '',
        company: c.company || '',
      }));
      await api.post('/wormhole-contacts/import-bulk', toImport);
      loadContacts();
      Alert.alert('Imported', `${toImport.length} contacts imported`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to import contacts');
    }
  };

  const logInteraction = async () => {
    if (!interactionText.trim() || !showDetail) return;
    try {
      const updated = await api.post('/wormhole-contacts/interaction', {
        contact_id: showDetail.id,
        action_type: 'general',
        action_text: interactionText.trim(),
      });
      setShowDetail(updated);
      setInteractionText('');
      loadContacts();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const deleteContact = async (id: string) => {
    Alert.alert('Delete', 'Remove this contact?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.delete(`/wormhole-contacts/${id}`);
        setShowDetail(null);
        loadContacts();
      }}
    ]);
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Wormhole Network</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity testID="import-contacts-btn" onPress={importFromPhone} style={styles.iconBtn}>
            <Ionicons name="download-outline" size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity testID="add-contact-btn" onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

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

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadContacts(); }} tintColor={Colors.brand.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`contact-${item.id}`}
            style={styles.contactItem}
            onPress={() => setShowDetail(item)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              {item.company ? <Text style={styles.contactCompany}>{item.company}</Text> : null}
              {item.activation_next_step ? (
                <Text style={styles.nextStep} numberOfLines={1}>{item.activation_next_step}</Text>
              ) : null}
            </View>
            <View style={styles.contactMeta}>
              <Text style={styles.score}>{item.engagement_score || 0}</Text>
              <Text style={styles.scoreLabel}>touches</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="planet-outline" size={48} color={Colors.text.tertiary} />
            <Text style={styles.emptyText}>No contacts yet</Text>
            <Text style={styles.emptySub}>Add your first wormhole connection</Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      />

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Contact</Text>
                <TouchableOpacity testID="close-add-modal" onPress={() => setShowAdd(false)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <TextInput testID="add-name-input" style={styles.modalInput} value={newName} onChangeText={setNewName} placeholder="Name *" placeholderTextColor={Colors.text.tertiary} />
                <TextInput testID="add-company-input" style={styles.modalInput} value={newCompany} onChangeText={setNewCompany} placeholder="Company" placeholderTextColor={Colors.text.tertiary} />
                <TextInput testID="add-title-input" style={styles.modalInput} value={newTitle} onChangeText={setNewTitle} placeholder="Title" placeholderTextColor={Colors.text.tertiary} />
                <TextInput testID="add-nextstep-input" style={styles.modalInput} value={newNextStep} onChangeText={setNewNextStep} placeholder="Activation Next Step" placeholderTextColor={Colors.text.tertiary} />
                <TouchableOpacity
                  testID="save-contact-btn"
                  style={[styles.saveBtn, (!newName.trim() || addLoading) && styles.saveBtnDisabled]}
                  onPress={addContact}
                  disabled={!newName.trim() || addLoading}
                >
                  {addLoading ? <ActivityIndicator color={Colors.text.primary} /> : <Text style={styles.saveBtnText}>Save Contact</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{showDetail?.name}</Text>
                <TouchableOpacity testID="close-detail-modal" onPress={() => setShowDetail(null)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                {showDetail?.company ? <Text style={styles.detailInfo}>{showDetail.company} {showDetail.title ? `• ${showDetail.title}` : ''}</Text> : null}
                {showDetail?.activation_next_step ? (
                  <View style={styles.nextStepBox}>
                    <Text style={styles.nextStepLabel}>Next Step</Text>
                    <Text style={styles.nextStepText}>{showDetail.activation_next_step}</Text>
                  </View>
                ) : null}

                <Text style={styles.sectionTitle}>Log Interaction</Text>
                <View style={styles.interactionRow}>
                  <TextInput
                    testID="interaction-input"
                    style={styles.interactionInput}
                    value={interactionText}
                    onChangeText={setInteractionText}
                    placeholder="What did you do?"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                  <TouchableOpacity testID="log-interaction-btn" style={styles.logBtn} onPress={logInteraction}>
                    <Ionicons name="send" size={18} color={Colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>History</Text>
                {(showDetail?.interaction_history || []).length === 0 ? (
                  <Text style={styles.emptyHist}>No interactions logged yet</Text>
                ) : (
                  showDetail.interaction_history.slice().reverse().map((h: any, i: number) => (
                    <View key={i} style={styles.histItem}>
                      <Text style={styles.histDate}>{h.date}</Text>
                      <Text style={styles.histText}>{h.action_text}</Text>
                    </View>
                  ))
                )}

                <TouchableOpacity
                  testID="delete-contact-btn"
                  style={styles.deleteBtn}
                  onPress={() => deleteContact(showDetail?.id)}
                >
                  <Text style={styles.deleteBtnText}>Delete Contact</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, marginBottom: 16 },
  pageTitle: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bg.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border.default },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg.input, borderRadius: Radius.md, marginHorizontal: 20, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.border.default, gap: 8 },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: FontSize.base, paddingVertical: 12 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  contactInfo: { flex: 1 },
  contactName: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  contactCompany: { color: Colors.text.secondary, fontSize: FontSize.sm },
  nextStep: { color: Colors.brand.accent, fontSize: FontSize.xs, marginTop: 2 },
  contactMeta: { alignItems: 'center' },
  score: { color: Colors.brand.primary, fontSize: FontSize.lg, fontWeight: '700' },
  scoreLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { color: Colors.text.secondary, fontSize: FontSize.lg, fontWeight: '600' },
  emptySub: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalWrap: { maxHeight: '85%' },
  modal: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, maxHeight: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  modalInput: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default, marginBottom: 12 },
  saveBtn: { backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  detailInfo: { color: Colors.text.secondary, fontSize: FontSize.base, marginBottom: 16 },
  nextStepBox: { backgroundColor: 'rgba(168,85,247,0.08)', borderRadius: Radius.md, padding: 14, marginBottom: 16 },
  nextStepLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginBottom: 4 },
  nextStepText: { color: Colors.brand.accent, fontSize: FontSize.base },
  sectionTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700', marginTop: 20, marginBottom: 12 },
  interactionRow: { flexDirection: 'row', gap: 8 },
  interactionInput: { flex: 1, backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default },
  logBtn: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  emptyHist: { color: Colors.text.tertiary, fontSize: FontSize.sm, textAlign: 'center', padding: 20 },
  histItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  histDate: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  histText: { color: Colors.text.primary, fontSize: FontSize.base, marginTop: 2 },
  deleteBtn: { marginTop: 32, padding: 16, alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.status.error },
  deleteBtnText: { color: Colors.status.error, fontSize: FontSize.base, fontWeight: '600' },
});
