/**
 * ROOT LAYOUT REPLACEMENT — Copy this content into app/_layout.tsx
 *
 * Changes from original:
 * 1. Added WebShell wrapper for desktop sidebar navigation
 * 2. Split into RootLayoutInner (needs auth context) and RootLayout (provides context)
 * 3. Added Platform-aware animation setting for web
 */

import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { WebShell } from '../src/components/web';

function RootLayoutInner() {
  const { user } = useAuth();

  return (
    <WebShell
      userName={user?.displayName || user?.name || undefined}
      userEmoji={user?.emoji || undefined}
      points={0}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#050505' },
          animation: Platform.OS === 'web' ? 'none' : 'default',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="ai-chat" options={{ presentation: 'modal' }} />
      </Stack>
    </WebShell>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootLayoutInner />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
