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
  if (value >= 10) return '🦄';  // Unicorn
  if (value >= 9) return '💎';   // Diamond
  if (value >= 8) return '🔥';   // Fire
  if (value >= 7) return '🐎';   // Horse
  if (value >= 6) return '💪';   // Strong arm
  if (value >= 5) return '😐';   // Neutral face
  if (value >= 4) return '🚲';   // Bicycle
  if (value >= 3) return '🚶';   // Walking
  if (value >= 2) return '🐢';   // Turtle
  return '😴';                    // Sleeping (level 1)
};

const MOTIVATIONAL_QUOTES = {
  // Level 1-3: Low energy - encouraging quotes
  low: [
    "Even small steps forward count. You've got this! 🐢",
    "Today's struggle is tomorrow's strength.",
    "It's okay to start slow. What matters is you started.",
    "Every champion was once a contender who refused to give up.",
    "Rest if you must, but don't quit.",
  ],
  // Level 4-6: Building momentum - motivating quotes
  building: [
    "You're building momentum! Keep pushing! 💪",
    "Discipline is choosing between what you want now and what you want most.",
    "Success is the sum of small efforts repeated daily.",
    "You didn't come this far to only come this far!",
    "Your future self will thank you for showing up today!",
  ],
  // Level 7-9: High energy - fire quotes
  high: [
    "You're on FIRE today! Channel that energy! 🔥",
    "Champions are made in moments like this!",
    "This is where legends are born. Go all in!",
    "You're in the zone! Nothing can stop you now!",
    "Today you prove what you're made of!",
  ],
  // Level 10: Unicorn mode - peak quotes
  unicorn: [
    "UNICORN MODE ACTIVATED! You're unstoppable! 🦄",
    "10/10 energy! The universe is aligning for you!",
    "This is YOUR day. Make it legendary!",
    "You're operating at peak performance. Let's GO!",
    "Unicorn level determination! Sky's the limit!",
  ],
};

const getQuoteForLevel = (level: number) => {
  let quotes: string[];
  if (level <= 3) {
    quotes = MOTIVATIONAL_QUOTES.low;
  } else if (level <= 6) {
    quotes = MOTIVATIONAL_QUOTES.building;
  } else if (level <= 9) {
    quotes = MOTIVATIONAL_QUOTES.high;
  } else {
    quotes = MOTIVATIONAL_QUOTES.unicorn;
  }
  return quotes[Math.floor(Math.random() * quotes.length)];
};

export function DeterminationSlider({ value, onChange, testID }: DeterminationSliderProps) {
  const animatedValue = useRef(new Animated.Value((value / 10) * SLIDER_WIDTH)).current;
  const currentValue = useRef(value);
  const isDragging = useRef(false);
  const [quote, setQuote] = useState(() => getQuoteForLevel(value));
  
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
    // Update quote when value changes
    setQuote(getQuoteForLevel(value));
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
