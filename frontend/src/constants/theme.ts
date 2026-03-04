export const Colors = {
  bg: {
    default: '#0a0a1a',      // Deep space navy
    card: '#12122a',          // Slightly lighter navy for cards
    input: '#1a1a35',         // Input fields
    overlay: 'rgba(10,10,26,0.9)',
    elevated: '#1e1e40',
    gradient: {
      start: '#0f0f23',
      end: '#1a0a2e',
    },
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    inverse: '#0a0a1a',
  },
  brand: {
    primary: '#A855F7',       // Electric purple
    secondary: '#D946EF',     // Magenta/pink
    accent: '#06B6D4',        // Cyan/teal
    red: '#EF4444',           // Red for 10x branding
    glow: 'rgba(168, 85, 247, 0.4)',
    glowStrong: 'rgba(168, 85, 247, 0.6)',
  },
  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
  },
  border: {
    default: '#2D2D50',
    active: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.3)',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  xxxxl: 36,
  hero: 48,
};

export const STATUS_LABELS: Record<string, string> = {
  ready: 'Ready',
  priority_win: 'Priority Win',
  unicorn_win: 'Unicorn Win',
  loss: 'Loss',
  lesson: 'Lesson',
  course_corrected: 'Course Corrected',
};

export const STATUS_COLORS: Record<string, string> = {
  ready: Colors.text.secondary,
  priority_win: Colors.status.success,
  unicorn_win: Colors.brand.primary,
  loss: Colors.status.error,
  lesson: Colors.status.warning,
  course_corrected: Colors.status.info,
};

// 0-2 → 😴, 3-4 → 😐, 5-6 → 😤, 7-9 → 🔥, 10 → 🦄
export const DETERMINATION_EMOJIS: Record<number, string> = {
  0: '😴', 1: '😴', 2: '😴',
  3: '😐', 4: '😐',
  5: '😤', 6: '😤',
  7: '🔥', 8: '🔥', 9: '🔥',
  10: '🦄'
};

// Updated Five Core Actions
export const FIVE_CORE_ACTIONS = [
  { key: 'top_action', label: 'Top 10x Action Item', icon: 'rocket' },
  { key: 'meditation', label: '7-Minute Future Self Meditation', icon: 'leaf' },
  { key: 'wormhole', label: 'Wormhole Relationship', icon: 'planet' },
  { key: 'distractions', label: 'Avoid Distractions', icon: 'shield-checkmark' },
  { key: 'plan_tomorrow', label: 'Plan the Next Day Ahead of Time', icon: 'calendar' },
];
