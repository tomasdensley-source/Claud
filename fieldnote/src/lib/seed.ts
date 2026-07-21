import { Board, BoardItem } from '../types';
import { colors } from '../theme';

export function createSeedItems(): BoardItem[] {
  return [
    {
      id: 'hero-title',
      type: 'text',
      x: 60,
      y: 80,
      width: 960,
      height: 160,
      zIndex: 1,
      backgroundColor: colors.paper,
      color: colors.ink,
      text: 'A place for unfinished ideas.\n\nCollect the pieces. Move them until they make sense.',
      fontSize: 42,
      role: 'title',
      fontWeight: '500',
    },
    {
      id: 'pottery-image',
      type: 'image',
      x: 60,
      y: 280,
      width: 450,
      height: 338,
      zIndex: 1,
      backgroundColor: colors.paper,
      uri: '',
      assetKey: 'pottery',
      alt: 'Hands shaping clay on a pottery wheel',
    },
    {
      id: 'human-note',
      type: 'text',
      x: 540,
      y: 280,
      width: 380,
      height: 205,
      zIndex: 1,
      backgroundColor: colors.clay,
      color: colors.ink,
      text: 'Keep it human.\nKeep it useful.',
      fontSize: 38,
      role: 'note',
      fontWeight: '400',
    },
    {
      id: 'wildflower-image',
      type: 'image',
      x: 1130,
      y: 155,
      width: 330,
      height: 413,
      zIndex: 1,
      backgroundColor: colors.paper,
      uri: '',
      assetKey: 'wildflower',
      alt: 'Amber wildflowers in a cream vase by a sunlit wall',
    },
    {
      id: 'palette-note',
      type: 'text',
      x: 720,
      y: 615,
      width: 340,
      height: 160,
      zIndex: 1,
      backgroundColor: colors.paper,
      color: colors.ink,
      text: 'Palette\n\nwarm · useful · unforced',
      fontSize: 24,
      role: 'body',
      fontWeight: '400',
    },
  ];
}

export function createMainBoard(): Board {
  return {
    id: 'main',
    name: 'Main board',
    items: createSeedItems(),
    updatedAt: Date.now(),
  };
}

export function uid(prefix = 'item'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
