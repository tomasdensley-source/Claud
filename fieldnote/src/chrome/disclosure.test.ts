import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveChromeMode, visibleSlots } from './disclosure';

test('deriveChromeMode prefers edit then draw', () => {
  assert.equal(
    deriveChromeMode({
      tool: 'draw',
      selectedTypes: [],
      editing: true,
      focusedRegion: false,
      hasMindMapSelection: false,
    }),
    'edit',
  );
  assert.equal(
    deriveChromeMode({
      tool: 'draw',
      selectedTypes: [],
      editing: false,
      focusedRegion: false,
      hasMindMapSelection: false,
    }),
    'draw',
  );
});

test('visibleSlots hides minimap in edit', () => {
  const slots = visibleSlots('edit', { format: true });
  assert.ok(slots.has('format'));
  assert.ok(!slots.has('minimap'));
});

test('idle shows minimap and zoom', () => {
  const slots = visibleSlots('idle');
  assert.ok(slots.has('minimap'));
  assert.ok(slots.has('zoom'));
});
