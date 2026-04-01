/**
 * useResponsive — Breakpoint detection + platform awareness
 * Usage: const { isDesktop, isMobile, isTablet, isWeb, breakpoint, width } = useResponsive();
 */
import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

export function useResponsive() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => sub?.remove();
  }, []);

  const { width, height } = dimensions;
  const breakpoint = getBreakpoint(width);
  const isWeb = Platform.OS === 'web';
  const isNative = !isWeb;

  return {
    width,
    height,
    breakpoint,
    isWeb,
    isNative,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
    isWide: breakpoint === 'wide',
    // Helper for responsive values
    responsive: <T>(mobile: T, tablet?: T, desktop?: T, wide?: T): T => {
      if (breakpoint === 'wide' && wide !== undefined) return wide;
      if ((breakpoint === 'desktop' || breakpoint === 'wide') && desktop !== undefined) return desktop;
      if ((breakpoint === 'tablet' || breakpoint === 'desktop' || breakpoint === 'wide') && tablet !== undefined) return tablet;
      return mobile;
    },
    BREAKPOINTS,
  };
}

export { BREAKPOINTS };
