/**
 * 10xUnicorn Design System
 * Source: design_guidelines.json
 * Brand: Electric purple, dark aesthetic, high-performance feel
 */

export const Colors = {
  background: {
    primary: '#0a0a1a',
    secondary: '#121228',
    tertiary: '#1a1a3e',
    card: '#16162e',
    elevated: '#1e1e40',
    input: '#1a1a35',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0CC',
    tertiary: '#6B6B8D',
    muted: '#4A4A6A',
  },
  brand: {
    primary: '#A855F7',      // Electric purple (theme.ts original)
    primaryDark: '#7F00FF',  // Deep violet (design_guidelines)
    secondary: '#B915CC',    // Magenta accent
    cyan: '#06B6D4',         // Cyan accent
    magenta: '#E040FB',
  },
  status: {
    success: '#00FF9D',
    warning: '#FFB800',
    error: '#FF4B6E',
    info: '#00B2FF',
  },
  border: {
    default: '#2a2a4a',
    glow: '#7F00FF33',
    focus: '#A855F733',
  },
  gradient: {
    primary: ['#A855F7', '#7F00FF'],
    warm: ['#FFB800', '#FF4B6E'],
    cool: ['#06B6D4', '#A855F7'],
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  xxxxl: 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  hero: { fontSize: 48, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const },
  captionBold: { fontSize: 14, fontWeight: '600' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  smallBold: { fontSize: 12, fontWeight: '600' as const },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },
};

// ─── Status Labels & Colors ──────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  not_prepared: 'Not Prepared',
  ready: 'Ready',
  stacking_wins: 'Stacking Wins',
  priority_win: 'Priority Win',
  ten_x_unicorn_win: '10x Unicorn Win',
  course_corrected_win: 'Course Corrected Win',
  lesson_win: 'Lesson Win',
  miss: 'Miss',
};

export const STATUS_COLORS: Record<string, string> = {
  not_prepared: Colors.text.tertiary,
  ready: Colors.status.warning,
  stacking_wins: Colors.status.success,
  priority_win: Colors.brand.cyan,
  ten_x_unicorn_win: Colors.brand.magenta,
  course_corrected_win: Colors.status.info,
  lesson_win: '#FFD700',
  miss: Colors.status.error,
};

// ─── Determination Emojis (0–10) ─────────────────────────────────────────────

export const DETERMINATION_EMOJIS: Record<number, string> = {
  1: '☠️', 2: '😴', 3: '😢', 4: '🐢', 5: '🏃', 6: '🚲', 7: '🏎️', 8: '🔥', 9: '💎', 10: '🦄',
};

// ─── Five Core Actions ───────────────────────────────────────────────────────

export const FIVE_CORE_ACTIONS = [
  { key: 'ten_x_action', label: '10x Action', description: 'Biggest, boldest action toward your goal', icon: 'flash' },
  { key: 'future_self', label: 'Future Self', description: 'Journal as your future self', icon: 'telescope' },
  { key: 'compound', label: 'Compound', description: 'Daily compound habit', icon: 'repeat' },
  { key: 'wormhole', label: 'Wormhole', description: 'Activate a key relationship', icon: 'planet' },
  { key: 'signals', label: 'Signals', description: 'Complete revenue-generating actions', icon: 'pulse' },
];

// ─── Contact Types ───────────────────────────────────────────────────────────

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  referral_partner: 'Referral Partner',
  strategic_partner: 'Strategic Partner',
  client: 'Client',
  resource: 'Resource',
  other: 'Other',
};

export const CONTACT_TYPE_COLORS: Record<string, string> = {
  prospect: Colors.brand.cyan,
  referral_partner: Colors.status.warning,
  strategic_partner: Colors.brand.primary,
  client: Colors.status.success,
  resource: Colors.status.info,
  other: Colors.text.tertiary,
};

// ─── Signal Types ────────────────────────────────────────────────────────────

export const SIGNAL_TYPE_LABELS: Record<string, string> = {
  revenue_generating: 'Revenue Generating',
  '10x_action': '10x Action Item',
  marketing: 'Marketing',
  general_business: 'General Business',
  relational: 'Relational',
};

// ─── Deal Stages ─────────────────────────────────────────────────────────────

export const DEAL_STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  proposal: 'Proposal',
  negotiation: 'Negotiating',
  closed_won: 'Won ✓',
  closed_lost: 'Lost',
};

export const DEAL_STAGE_COLORS: Record<string, string> = {
  lead: Colors.text.secondary,
  proposal: Colors.brand.cyan,
  negotiation: Colors.status.warning,
  closed_won: Colors.status.success,
  closed_lost: Colors.status.error,
};

// ─── Interaction Types ───────────────────────────────────────────────────────

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  text: 'Text Message',
  voice_note: 'Voice Note',
  call: 'Phone Call',
  email: 'Email',
  in_person: 'In Person',
  introduction: 'Introduction',
  social_media: 'Social Media',
  video_call: 'Video Call',
  gift: 'Gift',
  referral: 'Referral',
};

export const INTERACTION_WEIGHTS: Record<string, number> = {
  in_person: 10,
  introduction: 9,
  referral: 9,
  video_call: 8,
  call: 7,
  voice_note: 6,
  gift: 6,
  text: 5,
  email: 4,
  social_media: 3,
};

// ─── Animation Durations ─────────────────────────────────────────────────────

export const Animation = {
  fast: 200,
  normal: 300,
  slow: 500,
};

export default Colors;
