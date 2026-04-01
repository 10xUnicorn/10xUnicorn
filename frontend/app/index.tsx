/**
 * Optimized Splash / Router Screen — index.tsx
 * Nearly instant loading: white background, static glow, minimal animations
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [readyToNavigate, setReadyToNavigate] = useState(false);

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // ── Minimal animation sequence ──
    Animated.sequence([
      // Phase 1: Logo appears instantly (100ms opacity fade)
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: Platform.OS !== 'web',
      }),

      // Phase 2: Hold for only 100ms
      Animated.delay(100),
    ]).start(() => {
      setReadyToNavigate(true);
    });

    return () => {};
  }, []);

  // Navigate once animation + auth resolves
  useEffect(() => {
    if (!readyToNavigate || loading) return;

    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 150,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      if (!user) {
        router.replace('/(auth)/login');
      } else if (user.accountStatus === 'pending') {
        router.replace('/(auth)/pending');
      } else if (user.accountStatus === 'rejected') {
        router.replace('/(auth)/rejected');
      } else if (user.accountStatus === 'deactivated') {
        router.replace('/(auth)/deactivated');
      } else if (!user.onboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/today');
      }
    });
  }, [readyToNavigate, loading, user, router]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut, backgroundColor: '#FFFFFF' }]}>
      {/* Static purple glow orb behind logo */}
      <View style={styles.glowOrb} />

      {/* Static outer ring */}
      <View style={styles.glowRing} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
          },
        ]}
      >
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Loading dots - static opacity */}
      <View style={styles.loadingDots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Static purple glow orb behind logo
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#A855F7',
    opacity: 0.25,
  },

  // Static outer ring
  glowRing: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 2,
    borderColor: '#A855F7',
    backgroundColor: 'transparent',
    opacity: 0.15,
  },

  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle shadow for depth on white bg
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  logoImage: {
    width: 200,
    height: 200,
  },

  // Loading dots
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 80,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A855F7',
    opacity: 0.6,
  },
});
