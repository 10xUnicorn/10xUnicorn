/**
 * Rejected Screen — account_status = 'rejected'
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing, BorderRadius } from '../../src/constants/theme';

export default function RejectedScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.status.error + '15' }]}>
          <Ionicons name="close-circle-outline" size={48} color={Colors.status.error} />
        </View>
        <Text style={styles.title}>Application Not Approved</Text>
        <Text style={styles.message}>
          Unfortunately your application wasn't approved at this time. If you think this was a mistake, reach out to us.
        </Text>
        <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('mailto:daniel@unicornuniverse.io')}>
          <Ionicons name="mail" size={18} color={Colors.brand.primary} />
          <Text style={styles.contactText}>Contact Support</Text>
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
  iconCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text.primary, marginBottom: 12 },
  message: { fontSize: 15, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: Colors.brand.primary, marginBottom: 12 },
  contactText: { color: Colors.brand.primary, fontWeight: '600', fontSize: 14 },
  logoutBtn: { paddingVertical: 12 },
  logoutText: { color: Colors.text.tertiary, fontSize: 14 },
});
