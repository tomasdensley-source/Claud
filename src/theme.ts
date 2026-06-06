export const theme = {
  colors: {
    board: '#d9b06a',
    boardEdge: '#b8904c',
    line: '#3a2a12',
    star: '#3a2a12',
    black: '#1a1a1a',
    blackHi: '#5a5a5a',
    white: '#f7f7f2',
    whiteShadow: '#bdbdb5',
    bg: '#1c2530',
    panel: '#27313d',
    panelAlt: '#2f3b48',
    text: '#eef2f6',
    textDim: '#9fb0c0',
    accent: '#4caf7d',
    danger: '#c8553d',
    lastMove: '#e23b3b',
  },
} as const;

export type Theme = typeof theme;
