import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, FlatList, Modal,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Contacts from 'expo-contacts';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';

const LEVERAGE_CATEGORIES = [
  'investor', 'strategic_partner', 'distribution_partner', 
  'media', 'influencer', 'connector', 'industry_authority'
];

const CONTACT_METHODS = [
  { key: 'email', label: 'Email', icon: 'mail' },
  { key: 'linkedin_dm', label: 'LinkedIn DM', icon: 'logo-linkedin' },
  { key: 'text', label: 'Text', icon: 'chatbubble' },
  { key: 'phone', label: 'Phone Call', icon: 'call' },
  { key: 'warm_intro', label: 'Warm Intro', icon: 'people' },
  { key: 'in_person', label: 'In Person', icon: 'person' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

const ACTION_TYPES = [
  { key: 'sent_intro_email', label: 'Sent intro email' },
  { key: 'followed_up', label: 'Followed up' },
  { key: 'scheduled_meeting', label: 'Scheduled meeting' },
  { key: 'commented_post', label: 'Commented on post' },
  { key: 'made_introduction', label: 'Made introduction' },
  { key: 'had_call', label: 'Had a call' },
  { key: 'sent_proposal', label: 'Sent proposal' },
  { key: 'met_in_person', label: 'Met in person' },
  { key: 'other', label: 'Other' },
];

const CONNECTION_LEVELS = ['cold', 'warm', 'hot', 'close'];

export default function WormholeScreen() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState<any>({});
  const [formLoading, setFormLoading] = useState(false);

  // Interaction state
  const [interactionType, setInteractionType] = useState('');
  const [interactionText, setInteractionText] = useState('');
  const [impactRating, setImpactRating] = useState(5);
  const [showInteractionForm, setShowInteractionForm] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '', company: '', title: '', location: '',
      website: '', email: '', phone: '',
      linkedin: '', twitter: '', instagram: '', youtube: '', tiktok: '', other_social: '',
      leverage_categories: [], leverage_description: '',
      best_contact_method: '', connection_level: 'warm',
      tags: [], engagement_strength: 5,
      activation_next_step: '', notes: ''
    });
  };

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

  const saveContact = async (isNew = true) => {
    if (!formData.name?.trim()) return;
    setFormLoading(true);
    try {
      if (isNew) {
        await api.post('/wormhole-contacts', formData);
        setShowAdd(false);
      } else {
        await api.put(`/wormhole-contacts/${showDetail.id}`, formData);
        setShowEdit(false);
        // Refresh detail
        const updated = await api.get(`/wormhole-contacts/${showDetail.id}`);
        setShowDetail(updated);
      }
      resetForm();
      loadContacts();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const importFromPhone = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant contacts permission to import');
        return;
      }
      const { data } = await Contacts.getContactsAsync({ 
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Company] 
      });
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
    if (!interactionType || !interactionText.trim() || !showDetail) return;
    try {
      const updated = await api.post('/wormhole-contacts/interaction', {
        contact_id: showDetail.id,
        action_type: interactionType,
        action_text: interactionText.trim(),
        impact_rating: impactRating,
      });
      setShowDetail(updated);
      setInteractionText('');
      setInteractionType('');
      setImpactRating(5);
      setShowInteractionForm(false);
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

  const openEdit = () => {
    setFormData({...showDetail});
    setShowEdit(true);
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.primary} /></View>
      </SafeAreaView>
    );
  }

  const renderContactForm = (isNew = true) => (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* Identity */}
      <Text style={styles.formSection}>Identity</Text>
      <TextInput 
        style={styles.modalInput} 
        value={formData.name || ''} 
        onChangeText={t => setFormData({...formData, name: t})} 
        placeholder="Name *" 
        placeholderTextColor={Colors.text.tertiary} 
      />
      <TextInput 
        style={styles.modalInput} 
        value={formData.company || ''} 
        onChangeText={t => setFormData({...formData, company: t})} 
        placeholder="Company" 
        placeholderTextColor={Colors.text.tertiary} 
      />
      <View style={styles.row}>
        <TextInput 
          style={[styles.modalInput, { flex: 1 }]} 
          value={formData.title || ''} 
          onChangeText={t => setFormData({...formData, title: t})} 
          placeholder="Title / Role" 
          placeholderTextColor={Colors.text.tertiary} 
        />
        <TextInput 
          style={[styles.modalInput, { flex: 1 }]} 
          value={formData.location || ''} 
          onChangeText={t => setFormData({...formData, location: t})} 
          placeholder="Location" 
          placeholderTextColor={Colors.text.tertiary} 
        />
      </View>

      {/* Contact Info */}
      <Text style={styles.formSection}>Contact Info</Text>
      <TextInput 
        style={styles.modalInput} 
        value={formData.email || ''} 
        onChangeText={t => setFormData({...formData, email: t})} 
        placeholder="Email" 
        placeholderTextColor={Colors.text.tertiary}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.modalInput} 
        value={formData.phone || ''} 
        onChangeText={t => setFormData({...formData, phone: t})} 
        placeholder="Phone" 
        placeholderTextColor={Colors.text.tertiary}
        keyboardType="phone-pad"
      />
      <TextInput 
        style={styles.modalInput} 
        value={formData.website || ''} 
        onChangeText={t => setFormData({...formData, website: t})} 
        placeholder="Website" 
        placeholderTextColor={Colors.text.tertiary}
        autoCapitalize="none"
      />

      {/* Social Media */}
      <Text style={styles.formSection}>Social Media</Text>
      <View style={styles.socialRow}>
        <Ionicons name="logo-linkedin" size={18} color={Colors.brand.accent} />
        <TextInput 
          style={[styles.modalInput, { flex: 1, marginBottom: 0 }]} 
          value={formData.linkedin || ''} 
          onChangeText={t => setFormData({...formData, linkedin: t})} 
          placeholder="LinkedIn URL" 
          placeholderTextColor={Colors.text.tertiary}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.socialRow}>
        <Ionicons name="logo-twitter" size={18} color={Colors.brand.accent} />
        <TextInput 
          style={[styles.modalInput, { flex: 1, marginBottom: 0 }]} 
          value={formData.twitter || ''} 
          onChangeText={t => setFormData({...formData, twitter: t})} 
          placeholder="Twitter / X handle" 
          placeholderTextColor={Colors.text.tertiary}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.socialRow}>
        <Ionicons name="logo-instagram" size={18} color={Colors.brand.accent} />
        <TextInput 
          style={[styles.modalInput, { flex: 1, marginBottom: 0 }]} 
          value={formData.instagram || ''} 
          onChangeText={t => setFormData({...formData, instagram: t})} 
          placeholder="Instagram handle" 
          placeholderTextColor={Colors.text.tertiary}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.socialRow}>
        <Ionicons name="logo-youtube" size={18} color={Colors.brand.accent} />
        <TextInput 
          style={[styles.modalInput, { flex: 1, marginBottom: 0 }]} 
          value={formData.youtube || ''} 
          onChangeText={t => setFormData({...formData, youtube: t})} 
          placeholder="YouTube channel" 
          placeholderTextColor={Colors.text.tertiary}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.socialRow}>
        <Ionicons name="logo-tiktok" size={18} color={Colors.brand.accent} />
        <TextInput 
          style={[styles.modalInput, { flex: 1, marginBottom: 0 }]} 
          value={formData.tiktok || ''} 
          onChangeText={t => setFormData({...formData, tiktok: t})} 
          placeholder="TikTok handle" 
          placeholderTextColor={Colors.text.tertiary}
          autoCapitalize="none"
        />
      </View>

      {/* Leverage Potential */}
      <Text style={styles.formSection}>Leverage Potential</Text>
      <Text style={styles.inputHint}>How could this person accelerate your 10x goal?</Text>
      <View style={styles.chipRow}>
        {LEVERAGE_CATEGORIES.map(cat => {
          const selected = (formData.leverage_categories || []).includes(cat);
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => {
                const cats = formData.leverage_categories || [];
                if (selected) {
                  setFormData({...formData, leverage_categories: cats.filter((c: string) => c !== cat)});
                } else {
                  setFormData({...formData, leverage_categories: [...cats, cat]});
                }
              }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {cat.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput 
        style={[styles.modalInput, { minHeight: 60 }]} 
        value={formData.leverage_description || ''} 
        onChangeText={t => setFormData({...formData, leverage_description: t})} 
        placeholder="Describe how they could help..." 
        placeholderTextColor={Colors.text.tertiary}
        multiline
      />

      {/* Best Contact Method */}
      <Text style={styles.formSection}>Best Contact Method</Text>
      <View style={styles.chipRow}>
        {CONTACT_METHODS.map(m => {
          const selected = formData.best_contact_method === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setFormData({...formData, best_contact_method: m.key})}
            >
              <Ionicons name={m.icon as any} size={14} color={selected ? Colors.text.primary : Colors.text.tertiary} />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Connection Level */}
      <Text style={styles.formSection}>Connection Level</Text>
      <View style={styles.connectionRow}>
        {CONNECTION_LEVELS.map(level => {
          const selected = formData.connection_level === level;
          return (
            <TouchableOpacity
              key={level}
              style={[styles.connectionBtn, selected && styles.connectionBtnSelected]}
              onPress={() => setFormData({...formData, connection_level: level})}
            >
              <Text style={[styles.connectionText, selected && styles.connectionTextSelected]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Engagement Strength */}
      <Text style={styles.formSection}>Engagement Strength</Text>
      <View style={styles.strengthRow}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.strengthBtn, (formData.engagement_strength || 5) >= n && styles.strengthBtnActive]}
            onPress={() => setFormData({...formData, engagement_strength: n})}
          >
            <Text style={styles.strengthText}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Activation Next Step */}
      <Text style={styles.formSection}>Activation</Text>
      <TextInput 
        style={styles.modalInput} 
        value={formData.activation_next_step || ''} 
        onChangeText={t => setFormData({...formData, activation_next_step: t})} 
        placeholder="What's your next step with them?" 
        placeholderTextColor={Colors.text.tertiary}
      />
      <TextInput 
        style={[styles.modalInput, { minHeight: 80 }]} 
        value={formData.notes || ''} 
        onChangeText={t => setFormData({...formData, notes: t})} 
        placeholder="Notes..." 
        placeholderTextColor={Colors.text.tertiary}
        multiline
      />

      <TouchableOpacity
        style={[styles.saveBtn, (!formData.name?.trim() || formLoading) && styles.saveBtnDisabled]}
        onPress={() => saveContact(isNew)}
        disabled={!formData.name?.trim() || formLoading}
      >
        {formLoading ? <ActivityIndicator color={Colors.text.primary} /> : (
          <Text style={styles.saveBtnText}>{isNew ? 'Add Contact' : 'Save Changes'}</Text>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Wormhole Network</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity testID="import-contacts-btn" onPress={importFromPhone} style={styles.iconBtn}>
            <Ionicons name="download-outline" size={22} color={Colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity testID="add-contact-btn" onPress={() => { resetForm(); setShowAdd(true); }} style={styles.addBtn}>
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
            <View style={[styles.avatar, { backgroundColor: item.connection_level === 'hot' ? Colors.status.error : item.connection_level === 'close' ? Colors.status.success : Colors.brand.primary }]}>
              <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              {item.company ? <Text style={styles.contactCompany}>{item.company}{item.title ? ` • ${item.title}` : ''}</Text> : null}
              {item.activation_next_step ? (
                <Text style={styles.nextStep} numberOfLines={1}>{item.activation_next_step}</Text>
              ) : null}
              {item.leverage_categories?.length > 0 && (
                <View style={styles.tagRow}>
                  {item.leverage_categories.slice(0, 2).map((t: string) => (
                    <View key={t} style={styles.tagBadge}>
                      <Text style={styles.tagText}>{t.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>
              )}
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
              {renderContactForm(true)}
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
                <View style={styles.headerBtns}>
                  <TouchableOpacity onPress={openEdit} style={styles.editBtn}>
                    <Ionicons name="create-outline" size={20} color={Colors.text.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity testID="close-detail-modal" onPress={() => setShowDetail(null)}>
                    <Ionicons name="close" size={24} color={Colors.text.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Basic Info */}
                {(showDetail?.company || showDetail?.title) && (
                  <Text style={styles.detailInfo}>{showDetail.company}{showDetail.title ? ` • ${showDetail.title}` : ''}</Text>
                )}
                {showDetail?.location && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={Colors.text.tertiary} />
                    <Text style={styles.detailText}>{showDetail.location}</Text>
                  </View>
                )}

                {/* Contact Info */}
                {(showDetail?.email || showDetail?.phone || showDetail?.website) && (
                  <View style={styles.detailSection}>
                    {showDetail.email && (
                      <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={16} color={Colors.brand.accent} />
                        <Text style={styles.detailLink}>{showDetail.email}</Text>
                      </View>
                    )}
                    {showDetail.phone && (
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={16} color={Colors.brand.accent} />
                        <Text style={styles.detailLink}>{showDetail.phone}</Text>
                      </View>
                    )}
                    {showDetail.website && (
                      <View style={styles.detailRow}>
                        <Ionicons name="globe-outline" size={16} color={Colors.brand.accent} />
                        <Text style={styles.detailLink}>{showDetail.website}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Social Links */}
                {(showDetail?.linkedin || showDetail?.twitter || showDetail?.instagram) && (
                  <View style={styles.socialLinks}>
                    {showDetail.linkedin && <Ionicons name="logo-linkedin" size={24} color={Colors.brand.accent} />}
                    {showDetail.twitter && <Ionicons name="logo-twitter" size={24} color={Colors.brand.accent} />}
                    {showDetail.instagram && <Ionicons name="logo-instagram" size={24} color={Colors.brand.accent} />}
                    {showDetail.youtube && <Ionicons name="logo-youtube" size={24} color={Colors.brand.accent} />}
                    {showDetail.tiktok && <Ionicons name="logo-tiktok" size={24} color={Colors.brand.accent} />}
                  </View>
                )}

                {/* Leverage */}
                {showDetail?.leverage_categories?.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Leverage Potential</Text>
                    <View style={styles.tagRow}>
                      {showDetail.leverage_categories.map((t: string) => (
                        <View key={t} style={styles.tagBadge}>
                          <Text style={styles.tagText}>{t.replace('_', ' ')}</Text>
                        </View>
                      ))}
                    </View>
                    {showDetail.leverage_description && (
                      <Text style={styles.detailText}>{showDetail.leverage_description}</Text>
                    )}
                  </View>
                )}

                {/* Next Step */}
                {showDetail?.activation_next_step && (
                  <LinearGradient colors={[Colors.brand.primary + '20', 'transparent']} style={styles.nextStepBox}>
                    <Text style={styles.nextStepLabel}>Next Step</Text>
                    <Text style={styles.nextStepText}>{showDetail.activation_next_step}</Text>
                  </LinearGradient>
                )}

                {/* Log Interaction */}
                <Text style={styles.sectionTitle}>Log Interaction</Text>
                {!showInteractionForm ? (
                  <TouchableOpacity 
                    style={styles.logInteractionBtn}
                    onPress={() => setShowInteractionForm(true)}
                  >
                    <Ionicons name="add-circle" size={24} color={Colors.brand.primary} />
                    <Text style={styles.logInteractionText}>Log a new interaction</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.interactionForm}>
                    <Text style={styles.inputLabel}>Action Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.actionTypeRow}>
                        {ACTION_TYPES.map(a => (
                          <TouchableOpacity
                            key={a.key}
                            style={[styles.actionTypeBtn, interactionType === a.key && styles.actionTypeBtnSelected]}
                            onPress={() => setInteractionType(a.key)}
                          >
                            <Text style={[styles.actionTypeText, interactionType === a.key && styles.actionTypeTextSelected]}>
                              {a.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    
                    <Text style={styles.inputLabel}>What did you do?</Text>
                    <TextInput
                      testID="interaction-input"
                      style={styles.interactionInput}
                      value={interactionText}
                      onChangeText={setInteractionText}
                      placeholder="Describe your interaction..."
                      placeholderTextColor={Colors.text.tertiary}
                      multiline
                    />
                    
                    <Text style={styles.inputLabel}>Impact Rating (1-10)</Text>
                    <View style={styles.impactRow}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <TouchableOpacity
                          key={n}
                          style={[styles.impactBtn, impactRating >= n && styles.impactBtnActive]}
                          onPress={() => setImpactRating(n)}
                        >
                          <Text style={styles.impactText}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.impactHint}>Higher impact = more bonus points</Text>
                    
                    <View style={styles.interactionActions}>
                      <TouchableOpacity 
                        style={styles.cancelBtn}
                        onPress={() => setShowInteractionForm(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        testID="log-interaction-btn" 
                        style={[styles.submitBtn, (!interactionType || !interactionText.trim()) && styles.saveBtnDisabled]} 
                        onPress={logInteraction}
                        disabled={!interactionType || !interactionText.trim()}
                      >
                        <Text style={styles.submitBtnText}>Log Interaction</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* History */}
                <Text style={styles.sectionTitle}>History</Text>
                {(showDetail?.interaction_history || []).length === 0 ? (
                  <Text style={styles.emptyHist}>No interactions logged yet</Text>
                ) : (
                  showDetail.interaction_history.slice().reverse().map((h: any, i: number) => (
                    <View key={i} style={styles.histItem}>
                      <View style={styles.histHeader}>
                        <Text style={styles.histDate}>{h.date}</Text>
                        {h.action_type && <View style={styles.histTypeBadge}><Text style={styles.histTypeText}>{h.action_type.replace('_', ' ')}</Text></View>}
                        {h.impact_rating && <Text style={styles.histImpact}>Impact: {h.impact_rating}/10</Text>}
                      </View>
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
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Contact</Text>
                <TouchableOpacity onPress={() => setShowEdit(false)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              {renderContactForm(false)}
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
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bg.input, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg.input, borderRadius: Radius.md, marginHorizontal: 20, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.border.default, gap: 8 },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: FontSize.base, paddingVertical: 12 },
  
  // Contact Item
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  contactInfo: { flex: 1 },
  contactName: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  contactCompany: { color: Colors.text.secondary, fontSize: FontSize.sm },
  nextStep: { color: Colors.brand.accent, fontSize: FontSize.xs, marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tagBadge: { backgroundColor: Colors.brand.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { color: Colors.brand.primary, fontSize: FontSize.xs, textTransform: 'capitalize' },
  contactMeta: { alignItems: 'center' },
  score: { color: Colors.brand.primary, fontSize: FontSize.lg, fontWeight: '700' },
  scoreLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  
  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { color: Colors.text.secondary, fontSize: FontSize.lg, fontWeight: '600' },
  emptySub: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalWrap: { maxHeight: '90%' },
  modal: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, maxHeight: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800', flex: 1 },
  modalInput: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default, marginBottom: 12 },
  
  // Form
  formSection: { color: Colors.brand.primary, fontSize: FontSize.sm, fontWeight: '700', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  inputLabel: { color: Colors.text.secondary, fontSize: FontSize.sm, marginBottom: 6, marginTop: 8 },
  inputHint: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipSelected: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  chipText: { color: Colors.text.secondary, fontSize: FontSize.sm, textTransform: 'capitalize' },
  chipTextSelected: { color: Colors.text.primary },
  connectionRow: { flexDirection: 'row', gap: 8 },
  connectionBtn: { flex: 1, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.bg.input, alignItems: 'center', borderWidth: 1, borderColor: Colors.border.default },
  connectionBtnSelected: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  connectionText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600' },
  connectionTextSelected: { color: Colors.text.primary },
  strengthRow: { flexDirection: 'row', gap: 4 },
  strengthBtn: { flex: 1, padding: 10, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, alignItems: 'center' },
  strengthBtnActive: { backgroundColor: Colors.brand.primary },
  strengthText: { color: Colors.text.primary, fontSize: FontSize.xs, fontWeight: '600' },
  saveBtn: { backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  
  // Detail
  detailInfo: { color: Colors.text.secondary, fontSize: FontSize.base, marginBottom: 8 },
  detailSection: { marginTop: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  detailLink: { color: Colors.brand.accent, fontSize: FontSize.sm },
  detailLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginBottom: 6 },
  socialLinks: { flexDirection: 'row', gap: 16, marginTop: 12 },
  nextStepBox: { borderRadius: Radius.md, padding: 14, marginTop: 16 },
  nextStepLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginBottom: 4 },
  nextStepText: { color: Colors.brand.accent, fontSize: FontSize.base },
  sectionTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  
  // Interaction Form
  logInteractionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: Colors.bg.input, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border.default },
  logInteractionText: { color: Colors.text.secondary, fontSize: FontSize.base },
  interactionForm: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14 },
  actionTypeRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  actionTypeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default },
  actionTypeBtnSelected: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  actionTypeText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  actionTypeTextSelected: { color: Colors.text.primary },
  interactionInput: { backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: 12, color: Colors.text.primary, fontSize: FontSize.base, minHeight: 60, borderWidth: 1, borderColor: Colors.border.default, marginTop: 4 },
  impactRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  impactBtn: { flex: 1, padding: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.card, alignItems: 'center' },
  impactBtnActive: { backgroundColor: Colors.status.success },
  impactText: { color: Colors.text.primary, fontSize: FontSize.xs, fontWeight: '600' },
  impactHint: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: 4 },
  interactionActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.bg.card, alignItems: 'center' },
  cancelBtnText: { color: Colors.text.secondary, fontSize: FontSize.base },
  submitBtn: { flex: 2, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.brand.primary, alignItems: 'center' },
  submitBtnText: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  
  // History
  emptyHist: { color: Colors.text.tertiary, fontSize: FontSize.sm, textAlign: 'center', padding: 20 },
  histItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  histHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  histDate: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  histTypeBadge: { backgroundColor: Colors.brand.accent + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  histTypeText: { color: Colors.brand.accent, fontSize: FontSize.xs, textTransform: 'capitalize' },
  histImpact: { color: Colors.status.success, fontSize: FontSize.xs },
  histText: { color: Colors.text.primary, fontSize: FontSize.base },
  deleteBtn: { marginTop: 32, padding: 16, alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.status.error },
  deleteBtnText: { color: Colors.status.error, fontSize: FontSize.base, fontWeight: '600' },
});
