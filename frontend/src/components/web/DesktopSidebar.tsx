/**
 * DesktopSidebar — Desktop web navigation sidebar
 * Replaces bottom tabs on screens >= 1024px
 * Collapsible: icon-only (60px) or expanded (240px)
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';

interface NavItem {
  name: string;
  route: string;
  icon: string;
  activeIcon: string;
  section?: 'main' | 'tools' | 'settings';
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Daily', route: '/(tabs)/today', icon: 'flash-outline', activeIcon: 'flash', section: 'main' },
  { name: 'CRM', route: '/(tabs)/crm', icon: 'planet-outline', activeIcon: 'planet', section: 'main' },
  { name: 'Dashboard', route: '/(tabs)/dashboard', icon: 'bar-chart-outline', activeIcon: 'bar-chart', section: 'main' },
  { name: 'Community', route: '/(tabs)/community', icon: 'trophy-outline', activeIcon: 'trophy', section: 'main' },
  { name: 'Signals', route: '/(tabs)/signals', icon: 'flash-outline', activeIcon: 'flash', section: 'tools' },
  { name: 'Deals', route: '/(tabs)/deals', icon: 'briefcase-outline', activeIcon: 'briefcase', section: 'tools' },
  { name: 'Wormhole', route: '/(tabs)/wormhole', icon: 'link-outline', activeIcon: 'link', section: 'tools' },
  { name: 'Messages', route: '/(tabs)/messages', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', section: 'tools' },
  { name: 'AI Chat', route: '/ai-chat', icon: 'sparkles-outline', activeIcon: 'sparkles', section: 'tools' },
  { name: 'Profile', route: '/(tabs)/profile', icon: 'person-outline', activeIcon: 'person', section: 'settings' },
];

interface DesktopSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  userName?: string;
  userEmoji?: string;
  points?: number;
}

export default function DesktopSidebar({ collapsed = false, onToggle, userName, userEmoji, points }: DesktopSidebarProps) {
  const pathname = usePathname();

  const isActive = (route: string) => {
    // Match exact route or check if pathname starts with the route path
    const routePath = route.replace('/(tabs)/', '/');
    return pathname === routePath || pathname.startsWith(routePath + '/');
  };

  const navigate = (route: string) => {
    router.push(route as any);
  };

  const renderSection = (title: string, section: 'main' | 'tools' | 'settings') => {
    const items = NAV_ITEMS.filter(item => item.section === section);
    return (
      <View key={section}>
        {!collapsed && (
          <Text style={styles.sectionLabel}>{title}</Text>
        )}
        {items.map((item) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.navItem,
                active && styles.navItemActive,
                collapsed && styles.navItemCollapsed,
              ]}
              onPress={() => navigate(item.route)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
            >
              <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                <Ionicons
                  name={(active ? item.activeIcon : item.icon) as any}
                  size={20}
                  color={active ? '#A855F7' : '#9CA3AF'}
                />
              </View>
              {!collapsed && (
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.name}
                </Text>
              )}
              {active && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      {/* Logo / Brand */}
      <TouchableOpacity style={styles.brand} onPress={onToggle}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        {!collapsed && (
          <View style={styles.brandText}>
            <Text style={styles.brandName}>10xUnicorn</Text>
            <Text style={styles.brandSub}>Dashboard</Text>
          </View>
        )}
        <Ionicons
          name={collapsed ? 'chevron-forward' : 'chevron-back'}
          size={16}
          color="#6B7280"
          style={!collapsed ? { marginLeft: 'auto' } : undefined}
        />
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Navigation Sections */}
      <View style={styles.nav}>
        {renderSection('NAVIGATE', 'main')}
        <View style={styles.sectionDivider} />
        {renderSection('TOOLS', 'tools')}
        <View style={styles.sectionDivider} />
        {renderSection('ACCOUNT', 'settings')}
      </View>

      {/* User / Points Footer */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        {!collapsed ? (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{userEmoji || '🦄'}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{userName || 'Unicorn'}</Text>
              <Text style={styles.userPoints}>{points || 0} pts today</Text>
            </View>
          </View>
        ) : (
          <View style={styles.userAvatarSmall}>
            <Text style={styles.userAvatarText}>{userEmoji || '🦄'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#0A0A0F',
    borderRightWidth: 1,
    borderRightColor: 'rgba(168, 85, 247, 0.1)',
    paddingVertical: 16,
    justifyContent: 'flex-start',
    height: '100%' as any,
  },
  sidebarCollapsed: {
    width: 68,
    alignItems: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 28,
    height: 28,
  },
  brandText: {
    marginLeft: 12,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginVertical: 6,
    marginHorizontal: 20,
  },
  nav: {
    flex: 1,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 10,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginHorizontal: 8,
  },
  navIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconWrapActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  navLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 12,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%' as any,
    width: 3,
    height: '50%' as any,
    backgroundColor: '#A855F7',
    borderRadius: 2,
  },
  footer: {
    paddingBottom: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
  },
  userAvatarText: {
    fontSize: 18,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userPoints: {
    fontSize: 11,
    color: '#A855F7',
    marginTop: 1,
  },
});
