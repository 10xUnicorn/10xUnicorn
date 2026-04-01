/**
 * UnicornHeader — Shared status bar header with logo
 * Pulsing purple glow effect on the unicorn logo
 */

import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, Easing, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';

interface Props {
  children?: React.ReactNode;
}

export default function UnicornHeader({ children }: Props) {
  const insets = useSafeAreaInsets();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Soft purple glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    // Gentle scale breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.06,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  // Always purple glow
  const glowColor = '#A855F7';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Logo area */}
      <View style={styles.headerRow}>
        <View style={styles.logoArea}>
          {/* Glow behind logo */}
          <Animated.View
            style={[
              styles.logoGlow,
              {
                backgroundColor: glowColor,
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 0.4],
                }),
                transform: [{
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                }],
              },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Image
              source={require('../../assets/images/corner-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Right side content slot (title, buttons, etc) */}
        <View style={styles.headerContent}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  logoArea: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  headerContent: {
    flex: 1,
  },
});
