/**
 * Fieldnote design tokens — Apple HIG–inspired premium layer.
 *
 * Principles applied (Clarity · Deference · Depth · Consistency):
 * 1. Semantic color roles (not one-off hex)
 * 2. Dynamic Type–inspired type scale
 * 3. 8pt spacing grid
 * 4. 44pt minimum tap targets
 * 5. Continuous / concentric corner radii
 * 6. Separate content vs control materials (glass chrome)
 * 7. Soft depth shadows (not Material multi-layer)
 * 8. Hairline separators
 * 9. Reduce-transparency / increase-contrast hooks
 */

export const colors = {
  // Content layer (deference — board first)
  canvas: '#f3ebe0',
  canvasAlt: '#ebe3d6',
  canvasGrid: 'rgba(88, 64, 40, 0.10)',
  paper: '#fbf7f0',
  paperStrong: '#fffcf7',
  ink: '#1c1612',
  mutedInk: '#6b5a4c',
  tertiaryInk: 'rgba(28, 22, 18, 0.45)',

  // Control / glass layer (functional chrome above content)
  walnut: '#1a1511',
  walnutRaised: '#2a231d',
  glassFill: 'rgba(255, 252, 247, 0.72)',
  glassFillDark: 'rgba(26, 21, 17, 0.78)',
  glassStroke: 'rgba(255, 255, 255, 0.45)',
  glassStrokeDark: 'rgba(255, 255, 255, 0.12)',

  // Semantic accents
  clay: '#d9a06e',
  clayDeep: '#b86f3a',
  amber: '#d9a63f',
  cream: '#fff8ec',
  tipBlue: '#c9dce0',
  white: '#ffffff',
  overlay: 'rgba(20, 16, 12, 0.28)', // lighter — deference to content
  overlayHeavy: 'rgba(20, 16, 12, 0.48)',
  selection: '#c98b52',
  saveDot: '#2f9e6b',
  destructive: '#c4473a',
  separator: 'rgba(28, 22, 18, 0.08)',
  separatorOnDark: 'rgba(255, 248, 236, 0.12)',
} as const;

/** Dynamic Type–inspired scale (default size). */
export const type = {
  largeTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: 0.2 },
  title1: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0.15 },
  title2: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: 0.1 },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0 },
  callout: { fontSize: 14, lineHeight: 18, fontWeight: '500' as const, letterSpacing: 0 },
  footnote: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.1 },
  caption: { fontSize: 11, lineHeight: 13, fontWeight: '600' as const, letterSpacing: 0.4 },
  eyebrow: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;

/** 8pt grid. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Apple HIG minimum interactive size. */
export const tapTarget = 44;

/** Continuous / concentric radii (controls nest inside sheets). */
export const radii = {
  card: 18,
  control: 16,
  toolbar: 18,
  modal: 24,
  sheet: 28,
  pill: 999,
  continuous: 22,
} as const;

export const shadows = {
  /** Content cards — whisper of depth */
  card: {
    shadowColor: '#2a1c10',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  /** Control layer floating above content */
  control: {
    shadowColor: '#0c0806',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  /** Soft lift for glass pills */
  glass: {
    shadowColor: '#1a120c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
} as const;

export const motion = {
  spring: { damping: 22, stiffness: 260, mass: 0.9 },
  quick: { damping: 28, stiffness: 380, mass: 0.7 },
  sheet: { damping: 26, stiffness: 220, mass: 1 },
} as const;

/** Approximate hairline without importing RN StyleSheet here. */
export const hairline = 0.5;
