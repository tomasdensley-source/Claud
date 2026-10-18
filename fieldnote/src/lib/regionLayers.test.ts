import assert from 'node:assert/strict';
import test from 'node:test';
import { computeRegionDepth, sortItemsForRender } from './regionLayers';
import { BoardItem, RegionItem, TextItem } from '../types';

function region(overrides: Partial<RegionItem>): RegionItem {
  return {
    id: 'r',
    type: 'region',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 1,
    label: 'Region',
    ...overrides,
  };
}

function text(overrides: Partial<TextItem>): TextItem {
  return {
    id: 't',
    type: 'text',
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    zIndex: 1,
    text: '',
    fontSize: 16,
    ...overrides,
  };
}

test('a top-level region with no containing region has depth 0', () => {
  const a = region({ id: 'a' });
  assert.equal(computeRegionDepth(a, [a]), 0);
});

test('a region fully inside a larger region has depth 1', () => {
  const outer = region({ id: 'outer', x: 0, y: 0, width: 1000, height: 1000 });
  const inner = region({ id: 'inner', x: 100, y: 100, width: 200, height: 200 });
  assert.equal(computeRegionDepth(inner, [outer, inner]), 1);
  assert.equal(computeRegionDepth(outer, [outer, inner]), 0);
});

test('nesting depth increases through multiple levels', () => {
  const outer = region({ id: 'outer', x: 0, y: 0, width: 1000, height: 1000 });
  const middle = region({ id: 'middle', x: 100, y: 100, width: 500, height: 500 });
  const inner = region({ id: 'inner', x: 150, y: 150, width: 100, height: 100 });
  const all = [outer, middle, inner];
  assert.equal(computeRegionDepth(outer, all), 0);
  assert.equal(computeRegionDepth(middle, all), 1);
  assert.equal(computeRegionDepth(inner, all), 2);
});

test('a region that only partially overlaps is not counted as nested', () => {
  const a = region({ id: 'a', x: 0, y: 0, width: 100, height: 100 });
  const b = region({ id: 'b', x: 50, y: 50, width: 100, height: 100 });
  assert.equal(computeRegionDepth(a, [a, b]), 0);
  assert.equal(computeRegionDepth(b, [a, b]), 0);
});

test('sortItemsForRender puts all regions before other items', () => {
  const items: BoardItem[] = [
    text({ id: 't1', zIndex: 5 }),
    region({ id: 'r1', zIndex: 10 }),
    text({ id: 't2', zIndex: 1 }),
  ];
  const sorted = sortItemsForRender(items);
  assert.equal(sorted[0].id, 'r1');
});

test('sortItemsForRender orders regions largest-first regardless of zIndex', () => {
  const small = region({ id: 'small', width: 50, height: 50, zIndex: 99 });
  const big = region({ id: 'big', width: 500, height: 500, zIndex: 1 });
  const sorted = sortItemsForRender([small, big]);
  assert.deepEqual(
    sorted.map((it) => it.id),
    ['big', 'small'],
  );
});

test('sortItemsForRender keeps non-region items ordered by zIndex', () => {
  const items: BoardItem[] = [text({ id: 'a', zIndex: 3 }), text({ id: 'b', zIndex: 1 })];
  const sorted = sortItemsForRender(items);
  assert.deepEqual(
    sorted.map((it) => it.id),
    ['b', 'a'],
  );
});
