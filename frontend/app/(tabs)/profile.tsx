/**
 * Profile Tab — (tabs)/profile.tsx
 * User profile with avatar, edit modal, 10x goal, daily compound target, notification settings
 * ~500 lines
 */

import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, Text, Image, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView,
  Platform, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
// expo-image-picker is native-only — conditionally import
let ImagePicker: any = null;
if (Platform.OS !== 'web') {
  ImagePicker = require('expo-image-picker');
}
import { useAuth } from '../../src/context/AuthContext';
import { profiles, goals } from '../../src/utils/database';
import { supabase } from '../../src/utils/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '../../src/constants/theme';
import { Profile, Goal } from '../../src/types/database';
import CosmicBackground from '../../src/components/CosmicBackground';
import UnicornHeader from '../../src/components/UnicornHeader';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    displayName: '',
    company: '',
    title: '',
    phone: '',
    bio: '',
    website: '',
    twitter: '',
    linkedin: '',
    instagram: '',
    services: '',
    industries: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    achievements: true,
    messages: true,
    wormholeUpdates: true,
  });

  // Compound target editor
  const [compoundTarget, setCompoundTarget] = useState('1');
  const [compoundModalVisible, setCompoundModalVisible] = useState(false);

  // Goal editor
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    targetNumber: '',
    targetDate: '',
    goalType: 'number' as 'dollar' | 'number',
    currentNumber: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profileData, error: profileErr } = await profiles.get(user.id);
      if (profileErr) {
        console.error('Profile error:', profileErr);
        return;
      }
      setProfile(profileData);
      setEditForm({
        displayName: profileData?.display_name || '',
        company: profileData?.company || '',
        title: profileData?.title || '',
        phone: profileData?.phone || '',
        bio: profileData?.bio || '',
        website: profileData?.website || '',
        twitter: profileData?.twitter_url || '',
        linkedin: profileData?.linkedin_url || '',
        instagram: profileData?.instagram_url || '',
        services: profileData?.services_offered?.join(', ') || '',
        industries: profileData?.industries?.join(', ') || '',
      });
      setCompoundTarget(String(profileData?.daily_compound_target || 1));

      // Load active goal
      const { data: goalData } = await goals.getActive(user.id);
      setGoal(goalData || null);
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Image upload coming soon for web');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      // React Native compatible: read as arraybuffer
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        });

      if (uploadErr) {
        console.error('Storage upload error:', uploadErr);
        throw uploadErr;
      }

      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrl.publicUrl;

      const { error: updateErr } = await profiles.update(user.id, {
        avatar_url: avatarUrl,
      });

      if (updateErr) {
        console.error('Profile update error:', updateErr);
        throw updateErr;
      }

      setProfile({ ...profile, avatar_url: avatarUrl });
      Alert.alert('Success', 'Avatar updated');
    } catch (err: any) {
      console.error('Upload avatar error:', err);
      Alert.alert('Error', err?.message || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { error } = await profiles.update(user.id, {
        display_name: editForm.displayName,
        full_name: editForm.displayName,
        company: editForm.company || null,
        title: editForm.title || null,
        phone: editForm.phone || null,
        bio: editForm.bio || null,
        website: editForm.website || null,
        twitter_url: editForm.twitter || null,
        linkedin_url: editForm.linkedin || null,
        instagram_url: editForm.instagram || null,
        services_offered: editForm.services
          ? editForm.services.split(',').map(s => s.trim())
          : null,
        industries: editForm.industries
          ? editForm.industries.split(',').map(i => i.trim())
          : null,
      });

      if (error) throw error;

      setProfile({
        ...profile!,
        display_name: editForm.displayName,
        company: editForm.company || null,
        title: editForm.title || null,
        phone: editForm.phone || null,
        bio: editForm.bio || null,
        website: editForm.website || null,
        twitter_url: editForm.twitter || null,
        linkedin_url: editForm.linkedin || null,
        instagram_url: editForm.instagram || null,
      });

      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated');
    } catch (err) {
      console.error('Save profile error:', err);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const saveCompoundTarget = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { error } = await profiles.update(user.id, {
        daily_compound_target: parseInt(compoundTarget, 10) || 1,
      });

      if (error) throw error;

      setProfile({
        ...profile!,
        daily_compound_target: parseInt(compoundTarget, 10) || 1,
      });

      setCompoundModalVisible(false);
      Alert.alert('Success', 'Daily compound target updated');
    } catch (err) {
      console.error('Save compound target error:', err);
      Alert.alert('Error', 'Failed to update target');
    } finally {
      setLoading(false);
    }
  };

  // Goal editing
  const openGoalEditor = () => {
    if (goal) {
      setGoalForm({
        title: goal.title || '',
        description: goal.description || '',
        targetNumber: String((goal as any).target_number || ''),
        targetDate: goal.target_date || '',
        goalType: (goal as any).goal_type || 'number',
        currentNumber: String((goal as any).current_number || ''),
      });
    }
    setGoalModalVisible(true);
  };

  const saveGoal = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const updates: any = {
        title: goalForm.title,
        description: goalForm.description,
        target_number: parseFloat(goalForm.targetNumber) || 0,
        target_date: goalForm.targetDate || null,
        goal_type: goalForm.goalType,
        current_number: parseFloat(goalForm.currentNumber) || 0,
      };
      // Calculate progress
      if (updates.target_number > 0) {
        updates.progress = Math.min(100, Math.round((updates.current_number / updates.target_number) * 100));
      }

      if (goal) {
        const { error } = await goals.update(goal.id, updates);
        if (error) throw error;
        setGoal({ ...goal, ...updates });
      } else {
        const { data: newGoal, error } = await goals.create(user.id, {
          title: updates.title,
          description: updates.description,
          target_date: updates.target_date,
          target_number: updates.target_number,
        });
        if (error) throw error;
        if (newGoal) {
          // Update with goal_type
          await goals.update(newGoal.id, { goal_type: updates.goal_type, current_number: updates.current_number } as any);
          setGoal({ ...newGoal, ...updates });
        }
      }
      setGoalModalVisible(false);
      Alert.alert('Success', 'Goal updated');
    } catch (err) {
      console.error('Save goal error:', err);
      Alert.alert('Error', 'Failed to update goal');
    } finally {
      setLoading(false);
    }
  };

  // Background cover image
  const pickCoverImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Image upload coming soon for web');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [16, 9],
      });
      if (!result.canceled && result.assets[0] && user) {
        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop();
        const filePath = `${user.id}/cover.${ext}`;
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const coverUrl = urlData.publicUrl + '?t=' + Date.now();
        await profiles.update(user.id, { cover_image_url: coverUrl } as any);
        setProfile({ ...profile!, cover_image_url: coverUrl } as any);
      }
    } catch (err) {
      console.error('Cover image error:', err);
      Alert.alert('Error', 'Failed to upload cover image');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (err) {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Call delete function (implement on backend)
              const { error } = await supabase.functions.invoke('delete-account', {
                body: { userId: user?.id },
              });
              if (error) throw error;
              await logout();
            } catch (err) {
              console.error('Delete account error:', err);
              Alert.alert('Error', 'Failed to delete account');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  return (
    <CosmicBackground>
    <View style={styles.container}>
      <UnicornHeader>
        <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.text.primary }}>Profile</Text>
      </UnicornHeader>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
      {/* Avatar Section with Cover Image */}
      <View style={styles.coverContainer}>
        {(profile as any)?.cover_image_url ? (
          <Image source={{ uri: (profile as any).cover_image_url }} style={styles.coverImage} />
        ) : (
          <LinearGradient
            colors={Colors.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverImage}
          />
        )}
        <TouchableOpacity style={styles.coverEditBtn} onPress={pickCoverImage} activeOpacity={0.7}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Edit Cover</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarEmoji}>{profile?.emoji || '🦄'}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>+</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.displayName}>
          {profile?.display_name || 'Unicorn'}
        </Text>
        {profile?.title && (
          <Text style={styles.title}>{profile.title}</Text>
        )}
        {profile?.company && (
          <Text style={styles.company}>{profile.company}</Text>
        )}
      </View>

      {/* Goal Section */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
          <Text style={styles.sectionTitle}>10x Goal</Text>
          <TouchableOpacity onPress={openGoalEditor} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.brand.primary + '20', borderRadius: 8 }}>
            <Text style={{ color: Colors.brand.primary, fontSize: 13, fontWeight: '700' }}>{goal ? 'Edit' : '+ Set Goal'}</Text>
          </TouchableOpacity>
        </View>
        {goal ? (
          <TouchableOpacity style={styles.goalCard} onPress={openGoalEditor} activeOpacity={0.7}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            {goal.description && (
              <Text style={styles.goalDescription}>{goal.description}</Text>
            )}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min(((goal as any).current_number / ((goal as any).target_number || 100)) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {(goal as any).goal_type === 'dollar' ? '$' : ''}{((goal as any).current_number || 0).toLocaleString()} / {(goal as any).goal_type === 'dollar' ? '$' : ''}{((goal as any).target_number || 0).toLocaleString()}
            </Text>
            {goal.target_date && (
              <Text style={[styles.progressText, { marginTop: 4 }]}>Deadline: {new Date(goal.target_date).toLocaleDateString()}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.goalCard} onPress={openGoalEditor}>
            <Text style={[styles.goalDescription, { textAlign: 'center' }]}>Tap to set your 10x goal</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Daily Compound Target */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Compound Habit</Text>
        <TouchableOpacity
          style={styles.compoundCard}
          onPress={() => setCompoundModalVisible(true)}
          activeOpacity={0.7}
        >
          <View>
            <Text style={styles.compoundLabel}>Daily Target</Text>
            <Text style={styles.compoundValue}>
              {profile?.daily_compound_target || 1} rep{(profile?.daily_compound_target || 1) !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Bio Section */}
      {profile?.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      )}

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        {profile?.email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>
        )}
        {profile?.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
        )}
        {profile?.website && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Website</Text>
            <Text style={styles.infoValue}>{profile.website}</Text>
          </View>
        )}
      </View>

      {/* Social Links */}
      {(profile?.twitter_url || profile?.linkedin_url || profile?.instagram_url) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          {profile?.linkedin_url && (
            <Text style={styles.socialLink}>LinkedIn: {profile.linkedin_url}</Text>
          )}
          {profile?.twitter_url && (
            <Text style={styles.socialLink}>Twitter: {profile.twitter_url}</Text>
          )}
          {profile?.instagram_url && (
            <Text style={styles.socialLink}>Instagram: {profile.instagram_url}</Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setEditModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setSettingsModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Notification Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerButton]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.dangerButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerButton, { marginBottom: Spacing.xxxl }]}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
        >
          <Text style={styles.dangerButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            style={[styles.modal, { paddingTop: insets.top }]}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={saveProfile} disabled={loading}>
                <Text style={[styles.modalSaveText, loading && styles.disabled]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Display Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="Your name"
                value={editForm.displayName}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, displayName: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Company</Text>
              <TextInput
                style={styles.textInput}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="Company name"
                value={editForm.company}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, company: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="Job title"
                value={editForm.title}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, title: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.textInput}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="+1 (555) 123-4567"
                value={editForm.phone}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, phone: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Bio</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="Tell us about yourself"
                value={editForm.bio}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, bio: text })
                }
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Website</Text>
              <TextInput
                style={styles.textInput}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="https://example.com"
                value={editForm.website}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, website: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>LinkedIn URL</Text>
              <TextInput
                style={styles.textInput}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="https://linkedin.com/in/..."
                value={editForm.linkedin}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, linkedin: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Twitter URL</Text>
              <TextInput
                style={styles.textInput}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="https://twitter.com/..."
                value={editForm.twitter}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, twitter: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Instagram URL</Text>
              <TextInput
                style={styles.textInput}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="https://instagram.com/..."
                value={editForm.instagram}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, instagram: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Services Offered (comma-separated)</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="Consulting, Coaching, Development"
                value={editForm.services}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, services: text })
                }
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Industries (comma-separated)</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholderTextColor={Colors.text.tertiary}
                placeholder="Tech, Finance, E-commerce"
                value={editForm.industries}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, industries: text })
                }
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Goal Edit Modal */}
      <Modal visible={goalModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.compoundModal, { width: '90%', maxHeight: '80%' }]}>
            <Text style={styles.compoundModalTitle}>10x Goal</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.goalFormLabel}>Goal Title *</Text>
              <TextInput
                style={styles.goalFormInput}
                placeholder="e.g., $100K Revenue, 1000 Members..."
                placeholderTextColor={Colors.text.tertiary}
                value={goalForm.title}
                onChangeText={(t) => setGoalForm({ ...goalForm, title: t })}
              />
              <Text style={styles.goalFormLabel}>Description</Text>
              <TextInput
                style={[styles.goalFormInput, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="What does achieving this look like?"
                placeholderTextColor={Colors.text.tertiary}
                value={goalForm.description}
                onChangeText={(t) => setGoalForm({ ...goalForm, description: t })}
                multiline
              />
              <Text style={styles.goalFormLabel}>Goal Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.goalTypeBtn, goalForm.goalType === 'dollar' && styles.goalTypeBtnActive]}
                  onPress={() => setGoalForm({ ...goalForm, goalType: 'dollar' })}
                >
                  <Text style={[styles.goalTypeBtnText, goalForm.goalType === 'dollar' && styles.goalTypeBtnTextActive]}>$ Dollar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.goalTypeBtn, goalForm.goalType === 'number' && styles.goalTypeBtnActive]}
                  onPress={() => setGoalForm({ ...goalForm, goalType: 'number' })}
                >
                  <Text style={[styles.goalTypeBtnText, goalForm.goalType === 'number' && styles.goalTypeBtnTextActive]}># Number</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.goalFormLabel}>Target {goalForm.goalType === 'dollar' ? '($)' : '(#)'}</Text>
              <TextInput
                style={styles.goalFormInput}
                placeholder={goalForm.goalType === 'dollar' ? '100000' : '1000'}
                placeholderTextColor={Colors.text.tertiary}
                value={goalForm.targetNumber}
                onChangeText={(t) => setGoalForm({ ...goalForm, targetNumber: t })}
                keyboardType="numeric"
              />
              <Text style={styles.goalFormLabel}>Current Progress</Text>
              <TextInput
                style={styles.goalFormInput}
                placeholder="0"
                placeholderTextColor={Colors.text.tertiary}
                value={goalForm.currentNumber}
                onChangeText={(t) => setGoalForm({ ...goalForm, currentNumber: t })}
                keyboardType="numeric"
              />
              <Text style={styles.goalFormLabel}>Target Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.goalFormInput}
                placeholder="2026-12-31"
                placeholderTextColor={Colors.text.tertiary}
                value={goalForm.targetDate}
                onChangeText={(t) => setGoalForm({ ...goalForm, targetDate: t })}
              />
            </ScrollView>
            <TouchableOpacity style={styles.compoundSaveButton} onPress={saveGoal} disabled={loading || !goalForm.title.trim()}>
              <Text style={styles.compoundSaveButtonText}>Save Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.compoundCancelButton} onPress={() => setGoalModalVisible(false)}>
              <Text style={styles.compoundCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Compound Target Modal */}
      <Modal
        visible={compoundModalVisible}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.compoundModal}>
            <Text style={styles.compoundModalTitle}>Daily Compound Target</Text>
            <Text style={styles.compoundModalSubtitle}>
              How many reps per day?
            </Text>

            <TextInput
              style={styles.compoundInput}
              placeholderTextColor={Colors.text.tertiary}
              placeholder="1"
              value={compoundTarget}
              onChangeText={setCompoundTarget}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={styles.compoundSaveButton}
              onPress={saveCompoundTarget}
              disabled={loading}
            >
              <Text style={styles.compoundSaveButtonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.compoundCancelButton}
              onPress={() => setCompoundModalVisible(false)}
            >
              <Text style={styles.compoundCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={false}
      >
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Notifications</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Daily Reminder</Text>
              <Text style={styles.settingDescription}>Get reminded about your 10x action</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, notifications.dailyReminder && styles.toggleActive]}
              onPress={() =>
                setNotifications({
                  ...notifications,
                  dailyReminder: !notifications.dailyReminder,
                })
              }
            >
              <View
                style={[
                  styles.toggleDot,
                  notifications.dailyReminder && styles.toggleDotActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Achievements</Text>
              <Text style={styles.settingDescription}>Celebrate your wins</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, notifications.achievements && styles.toggleActive]}
              onPress={() =>
                setNotifications({
                  ...notifications,
                  achievements: !notifications.achievements,
                })
              }
            >
              <View
                style={[
                  styles.toggleDot,
                  notifications.achievements && styles.toggleDotActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Messages</Text>
              <Text style={styles.settingDescription}>New direct messages</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, notifications.messages && styles.toggleActive]}
              onPress={() =>
                setNotifications({
                  ...notifications,
                  messages: !notifications.messages,
                })
              }
            >
              <View
                style={[
                  styles.toggleDot,
                  notifications.messages && styles.toggleDotActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Wormhole Updates</Text>
              <Text style={styles.settingDescription}>Key relationship reminders</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, notifications.wormholeUpdates && styles.toggleActive]}
              onPress={() =>
                setNotifications({
                  ...notifications,
                  wormholeUpdates: !notifications.wormholeUpdates,
                })
              }
            >
              <View
                style={[
                  styles.toggleDot,
                  notifications.wormholeUpdates && styles.toggleDotActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
      </ScrollView>
    </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  coverContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  } as any,
  coverEditBtn: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  avatarContainer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: -50,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: Colors.background.elevated,
  },
  avatarEmoji: {
    fontSize: 60,
  },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  editBadgeText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  displayName: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
  },
  title: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  company: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  goalCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  goalTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  goalDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  progressContainer: {
    height: 8,
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.brand.primary,
  },
  progressText: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  compoundCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  compoundLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  compoundValue: {
    ...Typography.h3,
    color: Colors.brand.primary,
    marginTop: Spacing.xs,
  },
  arrowText: {
    color: Colors.text.secondary,
    fontSize: 24,
  },
  bioText: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  infoLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  socialLink: {
    ...Typography.body,
    color: Colors.brand.primary,
    paddingVertical: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.brand.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  primaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.background.elevated,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  secondaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  dangerButton: {
    backgroundColor: Colors.background.elevated,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.status.error,
  },
  dangerButtonText: {
    ...Typography.bodyBold,
    color: Colors.status.error,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalContent: {
    paddingBottom: Spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalCloseText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  modalSaveText: {
    ...Typography.bodyBold,
    color: Colors.brand.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  formGroup: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  formLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Typography.body,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compoundModal: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '80%',
    alignItems: 'center',
  },
  compoundModalTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  compoundModalSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  compoundInput: {
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    width: '100%',
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  compoundSaveButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  compoundSaveButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  compoundCancelButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    width: '100%',
    alignItems: 'center',
  },
  compoundCancelButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.secondary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  settingLabel: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  settingDescription: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.elevated,
    borderWidth: 2,
    borderColor: Colors.border.default,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  toggleActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background.primary,
    alignSelf: 'flex-start',
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  goalFormLabel: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  goalFormInput: {
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    width: '100%',
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    fontSize: 15,
    marginBottom: 12,
  },
  goalTypeBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.input,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  goalTypeBtnActive: {
    backgroundColor: Colors.brand.primary + '30',
    borderColor: Colors.brand.primary,
  },
  goalTypeBtnText: {
    color: Colors.text.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  goalTypeBtnTextActive: {
    color: Colors.brand.primary,
  },
});
