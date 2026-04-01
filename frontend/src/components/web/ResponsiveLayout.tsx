/**
 * ResponsiveLayout — Provides responsive layout patterns for screens
 *
 * Patterns:
 * - 'single': Full-width content (default, same as mobile)
 * - 'two-column': Left panel (60%) + Right panel (40%) on desktop, stacked on mobile
 * - 'master-detail': Left list (35%) + Right detail (65%) on desktop, full-width list on mobile
 * - 'three-column': Left (25%) + Center (50%) + Right (25%) on desktop
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

type LayoutPattern = 'single' | 'two-column' | 'master-detail' | 'three-column';

interface ResponsiveLayoutProps {
  pattern?: LayoutPattern;
  children: React.ReactNode;
  /** Right panel content for two-column or master-detail */
  rightPanel?: React.ReactNode;
  /** Left panel content for three-column */
  leftPanel?: React.ReactNode;
  /** Whether to show the right panel on desktop (for master-detail when no item selected) */
  showRightPanel?: boolean;
  /** Custom width ratios [left, right] as percentages */
  ratio?: [number, number];
  /** Max width for content area on wide screens */
  maxContentWidth?: number;
  /** Gap between columns */
  gap?: number;
  /** Whether right panel scrolls independently */
  rightPanelScrollable?: boolean;
}

export default function ResponsiveLayout({
  pattern = 'single',
  children,
  rightPanel,
  leftPanel,
  showRightPanel = true,
  ratio,
  maxContentWidth = 1600,
  gap = 16,
  rightPanelScrollable = true,
}: ResponsiveLayoutProps) {
  const { isDesktop, isWeb } = useResponsive();

  // On native or mobile web, always use single column
  if (!isWeb || !isDesktop || pattern === 'single') {
    return (
      <View style={styles.container}>
        {children}
      </View>
    );
  }

  // Desktop layouts
  if (pattern === 'two-column') {
    const [leftRatio, rightRatio] = ratio || [60, 40];
    return (
      <View style={[styles.desktopContainer, { maxWidth: maxContentWidth }]}>
        <View style={[styles.column, { flex: leftRatio, marginRight: gap }]}>
          {children}
        </View>
        {rightPanel && (
          <View style={[styles.column, styles.rightColumn, { flex: rightRatio }]}>
            {rightPanelScrollable ? (
              <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator={false}>
                {rightPanel}
              </ScrollView>
            ) : (
              rightPanel
            )}
          </View>
        )}
      </View>
    );
  }

  if (pattern === 'master-detail') {
    const [leftRatio, rightRatio] = ratio || [35, 65];
    return (
      <View style={[styles.desktopContainer, { maxWidth: maxContentWidth }]}>
        <View style={[styles.column, styles.masterColumn, { flex: leftRatio, marginRight: gap }]}>
          {children}
        </View>
        {showRightPanel && rightPanel && (
          <View style={[styles.column, styles.detailColumn, { flex: rightRatio }]}>
            {rightPanelScrollable ? (
              <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator={false}>
                {rightPanel}
              </ScrollView>
            ) : (
              rightPanel
            )}
          </View>
        )}
      </View>
    );
  }

  if (pattern === 'three-column') {
    return (
      <View style={[styles.desktopContainer, { maxWidth: maxContentWidth }]}>
        {leftPanel && (
          <View style={[styles.column, { flex: 25, marginRight: gap }]}>
            <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator={false}>
              {leftPanel}
            </ScrollView>
          </View>
        )}
        <View style={[styles.column, { flex: 50, marginRight: leftPanel ? gap : 0 }]}>
          {children}
        </View>
        {rightPanel && (
          <View style={[styles.column, styles.rightColumn, { flex: 25 }]}>
            {rightPanelScrollable ? (
              <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator={false}>
                {rightPanel}
              </ScrollView>
            ) : (
              rightPanel
            )}
          </View>
        )}
      </View>
    );
  }

  // Fallback
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 8,
    alignSelf: 'center',
    width: '100%' as any,
  },
  column: {
    height: '100%' as any,
  },
  masterColumn: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    paddingRight: 8,
  },
  detailColumn: {
    paddingLeft: 8,
  },
  rightColumn: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.06)',
    paddingLeft: 16,
  },
  scrollColumn: {
    flex: 1,
  },
});
