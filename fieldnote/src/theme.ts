export const colors = {
  canvas: '#f1e8d8',
  canvasAlt: '#ebe2d2',
  canvasGrid: 'rgba(120, 88, 52, 0.14)',
  paper: '#faf6ee',
  paperStrong: '#fffdf8',
  ink: '#2c2118',
  mutedInk: '#6a5646',
  walnut: '#1f1813',
  walnutRaised: '#2f2620',
  clay: '#E3AE7A',
  clayDeep: '#c47842',
  amber: '#e5b04a',
  cream: '#fff8e9',
  tipBlue: '#d5e3e5',
  white: '#ffffff',
  overlay: 'rgba(28, 22, 18, 0.48)',
  selection: '#e4a86a',
  saveDot: '#e5b04a',
} as const;

export const radii = {
  card: 16,
  control: 14,
  toolbar: 16,
  modal: 20,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#3d2a18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  control: {
    shadowColor: '#1a120c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
} as const;
