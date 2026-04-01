/**
 * CosmicBackground — Galactic animated background
 * Deep space gradient, nebula clouds, twinkling stars, floating orbs
 * Rainbow shimmer bar at top. Fully native-driver animated.
 * ENHANCED: Warp speed zoom, maroon/burgundy stars, sacred geometry, constellation patterns
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Easing, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Nebula clouds — large diffused color patches
const NEBULAE = [
  { size: 300, x: -80, y: -30, color: '#7F00FF', delay: 0 },
  { size: 260, x: width - 100, y: 120, color: '#1a0a4e', delay: 600 },
  { size: 340, x: -40, y: height * 0.4, color: '#2a0a3e', delay: 300 },
  { size: 220, x: width - 140, y: height * 0.55, color: '#0a1a3e', delay: 900 },
  { size: 280, x: 40, y: height * 0.75, color: '#1a003e', delay: 500 },
  { size: 200, x: width - 60, y: height * 0.85, color: '#0d0a2e', delay: 1200 },
];

// Floating orbs — smaller, brighter accent
const ORBS = [
  { size: 120, x: width * 0.7, y: 80, color: '#A855F7', delay: 0 },
  { size: 90, x: 20, y: 280, color: '#06B6D4', delay: 400 },
  { size: 140, x: width * 0.3, y: height * 0.5, color: '#E040FB', delay: 800 },
  { size: 80, x: width - 60, y: height * 0.35, color: '#7F00FF', delay: 200 },
  { size: 100, x: width * 0.5, y: height * 0.7, color: '#B915CC', delay: 600 },
  { size: 70, x: 60, y: height * 0.85, color: '#06B6D4', delay: 1000 },
];

// Maroon and burgundy color palette
const MAROON_COLORS = ['#5C0A0A', '#800020', '#8B0000', '#722F37'];

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  delay: number;
  color: string;
}

interface SacredGeometryShape {
  x: number;
  y: number;
  size: number;
  type: 'circle' | 'hexagon' | 'triangle';
  color: string;
  delay: number;
}

interface Constellation {
  name: string;
  dots: Array<{ x: number; y: number }>;
  startX: number;
  startY: number;
  color: string;
  delay: number;
}

// Star field — tiny dots scattered across screen with maroon/burgundy integration
function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  // Seed-like approach using index for consistent placement
  for (let i = 0; i < count; i++) {
    const seed = (i * 7919 + 104729) % 100000;
    const isMaroon = i < 18; // 15-20 maroon/burgundy stars
    const color = isMaroon ? MAROON_COLORS[i % MAROON_COLORS.length] : '#ffffff';
    stars.push({
      x: (seed % 1000) / 1000 * width,
      y: ((seed * 31) % 1000) / 1000 * height,
      size: 1 + (seed % 3),
      brightness: 0.3 + (seed % 70) / 100,
      delay: (seed % 2000),
      color,
    });
  }
  return stars;
}

// Sacred geometry patterns — circles, hexagons, triangles with subtle rotation
function generateSacredGeometry(): SacredGeometryShape[] {
  const shapes: SacredGeometryShape[] = [];

  // Circle patterns (Flower of Life-ish)
  shapes.push({
    x: width * 0.2,
    y: height * 0.3,
    size: 280,
    type: 'circle',
    color: '#5C0A0A',
    delay: 0,
  });

  // Hexagon
  shapes.push({
    x: width * 0.75,
    y: height * 0.2,
    size: 200,
    type: 'hexagon',
    color: '#9C27B0',
    delay: 300,
  });

  // Triangle
  shapes.push({
    x: width * 0.5,
    y: height * 0.65,
    size: 220,
    type: 'triangle',
    color: '#722F37',
    delay: 600,
  });

  // Second circle
  shapes.push({
    x: width * 0.85,
    y: height * 0.65,
    size: 240,
    type: 'circle',
    color: '#800020',
    delay: 900,
  });

  return shapes;
}

// Constellation patterns — groupings of stars in recognizable shapes
function generateConstellations(): Constellation[] {
  return [
    {
      name: 'unicorn-horn',
      dots: [
        { x: 0, y: 0 },
        { x: 15, y: -20 },
        { x: 20, y: -45 },
        { x: 18, y: -70 },
        { x: 8, y: -85 },
      ],
      startX: width * 0.25,
      startY: height * 0.15,
      color: '#FFD700',
      delay: 0,
    },
    {
      name: 'cosmic-triangle',
      dots: [
        { x: 0, y: 0 },
        { x: 40, y: 10 },
        { x: 20, y: 50 },
      ],
      startX: width * 0.65,
      startY: height * 0.5,
      color: '#00FF9D',
      delay: 200,
    },
    {
      name: 'spiral-cluster',
      dots: [
        { x: 0, y: 0 },
        { x: 12, y: 8 },
        { x: 18, y: -5 },
        { x: 8, y: -15 },
      ],
      startX: width * 0.1,
      startY: height * 0.7,
      color: '#FF4B6E',
      delay: 400,
    },
  ];
}

interface Props {
  children: React.ReactNode;
}

function NebulaCloud({ size, x, y, color, delay }: typeof NEBULAE[0]) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 6000 + delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 6000 + delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.08, 0.18, 0.08],
        }),
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -15],
            }),
          },
          {
            scale: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.1, 1],
            }),
          },
        ],
      }}
    />
  );
}

function FloatingOrb({ size, x, y, color, delay }: typeof ORBS[0]) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 4000 + delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 4000 + delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.03, 0.09, 0.03],
        }),
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -25],
            }),
          },
          {
            scale: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.2, 1],
            }),
          },
        ],
      }}
    />
  );
}

function TwinklingStar({ x, y, size, brightness, delay, color }: Star) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1500 + delay % 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1500 + delay % 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [brightness * 0.3, brightness, brightness * 0.3],
        }),
      }}
    />
  );
}

function SacredGeometryRenderer({ x, y, size, type, color, delay }: SacredGeometryShape) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    ).start();
  }, []);

  const renderGeometry = () => {
    if (type === 'circle') {
      // Nested circles (Flower of Life inspired)
      return (
        <View style={{ position: 'relative', width: size, height: size }}>
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 1,
              borderColor: color,
              left: 0,
              top: 0,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: size * 0.3,
              borderWidth: 1,
              borderColor: color,
              left: size * 0.2,
              top: size * 0.2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              borderWidth: 1,
              borderColor: color,
              left: size * 0.35,
              top: size * 0.35,
            }}
          />
        </View>
      );
    }

    if (type === 'hexagon') {
      return (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderWidth: 1,
            borderColor: color,
            left: 0,
            top: 0,
            transform: [{ skewY: '30deg' }],
          }}
        />
      );
    }

    if (type === 'triangle') {
      return (
        <View
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: size / 2,
            borderRightWidth: size / 2,
            borderBottomWidth: size,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            left: 0,
            top: 0,
          }}
        />
      );
    }
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        opacity: 0.05,
        transform: [
          {
            rotate: rotateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            }),
          },
        ],
      }}
    >
      {renderGeometry()}
    </Animated.View>
  );
}

function ConstellationDots({ dots, startX, startY, color, delay }: Omit<Constellation, 'name'>) {
  const dotAnims = useMemo(() => dots.map(() => new Animated.Value(0)), [dots.length]);

  useEffect(() => {
    const staggeredSequence = dots.map((_, idx) =>
      Animated.sequence([
        Animated.delay(delay + idx * 300),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dotAnims[idx], {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(dotAnims[idx], {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: Platform.OS !== 'web',
            }),
          ])
        ),
      ])
    );

    staggeredSequence.forEach((anim) => anim.start());
  }, []);

  return (
    <View style={{ position: 'absolute', left: startX, top: startY }}>
      {dots.map((dot, idx) => (
        <Animated.View
          key={`dot${idx}`}
          style={{
            position: 'absolute',
            left: dot.x,
            top: dot.y,
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: color,
            opacity: dotAnims[idx].interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.3, 1, 0.3],
            }),
          }}
        />
      ))}
    </View>
  );
}

export default function CosmicBackground({ children }: Props) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const warpZoomAnim = useRef(new Animated.Value(0)).current;
  const stars = useMemo(() => generateStars(50), []);
  const geometry = useMemo(() => generateSacredGeometry(), []);
  const constellations = useMemo(() => generateConstellations(), []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(warpZoomAnim, {
          toValue: 1,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(warpZoomAnim, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Deep space gradient */}
      <LinearGradient
        colors={['#050510', '#0a0a20', '#0d0828', '#08051a', '#050510']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Nebula clouds — large diffused color */}
      {NEBULAE.map((nebula, i) => (
        <NebulaCloud key={`n${i}`} {...nebula} />
      ))}

      {/* Warp speed zoom effect wrapper */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              {
                scale: warpZoomAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.5],
                }),
              },
            ],
          },
        ]}
      >
        {/* Star field */}
        {stars.map((star, i) => (
          <TwinklingStar key={`s${i}`} {...star} />
        ))}

        {/* Sacred geometry patterns */}
        {geometry.map((shape, i) => (
          <SacredGeometryRenderer key={`g${i}`} {...shape} />
        ))}

        {/* Constellation patterns */}
        {constellations.map((constellation, i) => (
          <ConstellationDots key={`c${i}`} {...constellation} />
        ))}
      </Animated.View>

      {/* Floating orbs */}
      {ORBS.map((orb, i) => (
        <FloatingOrb key={`o${i}`} {...orb} />
      ))}

      {/* Subtle grid overlay */}
      <Animated.View
        style={[
          styles.gridOverlay,
          {
            opacity: shimmerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.015, 0.04],
            }),
          },
        ]}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <View
            key={`h${i}`}
            style={[styles.gridLine, styles.gridHorizontal, { top: (height / 10) * i }]}
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`v${i}`}
            style={[styles.gridLine, styles.gridVertical, { left: (width / 6) * i }]}
          />
        ))}
      </Animated.View>

      {/* Rainbow shimmer bar at very top */}
      <Animated.View
        style={[
          styles.topShimmer,
          {
            opacity: shimmerAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.4, 0.8, 0.4],
            }),
          },
        ]}
      >
        <LinearGradient
          colors={['#A855F7', '#06B6D4', '#E040FB', '#FFB800', '#00FF9D', '#FF4B6E', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#A855F7',
  },
  gridHorizontal: {
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  gridVertical: {
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  topShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 20,
  },
  content: {
    flex: 1,
    zIndex: 5,
  },
});
