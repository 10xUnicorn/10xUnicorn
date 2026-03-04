import React from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { Colors, FontSize, Radius, DETERMINATION_EMOJIS } from '../constants/theme';

interface DeterminationSliderProps {
  value: number;
  onChange: (value: number) => void;
  testID?: string;
}

const SLIDER_WIDTH = Dimensions.get('window').width - 80;
const THUMB_SIZE = 32;

export function DeterminationSlider({ value, onChange, testID }: DeterminationSliderProps) {
  const animatedValue = React.useRef(new Animated.Value((value / 10) * SLIDER_WIDTH)).current;
  const currentValue = React.useRef(value);
  
  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: (value / 10) * SLIDER_WIDTH,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    currentValue.current = value;
  }, [value]);

  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {},
    onPanResponderMove: (_, gestureState) => {
      const newX = Math.max(0, Math.min(SLIDER_WIDTH, (currentValue.current / 10) * SLIDER_WIDTH + gestureState.dx));
      animatedValue.setValue(newX);
    },
    onPanResponderRelease: (_, gestureState) => {
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
  }), [onChange]);

  const emoji = DETERMINATION_EMOJIS[value] || '🔥';
  
  // Gradient colors based on value
  const getTrackColor = () => {
    if (value <= 2) return Colors.text.tertiary;
    if (value <= 4) return Colors.status.warning;
    if (value <= 6) return '#F97316'; // Orange
    if (value <= 9) return Colors.brand.primary;
    return Colors.brand.secondary; // Magenta for 10
  };

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.bigEmoji}>{emoji}</Text>
      <Text style={styles.valueText}>{value}/10</Text>
      
      <View style={styles.sliderContainer}>
        <View style={styles.track}>
          <Animated.View 
            style={[
              styles.filledTrack, 
              { 
                width: animatedValue,
                backgroundColor: getTrackColor(),
              }
            ]} 
          />
          <View style={styles.trackMarkers}>
            {Array.from({ length: 11 }).map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.marker,
                  i <= value && { backgroundColor: Colors.text.primary, opacity: 0.7 }
                ]} 
              />
            ))}
          </View>
        </View>
        
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.thumb,
            {
              transform: [{ translateX: Animated.subtract(animatedValue, THUMB_SIZE / 2) }],
              backgroundColor: getTrackColor(),
            },
          ]}
        >
          <View style={styles.thumbInner} />
        </Animated.View>
      </View>
      
      <View style={styles.labelRow}>
        <Text style={styles.labelEmoji}>😴</Text>
        <Text style={styles.labelEmoji}>🦄</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  bigEmoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  valueText: {
    fontSize: FontSize.lg,
    color: Colors.text.secondary,
    fontWeight: '600',
    marginBottom: 20,
  },
  sliderContainer: {
    width: SLIDER_WIDTH,
    height: 48,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  filledTrack: {
    height: '100%',
    borderRadius: Radius.full,
  },
  trackMarkers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  marker: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.default,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  thumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.text.primary,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SLIDER_WIDTH,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  labelEmoji: {
    fontSize: 20,
  },
});
