/**
 * Tab Navigator Layout — (tabs)/_layout.tsx
 * 5 visible tabs + 4 hidden tabs
 * Visible:
 * - today (Daily) → flash icon
 * - dashboard (Dashboard) → bar-chart icon
 * - community (Community) → trophy icon
 * - crm (CRM) → planet icon
 * - profile (Profile) → person icon
 * Hidden (tabBarButton: () => null):
 * - signals
 * - deals
 * - wormhole
 * - messages
 */

import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/theme';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function TabsLayout() {
  const { isDesktop, isWeb } = useResponsive();
  const hideTabBar = isWeb && isDesktop;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brand.primary,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarLabelStyle: { fontSize: 10 },
        tabBarStyle: hideTabBar
          ? ({ display: 'none' as const, height: 0 })
          : [
              styles.tabBar,
              {
                backgroundColor: Colors.background.primary,
                borderTopColor: Colors.border.default,
              },
            ],
      }}
    >
      {/* Today Tab */}
      <Tabs.Screen
        name="today"
        options={{
          title: 'Daily',
          tabBarIcon: ({ color }) => <Ionicons name="flash" size={24} color={color} />,
        }}
      />

      {/* CRM Tab */}
      <Tabs.Screen
        name="crm"
        options={{
          title: 'CRM',
          tabBarIcon: ({ color }) => <Ionicons name="planet" size={24} color={color} />,
        }}
      />

      {/* Community Tab */}
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <Ionicons name="trophy" size={22} color={color} />,
        }}
      />

      {/* Dashboard Tab */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <Ionicons name="bar-chart" size={22} color={color} />,
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />

      {/* Hidden Tabs — fully removed from tab bar */}
      <Tabs.Screen
        name="signals"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />

      <Tabs.Screen
        name="deals"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />

      <Tabs.Screen
        name="wormhole"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />

      <Tabs.Screen
        name="messages"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 85,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
});
