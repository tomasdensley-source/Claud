/**
 * Progressive disclosure — which chrome slots mount per mode.
 */

export type ChromeMode = 'idle' | 'draw' | 'select' | 'edit' | 'mindmap' | 'region';

export type ChromeSlotId =
  | 'toolbar'
  | 'badge'
  | 'toast'
  | 'color'
  | 'format'
  | 'minimap'
  | 'zoom'
  | 'selection'
  | 'drawInk'
  | 'exitRegion'
  | 'contextualAdd'
  | 'mindmapToolbar';

/** Higher = placed first (others yield). */
export const SLOT_PRIORITY: Record<ChromeSlotId, number> = {
  contextualAdd: 100,
  toast: 90,
  toolbar: 80,
  exitRegion: 75,
  format: 70,
  color: 60,
  mindmapToolbar: 55,
  selection: 50,
  zoom: 45,
  drawInk: 40,
  minimap: 30,
  badge: 20,
};

export function deriveChromeMode(input: {
  tool: string;
  selectedTypes: string[];
  editing: boolean;
  focusedRegion: boolean;
  hasMindMapSelection: boolean;
}): ChromeMode {
  if (input.editing) return 'edit';
  if (input.tool === 'draw') return 'draw';
  if (input.focusedRegion) return 'region';
  if (input.hasMindMapSelection) return 'mindmap';
  if (input.selectedTypes.length > 0) return 'select';
  return 'idle';
}

export function visibleSlots(mode: ChromeMode, opts?: { toast?: boolean; format?: boolean }): Set<ChromeSlotId> {
  const s = new Set<ChromeSlotId>(['toolbar', 'badge']);
  switch (mode) {
    case 'idle':
      s.add('zoom');
      s.add('minimap');
      s.add('color');
      break;
    case 'draw':
      s.add('zoom');
      s.add('color');
      s.add('drawInk');
      break;
    case 'select':
      s.add('selection');
      s.add('color');
      s.add('minimap');
      if (opts?.format) s.add('format');
      break;
    case 'edit':
      s.add('format');
      s.add('color');
      break;
    case 'mindmap':
      s.add('mindmapToolbar');
      s.add('color');
      s.add('selection');
      break;
    case 'region':
      s.add('exitRegion');
      s.add('zoom');
      s.add('color');
      break;
  }
  if (opts?.toast) s.add('toast');
  return s;
}
