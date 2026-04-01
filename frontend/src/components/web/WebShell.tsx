/**
 * WebShell — Desktop layout wrapper
 * Desktop: sidebar + main content area
 * Mobile web: just passes through children (bottom tabs handle nav)
 * Native: just passes through children
 */
import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import DesktopSidebar from './DesktopSidebar';

interface WebShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmoji?: string;
  points?: number;
}

export default function WebShell({ children, userName, userEmoji, points }: WebShellProps) {
  const { isDesktop, isWeb } = useResponsive();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // On native or mobile web, just render children directly
  if (!isWeb || !isDesktop) {
    return <>{children}</>;
  }

  // Desktop web: sidebar + content
  return (
    <View style={styles.shell}>
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        userName={userName}
        userEmoji={userEmoji}
        points={points}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#050505',
    height: '100%' as any,
  },
  content: {
    flex: 1,
    overflow: 'hidden' as any,
  },
});
