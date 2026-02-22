import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [habit, setHabit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempGoal, setTempGoal] = useState('');
  const [tempHabit, setTempHabit] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.get('/profile');
      setProfile(data.profile);
      setGoal(data.goal);
      setHabit(data.habit);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateName = async () => {
    if (!tempName.trim()) return;
    try {
      await api.put('/profile', { display_name: tempName.trim() });
      setProfile({ ...profile, display_name: tempName.trim() });
      setEditingName(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const updateGoal = async () => {
    if (!tempGoal.trim()) return;
    try {
      await api.put('/goal', { title: tempGoal.trim() });
      setGoal({ ...goal, title: tempGoal.trim() });
      setEditingGoal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const updateHabitTitle = async () => {
    if (!tempHabit.trim()) return;
    try {
      await api.put('/habit', { habit_title: tempHabit.trim() });
      setHabit({ ...habit, habit_title: tempHabit.trim() });
      setEditingHabit(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
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

        {/* Avatar & Name */}
        <View style={styles.profileHeader}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>
              {(profile?.display_name || user?.email || '?')[0]?.toUpperCase()}
            </Text>
          </View>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                testID="edit-name-input"
                style={styles.editInput}
                value={tempName}
                onChangeText={setTempName}
                autoFocus
              />
              <TouchableOpacity testID="save-name-btn" onPress={updateName} style={styles.saveIconBtn}>
                <Ionicons name="checkmark" size={20} color={Colors.status.success} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)} style={styles.saveIconBtn}>
                <Ionicons name="close" size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity testID="edit-name-btn" onPress={() => { setTempName(profile?.display_name || ''); setEditingName(true); }} style={styles.nameRow}>
              <Text style={styles.displayName}>{profile?.display_name || 'Set your name'}</Text>
              <Ionicons name="create-outline" size={16} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Goal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>10x Goal</Text>
            <TouchableOpacity testID="edit-goal-btn" onPress={() => { setTempGoal(goal?.title || ''); setEditingGoal(!editingGoal); }}>
              <Ionicons name={editingGoal ? 'close' : 'create-outline'} size={18} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
          {editingGoal ? (
            <View style={styles.editRow}>
              <TextInput
                testID="edit-goal-input"
                style={[styles.editInput, { flex: 1 }]}
                value={tempGoal}
                onChangeText={setTempGoal}
                autoFocus
              />
              <TouchableOpacity testID="save-goal-btn" onPress={updateGoal} style={styles.saveIconBtn}>
                <Ionicons name="checkmark" size={20} color={Colors.status.success} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.cardValue}>{goal?.title || 'Not set'}</Text>
          )}
          {goal?.description ? <Text style={styles.cardDesc}>{goal.description}</Text> : null}
        </View>

        {/* Compound Habit */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Daily Compound Habit</Text>
            <TouchableOpacity testID="edit-habit-btn" onPress={() => { setTempHabit(habit?.habit_title || ''); setEditingHabit(!editingHabit); }}>
              <Ionicons name={editingHabit ? 'close' : 'create-outline'} size={18} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
          {editingHabit ? (
            <View style={styles.editRow}>
              <TextInput
                testID="edit-habit-input"
                style={[styles.editInput, { flex: 1 }]}
                value={tempHabit}
                onChangeText={setTempHabit}
                autoFocus
              />
              <TouchableOpacity testID="save-habit-btn" onPress={updateHabitTitle} style={styles.saveIconBtn}>
                <Ionicons name="checkmark" size={20} color={Colors.status.success} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.cardValue}>{habit?.habit_title || 'Not set'}</Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Timezone</Text>
          <Text style={styles.cardValue}>{profile?.timezone_str || 'UTC'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Member Since</Text>
          <Text style={styles.cardValue}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
          </Text>
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

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  pageTitle: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.text.primary, marginBottom: 24, letterSpacing: -0.5 },
  profileHeader: { alignItems: 'center', marginBottom: 32 },
  bigAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brand.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  bigAvatarText: { color: Colors.text.primary, fontSize: FontSize.xxxxl, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  displayName: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700' },
  email: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  card: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 20,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border.default,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: Colors.text.tertiary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 4 },
  cardValue: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '600' },
  cardDesc: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  editInput: {
    backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 12,
    color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.active, flex: 1,
  },
  saveIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bg.input, justifyContent: 'center', alignItems: 'center' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: 16, marginTop: 20,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  logoutText: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Radius.lg, padding: 16, marginTop: 12,
    borderWidth: 1, borderColor: Colors.status.error,
  },
  deleteBtnText: { color: Colors.status.error, fontSize: FontSize.base, fontWeight: '600' },
});
