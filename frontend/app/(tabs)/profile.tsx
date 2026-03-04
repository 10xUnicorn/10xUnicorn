import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';

const SERVICES = [
  'capital', 'marketing', 'social_media', 'community_management', 'operations',
  'tech_development', 'podcast_booking', 'speaking', 'sponsorships', 'events',
  'communities', 'financial_services', 'coaching', 'design', 'sales', 'legal', 'hr'
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [memberProfile, setMemberProfile] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [habit, setHabit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const [data, memberData] = await Promise.all([
        api.get('/profile'),
        api.get('/member/profile'),
      ]);
      setProfile(data.profile);
      setGoal(data.goal);
      setHabit(data.habit);
      setMemberProfile(memberData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openEditProfile = () => {
    setEditForm({
      display_name: profile?.display_name || '',
      company_name: memberProfile?.company_name || '',
      website: memberProfile?.website || '',
      email: memberProfile?.email || '',
      phone: memberProfile?.phone || '',
      booking_link: memberProfile?.booking_link || '',
      linkedin: memberProfile?.linkedin || '',
      twitter: memberProfile?.twitter || '',
      instagram: memberProfile?.instagram || '',
      bio: memberProfile?.bio || '',
      working_on: memberProfile?.working_on || '',
      services_offered: memberProfile?.services_offered || [],
      target_customer: memberProfile?.target_customer || '',
      good_connection_for: memberProfile?.good_connection_for || '',
      warm_connection: memberProfile?.warm_connection || '',
      golden_connection: memberProfile?.golden_connection || '',
    });
    setShowEditProfile(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      // Update basic profile
      if (editForm.display_name !== profile?.display_name) {
        await api.put('/profile', { display_name: editForm.display_name });
      }
      // Update member profile
      const { display_name, ...memberFields } = editForm;
      await api.put('/member/profile', memberFields);
      await loadProfile();
      setShowEditProfile(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (service: string) => {
    const current = editForm.services_offered || [];
    if (current.includes(service)) {
      setEditForm({ ...editForm, services_offered: current.filter((s: string) => s !== service) });
    } else {
      setEditForm({ ...editForm, services_offered: [...current, service] });
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }}
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This will permanently delete your account and all data. Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/auth/account');
          await logout();
          router.replace('/(auth)/login');
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      }}
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile</Text>

        {/* Header Card */}
        <LinearGradient colors={[Colors.brand.primary + '20', 'transparent']} style={styles.headerCard}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>
              {(profile?.display_name || user?.email || '?')[0]?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{profile?.display_name || 'Set your name'}</Text>
          {memberProfile?.company_name && <Text style={styles.companyName}>{memberProfile.company_name}</Text>}
          <Text style={styles.email}>{user?.email}</Text>
          
          <TouchableOpacity testID="edit-profile-btn" style={styles.editProfileBtn} onPress={openEditProfile}>
            <Ionicons name="create-outline" size={16} color={Colors.text.primary} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Info */}
        {memberProfile?.working_on && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Currently Working On</Text>
            <Text style={styles.cardValue}>{memberProfile.working_on}</Text>
          </View>
        )}

        {/* 10x Goal */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="rocket" size={20} color={Colors.brand.primary} />
          </View>
          <Text style={styles.cardLabel}>10x Goal</Text>
          <Text style={styles.cardValue}>{goal?.title || 'Not set'}</Text>
          {goal?.description && <Text style={styles.cardDesc}>{goal.description}</Text>}
        </View>

        {/* Compound Habit */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="repeat" size={20} color={Colors.brand.accent} />
          </View>
          <Text style={styles.cardLabel}>Daily Compound Habit</Text>
          <Text style={styles.cardValue}>{habit?.habit_title || 'Not set'}</Text>
        </View>

        {/* Contact & Social */}
        {(memberProfile?.website || memberProfile?.booking_link || memberProfile?.linkedin) && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Contact & Social</Text>
            {memberProfile?.website && (
              <View style={styles.infoRow}>
                <Ionicons name="globe-outline" size={16} color={Colors.brand.accent} />
                <Text style={styles.infoText}>{memberProfile.website}</Text>
              </View>
            )}
            {memberProfile?.booking_link && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.brand.accent} />
                <Text style={styles.infoText}>{memberProfile.booking_link}</Text>
              </View>
            )}
            {memberProfile?.linkedin && (
              <View style={styles.infoRow}>
                <Ionicons name="logo-linkedin" size={16} color={Colors.brand.accent} />
                <Text style={styles.infoText}>{memberProfile.linkedin}</Text>
              </View>
            )}
            {memberProfile?.twitter && (
              <View style={styles.infoRow}>
                <Ionicons name="logo-twitter" size={16} color={Colors.brand.accent} />
                <Text style={styles.infoText}>{memberProfile.twitter}</Text>
              </View>
            )}
          </View>
        )}

        {/* Services Offered */}
        {memberProfile?.services_offered?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Services Offered</Text>
            <View style={styles.chipRow}>
              {memberProfile.services_offered.map((s: string) => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s.replace('_', ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Connection Info */}
        {(memberProfile?.good_connection_for || memberProfile?.golden_connection) && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Connection Profile</Text>
            {memberProfile?.good_connection_for && (
              <>
                <Text style={styles.connectionLabel}>Good Connection For:</Text>
                <Text style={styles.connectionText}>{memberProfile.good_connection_for}</Text>
              </>
            )}
            {memberProfile?.golden_connection && (
              <>
                <Text style={styles.connectionLabel}>Golden Connection:</Text>
                <Text style={styles.connectionText}>{memberProfile.golden_connection}</Text>
              </>
            )}
          </View>
        )}

        {/* Timezone */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Timezone</Text>
          <Text style={styles.cardValue}>{profile?.timezone_str || 'UTC'}</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.text.primary} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity testID="delete-account-btn" style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={20} color={Colors.status.error} />
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Basic Info */}
                <Text style={styles.formSection}>Basic Info</Text>
                <TextInput style={styles.input} value={editForm.display_name} onChangeText={t => setEditForm({...editForm, display_name: t})} placeholder="Display Name" placeholderTextColor={Colors.text.tertiary} />
                <TextInput style={styles.input} value={editForm.company_name} onChangeText={t => setEditForm({...editForm, company_name: t})} placeholder="Company Name" placeholderTextColor={Colors.text.tertiary} />
                <TextInput style={[styles.input, { minHeight: 80 }]} value={editForm.bio} onChangeText={t => setEditForm({...editForm, bio: t})} placeholder="Bio - Tell us about yourself" placeholderTextColor={Colors.text.tertiary} multiline />
                <TextInput style={styles.input} value={editForm.working_on} onChangeText={t => setEditForm({...editForm, working_on: t})} placeholder="What are you currently working on?" placeholderTextColor={Colors.text.tertiary} />

                {/* Contact */}
                <Text style={styles.formSection}>Contact Info</Text>
                <TextInput style={styles.input} value={editForm.website} onChangeText={t => setEditForm({...editForm, website: t})} placeholder="Website" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                <TextInput style={styles.input} value={editForm.email} onChangeText={t => setEditForm({...editForm, email: t})} placeholder="Contact Email" placeholderTextColor={Colors.text.tertiary} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={styles.input} value={editForm.phone} onChangeText={t => setEditForm({...editForm, phone: t})} placeholder="Phone" placeholderTextColor={Colors.text.tertiary} keyboardType="phone-pad" />
                <TextInput style={styles.input} value={editForm.booking_link} onChangeText={t => setEditForm({...editForm, booking_link: t})} placeholder="Booking Link (Calendly, etc.)" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />

                {/* Social */}
                <Text style={styles.formSection}>Social Media</Text>
                <View style={styles.socialRow}>
                  <Ionicons name="logo-linkedin" size={18} color={Colors.brand.accent} />
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={editForm.linkedin} onChangeText={t => setEditForm({...editForm, linkedin: t})} placeholder="LinkedIn URL" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                </View>
                <View style={styles.socialRow}>
                  <Ionicons name="logo-twitter" size={18} color={Colors.brand.accent} />
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={editForm.twitter} onChangeText={t => setEditForm({...editForm, twitter: t})} placeholder="Twitter handle" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                </View>
                <View style={styles.socialRow}>
                  <Ionicons name="logo-instagram" size={18} color={Colors.brand.accent} />
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={editForm.instagram} onChangeText={t => setEditForm({...editForm, instagram: t})} placeholder="Instagram handle" placeholderTextColor={Colors.text.tertiary} autoCapitalize="none" />
                </View>

                {/* Services */}
                <Text style={styles.formSection}>Services Offered</Text>
                <View style={styles.chipSelectRow}>
                  {SERVICES.map(s => {
                    const selected = (editForm.services_offered || []).includes(s);
                    return (
                      <TouchableOpacity key={s} style={[styles.chipSelect, selected && styles.chipSelectActive]} onPress={() => toggleService(s)}>
                        <Text style={[styles.chipSelectText, selected && styles.chipSelectTextActive]}>{s.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Target Customer */}
                <Text style={styles.formSection}>Business Info</Text>
                <TextInput style={[styles.input, { minHeight: 60 }]} value={editForm.target_customer} onChangeText={t => setEditForm({...editForm, target_customer: t})} placeholder="Who is your target customer?" placeholderTextColor={Colors.text.tertiary} multiline />

                {/* Connection Profile */}
                <Text style={styles.formSection}>Connection Profile</Text>
                <TextInput style={[styles.input, { minHeight: 60 }]} value={editForm.good_connection_for} onChangeText={t => setEditForm({...editForm, good_connection_for: t})} placeholder="Who are you a good connection for?" placeholderTextColor={Colors.text.tertiary} multiline />
                <TextInput style={[styles.input, { minHeight: 60 }]} value={editForm.warm_connection} onChangeText={t => setEditForm({...editForm, warm_connection: t})} placeholder="Who is a warm connection for you?" placeholderTextColor={Colors.text.tertiary} multiline />
                <TextInput style={[styles.input, { minHeight: 60 }]} value={editForm.golden_connection} onChangeText={t => setEditForm({...editForm, golden_connection: t})} placeholder="Who is your golden/ideal connection?" placeholderTextColor={Colors.text.tertiary} multiline />

                <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveProfile} disabled={saving}>
                  {saving ? <ActivityIndicator color={Colors.text.primary} /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
                </TouchableOpacity>
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
  content: { paddingHorizontal: 20, paddingTop: 16 },
  pageTitle: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.text.primary, marginBottom: 20, letterSpacing: -0.5 },
  
  // Header Card
  headerCard: { borderRadius: Radius.lg, padding: 24, alignItems: 'center', marginBottom: 20 },
  bigAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  bigAvatarText: { color: Colors.text.primary, fontSize: 32, fontWeight: '800' },
  displayName: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700' },
  companyName: { color: Colors.text.secondary, fontSize: FontSize.base, marginTop: 4 },
  email: { color: Colors.text.tertiary, fontSize: FontSize.sm, marginTop: 4 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.brand.primary, borderRadius: Radius.md },
  editProfileText: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '600' },
  
  // Cards
  card: { backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border.default },
  cardIcon: { marginBottom: 8 },
  cardLabel: { color: Colors.text.tertiary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 4 },
  cardValue: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '600' },
  cardDesc: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  sectionLabel: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '700', marginBottom: 12 },
  
  // Info Row
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { color: Colors.brand.accent, fontSize: FontSize.sm },
  
  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: Colors.brand.primary + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm },
  chipText: { color: Colors.brand.primary, fontSize: FontSize.sm, textTransform: 'capitalize' },
  
  // Connection
  connectionLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  connectionText: { color: Colors.text.primary, fontSize: FontSize.sm },
  
  // Buttons
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16, marginTop: 20, borderWidth: 1, borderColor: Colors.border.default },
  logoutText: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, padding: 16, marginTop: 12, borderWidth: 1, borderColor: Colors.status.error },
  deleteBtnText: { color: Colors.status.error, fontSize: FontSize.base, fontWeight: '600' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalWrap: { maxHeight: '90%' },
  modal: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, maxHeight: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  
  // Form
  formSection: { color: Colors.brand.primary, fontSize: FontSize.sm, fontWeight: '700', marginTop: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default, marginBottom: 12 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chipSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipSelect: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default },
  chipSelectActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  chipSelectText: { color: Colors.text.secondary, fontSize: FontSize.sm, textTransform: 'capitalize' },
  chipSelectTextActive: { color: Colors.text.primary },
  saveBtn: { backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
});
