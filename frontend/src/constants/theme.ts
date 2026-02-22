export const Colors = {
  bg: {
    default: '#050505',
    card: '#121212',
    input: '#1A1A1A',
    overlay: 'rgba(0,0,0,0.8)',
    elevated: '#1E1E1E',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A1A1AA',
    tertiary: '#52525B',
    inverse: '#000000',
  },
  brand: {
    primary: '#7F00FF',
    secondary: '#9D00FF',
    accent: '#B915CC',
    glow: 'rgba(127, 0, 255, 0.4)',
  },
  status: {
    success: '#00FF9D',
    warning: '#FFD600',
    error: '#FF0055',
    info: '#00B2FF',
  },
  border: {
    default: '#27272A',
    active: '#7F00FF',
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

export const DETERMINATION_EMOJIS = ['😴', '😴', '😐', '😐', '😤', '😤', '🔥', '🔥', '🔥', '🔥', '🦄'];
