import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Radius } from '../constants/theme';

interface DeterminationSliderProps {
  value: number;
  onChange: (value: number) => void;
  testID?: string;
}

const SLIDER_WIDTH = Dimensions.get('window').width - 80;
const THUMB_SIZE = 44;

const getEmoji = (value: number) => {
  if (value >= 10) return '🦄';
  if (value >= 9) return '💎';
  return '🔥';
};

const MOTIVATIONAL_QUOTES = [
  "You're building something extraordinary today! 💪",
  "Every step forward counts. Keep pushing!",
  "The unicorn is within you. Let it shine! 🦄",
  "Small progress is still progress. You've got this!",
  "Today is your opportunity to level up!",
  "Champions are made in moments like this!",
  "Your future self will thank you for showing up today!",
  "Discipline is choosing between what you want now and what you want most.",
  "Success is the sum of small efforts repeated daily.",
  "The only bad workout is the one that didn't happen.",
  "Be the person who decides to go for it!",
  "You didn't come this far to only come this far!",
];

export function DeterminationSlider({ value, onChange, testID }: DeterminationSliderProps) {
  const animatedValue = useRef(new Animated.Value((value / 10) * SLIDER_WIDTH)).current;
  const currentValue = useRef(value);
  const isDragging = useRef(false);
  const [quote] = useState(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  
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
  
  return (
    <View style={styles.container} testID={testID}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.label}>DETERMINATION LEVEL</Text>
        <View style={styles.valueRow}>
          <Text style={styles.valueEmoji}>{emoji}</Text>
          <Text style={styles.valueText}>{value}</Text>
        </View>
      </View>
      
      {/* Slider */}
      <View 
        style={styles.sliderContainer}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
      >
        <View style={styles.trackBg}>
          <LinearGradient
            colors={['#F59E0B', '#EF4444', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientTrack}
          />
        </View>
        
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
      
      {/* Always show motivational quote */}
      <View style={styles.quoteBanner}>
        <Text style={styles.quoteText}>{quote}</Text>
      </View>
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
  quoteBanner: {
    marginTop: 16,
    backgroundColor: Colors.brand.primary + '15',
    borderRadius: Radius.md,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
  },
  quoteText: {
    color: Colors.text.secondary,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
