import assert from 'node:assert/strict';
import test from 'node:test';
import { createMainBoard } from './seed';
import { boardToJSONCanvas, parseJSONCanvas, serializeJSONCanvas } from './jsoncanvas';
import { BoardItem } from '../types';

test('exports every board item as a JSON Canvas node', () => {
  const board = createMainBoard();
  const doc = boardToJSONCanvas(board);
  assert.equal(doc.nodes.length, board.items.length);
  assert.deepEqual(doc.edges, []);
  doc.nodes.forEach((node) => {
    assert.ok(['text', 'file', 'link', 'group'].includes(node.type));
  });
});

test('round-trips a Fieldnote board losslessly through export + import', () => {
  const board = createMainBoard();
  const json = serializeJSONCanvas(board);
  const result = parseJSONCanvas(json);
  assert.equal(result.changed, false);
  assert.equal(result.items.length, board.items.length);
  const byId = new Map(board.items.map((it) => [it.id, it]));
  result.items.forEach((it) => {
    assert.deepEqual(it, byId.get(it.id));
  });
});

test('imports a foreign JSON Canvas document (no fieldnote metadata)', () => {
  const doc = {
    nodes: [
      { id: 'n1', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'Hello from elsewhere' },
      { id: 'n2', type: 'group', x: 300, y: 0, width: 400, height: 300, label: 'Section' },
    ],
    edges: [],
  };
  const result = parseJSONCanvas(JSON.stringify(doc));
  assert.equal(result.items.length, 2);
  const text = result.items.find((it) => it.id === 'n1');
  assert.equal(text?.type, 'text');
  assert.equal((text as BoardItem & { text: string }).text, 'Hello from elsewhere');
  const group = result.items.find((it) => it.id === 'n2');
  assert.equal(group?.type, 'region');
});

test('auto-repairs a glitched AI-generated board on import', () => {
  const doc = {
    nodes: [
      { id: 'a', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'A' },
      { id: 'b', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'B' },
      { id: 'c', type: 'text', x: Number.NaN, y: 5_000_000, width: -1, height: 0, text: 'C' },
    ],
    edges: [],
  };
  const result = parseJSONCanvas(JSON.stringify(doc));
  assert.equal(result.changed, true);
  assert.ok(result.issues.length > 0);
  assert.equal(result.items.length, 3);
});

test('rejects invalid JSON and documents without a nodes array', () => {
  const bad = parseJSONCanvas('not json');
  assert.equal(bad.items.length, 0);
  assert.ok(bad.issues[0].toLowerCase().includes('json'));

  const noNodes = parseJSONCanvas(JSON.stringify({ foo: 'bar' }));
  assert.equal(noNodes.items.length, 0);
  assert.ok(noNodes.issues[0].toLowerCase().includes('nodes'));
});

test('de-duplicates colliding ids on import', () => {
  const doc = {
    nodes: [
      { id: 'dup', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'first' },
      { id: 'dup', type: 'text', x: 400, y: 0, width: 200, height: 100, text: 'second' },
    ],
    edges: [],
  };
  const result = parseJSONCanvas(JSON.stringify(doc));
  const ids = result.items.map((it) => it.id);
  assert.equal(new Set(ids).size, ids.length);
});
