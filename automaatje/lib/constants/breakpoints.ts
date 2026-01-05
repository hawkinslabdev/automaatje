/**
 * Breakpoint constants for responsive design
 *
 * Mobile: < 768px
 * Tablet: 768px - 1023px
 * Desktop: >= 1024px
 *
 * Mobile/Tablet UI (bottom nav): < 1024px
 * Desktop UI (sidebar): >= 1024px
 */

export const BREAKPOINTS = {
  mobile: 768,      // < 768px
  tablet: 1024,     // 768px - 1023px
  desktop: 1024,    // >= 1024px
} as const;

export const MOBILE_BREAKPOINT = '(max-width: 767px)';
export const TABLET_BREAKPOINT = '(min-width: 768px) and (max-width: 1023px)';
export const MOBILE_OR_TABLET_BREAKPOINT = '(max-width: 1023px)';
export const DESKTOP_BREAKPOINT = '(min-width: 1024px)';
