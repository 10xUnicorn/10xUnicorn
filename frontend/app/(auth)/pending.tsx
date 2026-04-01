/**
 * Pending Approval Screen
 * Shown when account_status = 'pending'
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';

export default function PendingScreen() {
  const { logout, refreshUser } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="hourglass-outline" size={48} color={Colors.brand.primary} />
        </View>
        <Text style={styles.title}>Pending Approval</Text>
        <Text style={styles.message}>
          Your account is being reviewed by an admin. You'll get access once approved.
        </Text>
        <Text style={styles.submessage}>
          This usually takes less than 24 hours.
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={refreshUser}>
          <Ionicons name="refresh" size={18} color={Colors.brand.primary} />
          <Text style={styles.refreshText}>Check Status</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  card: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, padding: 32, alignItems: 'center', width: '100%', maxWidth: 360, borderWidth: 1, borderColor: Colors.border.default },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.brand.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text.primary, marginBottom: 12 },
  message: { fontSize: 15, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  submessage: { fontSize: 13, color: Colors.text.tertiary, textAlign: 'center', marginBottom: 24 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: Colors.brand.primary, marginBottom: 12 },
  refreshText: { color: Colors.brand.primary, fontWeight: '600', fontSize: 14 },
  logoutBtn: { paddingVertical: 12 },
  logoutText: { color: Colors.text.tertiary, fontSize: 14 },
});
