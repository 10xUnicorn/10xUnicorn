import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface DeterminationSliderProps {
  value: number;
  onChange: (value: number) => void;
  testID?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SLIDER_WIDTH = Dimensions.get('window').width - 80;
const THUMB_SIZE = 44;

// Determination level emojis: 1-7 = 🔥, 8 = 🔥, 9 = 💎, 10 = 🦄
const getEmoji = (value: number) => {
  if (value >= 10) return '🦄';
  if (value >= 9) return '💎';
  return '🔥';
};

const getInspirationMessage = (value: number) => {
  if (value >= 8) return null;
  const messages = [
    "You're showing up - that's what matters! 💪",
    "Every step forward counts. Keep going!",
    "The unicorn is within you. Time to let it out! 🦄",
    "Small progress is still progress. You've got this!",
    "Today is a new opportunity. Rise up!",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

export function DeterminationSlider({ value, onChange, testID, collapsed = false, onToggleCollapse }: DeterminationSliderProps) {
  const animatedValue = useRef(new Animated.Value((value / 10) * SLIDER_WIDTH)).current;
  const currentValue = useRef(value);
  const isDragging = useRef(false);
  
  React.useEffect(() => {
    if (!isDragging.current) {
      Animated.spring(animatedValue, {
        toValue: (value / 10) * SLIDER_WIDTH,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
    }
    currentValue.current = value;
  }, [value]);

  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: () => {
      isDragging.current = true;
    },
    onPanResponderMove: (_, gestureState) => {
      const newX = Math.max(0, Math.min(SLIDER_WIDTH, (currentValue.current / 10) * SLIDER_WIDTH + gestureState.dx));
      animatedValue.setValue(newX);
    },
    onPanResponderRelease: (_, gestureState) => {
      isDragging.current = false;
      const newX = Math.max(0, Math.min(SLIDER_WIDTH, (currentValue.current / 10) * SLIDER_WIDTH + gestureState.dx));
      const newValue = Math.round((newX / SLIDER_WIDTH) * 10);
      currentValue.current = newValue;
      onChange(newValue);
      
      Animated.spring(animatedValue, {
        toValue: (newValue / 10) * SLIDER_WIDTH,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
    },
    onPanResponderTerminationRequest: () => false,
  }), [onChange]);

  const emoji = getEmoji(value);
  const inspiration = getInspirationMessage(value);
  
  // Collapsed view - just shows emoji, value, and check-in button
  if (collapsed) {
    return (
      <TouchableOpacity 
        testID={testID}
        style={styles.collapsedContainer}
        onPress={onToggleCollapse}
        activeOpacity={0.8}
      >
        <View style={styles.collapsedContent}>
          <Text style={styles.collapsedEmoji}>{emoji}</Text>
          <View style={styles.collapsedTextWrap}>
            <Text style={styles.collapsedValue}>{value}</Text>
            <Text style={styles.collapsedLabel}>Determination</Text>
          </View>
        </View>
        <View style={styles.checkInBtn}>
          <Text style={styles.checkInText}>Check In</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.brand.primary} />
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={styles.container} testID={testID}>
      {/* Header Row with collapse button */}
      <View style={styles.headerRow}>
        <Text style={styles.label}>DETERMINATION LEVEL</Text>
        <View style={styles.headerRight}>
          <View style={styles.valueRow}>
            <Text style={styles.valueEmoji}>{emoji}</Text>
            <Text style={styles.valueText}>{value}</Text>
          </View>
          {onToggleCollapse && (
            <TouchableOpacity onPress={onToggleCollapse} style={styles.collapseBtn}>
              <Ionicons name="chevron-up" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Slider - gesture isolated */}
      <View 
        style={styles.sliderContainer}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
      >
        {/* Track Background with Gradient */}
        <View style={styles.trackBg}>
          <LinearGradient
            colors={['#F59E0B', '#EF4444', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientTrack}
          />
        </View>
        
        {/* Thumb */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.thumb,
            {
              transform: [{ translateX: Animated.subtract(animatedValue, THUMB_SIZE / 2) }],
            },
          ]}
        >
          <Text style={styles.thumbEmoji}>{emoji}</Text>
        </Animated.View>
      </View>
      
      {/* Labels */}
      <View style={styles.labelRow}>
        <View style={styles.labelItem}>
          <Text style={styles.labelEmoji}>😴</Text>
          <Text style={styles.labelText}>Low</Text>
        </View>
        <View style={styles.labelItem}>
          <Text style={styles.labelEmoji}>🦄</Text>
          <Text style={styles.labelText}>Level 10</Text>
        </View>
      </View>
      
      {/* Inspiration message for low determination */}
      {inspiration && (
        <View style={styles.inspirationBanner}>
          <Text style={styles.inspirationText}>{inspiration}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueEmoji: {
    fontSize: 28,
  },
  valueText: {
    fontSize: FontSize.xxl,
    color: Colors.brand.red,
    fontWeight: '900',
  },
  collapseBtn: {
    padding: 4,
  },
  sliderContainer: {
    width: SLIDER_WIDTH,
    height: 56,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.bg.input,
  },
  gradientTrack: {
    flex: 1,
    borderRadius: 6,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.bg.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.border.default,
  },
  thumbEmoji: {
    fontSize: 22,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SLIDER_WIDTH,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelEmoji: {
    fontSize: 14,
  },
  labelText: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
  },
  // Collapsed view styles
  collapsedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collapsedEmoji: {
    fontSize: 32,
  },
  collapsedTextWrap: {},
  collapsedValue: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  collapsedLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginTop: -2,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.brand.primary + '20',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  checkInText: {
    color: Colors.brand.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Inspiration banner
  inspirationBanner: {
    marginTop: 16,
    backgroundColor: Colors.brand.primary + '15',
    borderRadius: Radius.md,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
  },
  inspirationText: {
    color: Colors.text.secondary,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
});
