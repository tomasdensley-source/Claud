export const colors = {
  canvas: '#f4ecdd',
  canvasAlt: '#f2eadc',
  canvasGrid: 'rgba(169, 124, 69, 0.24)',
  paper: '#fbf6ec',
  paperStrong: '#fffaf0',
  ink: '#34261d',
  mutedInk: '#6d5847',
  walnut: '#241c17',
  walnutRaised: '#342821',
  clay: '#E9B27F',
  clayDeep: '#cb7d46',
  amber: '#edb64a',
  cream: '#fff8e9',
  tipBlue: '#d8e6e8',
  white: '#ffffff',
  overlay: 'rgba(36, 28, 23, 0.45)',
  selection: '#eeb174',
  saveDot: '#edb64a',
  success: '#3f8f58',
  danger: '#9f3f2f',
  blocked: '#c86545',
  ready: '#d69b36',
  connector: 'rgba(52,38,29,0.36)',
} as const;

export const PALETTE = [
  '#fbf6ec',
  '#fffaf0',
  '#E9B27F',
  '#edb64a',
  '#d8e6e8',
  '#cfe0bf',
  '#d9c1aa',
  '#f7d9d4',
  '#34261d',
] as const;

export const radii = {
  card: 18,
  control: 16,
  toolbar: 18,
  modal: 22,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#4d341f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  control: {
    shadowColor: '#251911',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;
