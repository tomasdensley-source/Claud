import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyFile, makeFileCardDrafts } from './fileTypes';
import { hasDependencyPath } from './graphHelpers';
import { centerRect, clampInertiaVelocity } from './placement';
import { itemMatchesSearch } from './searchFilters';
import { createPackagePayload, parsePackageJson, conflictSafeBoardName } from './packageFormat';
import { estimateStorageUsage, parseBoardsWithBackup } from './storageCore';
import { Board, BoardItem } from '../types';

test('file classification recognizes pdf audio markdown and images', () => {
  assert.equal(classifyFile('application/pdf', 'brief.bin'), 'pdf');
  assert.equal(classifyFile('audio/mpeg', 'voice.bin'), 'audio');
  assert.equal(classifyFile('text/plain', 'notes.md'), 'markdown');
  assert.equal(classifyFile('image/png', 'photo'), 'image');
});

test('file card placement centers single non-image and preserves image ratio', () => {
  const [pdf] = makeFileCardDrafts([{ uri: 'u', name: 'a.pdf', mimeType: 'application/pdf' }], { x: 100, y: 100 });
  assert.equal(pdf.x, -20);
  assert.equal(pdf.y, 40);
  const [image] = makeFileCardDrafts([{ uri: 'u', name: 'a.png', mimeType: 'image/png', width: 400, height: 200 }], { x: 0, y: 0 });
  assert.equal(image.type, 'image');
  assert.equal(image.height, 140);
});

test('search helper includes markdown body in file filter', () => {
  const item: BoardItem = { id: 'm', type: 'markdown', x: 0, y: 0, width: 100, height: 80, zIndex: 1, name: 'notes.md', text: '## Methods\nrare phrase' };
  assert.equal(itemMatchesSearch(item, 'rare phrase', 'file'), true);
});

test('graph helper prevents dependency cycles', () => {
  const items: BoardItem[] = [
    { id: 'a', type: 'task', x: 0, y: 0, width: 100, height: 80, zIndex: 1, text: 'A', done: false, dependsOn: ['b'], state: 'blocked' },
    { id: 'b', type: 'task', x: 0, y: 0, width: 100, height: 80, zIndex: 2, text: 'B', done: false, dependsOn: [], state: 'ready' },
  ];
  assert.equal(hasDependencyPath(items, 'a', 'b'), true);
  assert.equal(hasDependencyPath(items, 'b', 'a'), false);
});

test('placement helper centers and clamps zoom-scaled inertia', () => {
  assert.deepEqual(centerRect({ x: 50, y: 50 }, { width: 20, height: 10 }), { x: 40, y: 45, width: 20, height: 10 });
  assert.equal(clampInertiaVelocity(99999, 0.2), 600);
});

test('package format validates payloads and conflict renames', () => {
  const board: Board = { id: 'b', name: 'Board', updatedAt: 1, items: [] };
  const json = JSON.stringify(createPackagePayload(
    board,
    [{ id: 'f', name: 'File', uri: 'file:///x/fieldnote-files/a.pdf', addedAt: 1 }],
    { 'fieldnote-files/a.pdf': { mimeType: 'application/pdf', size: 4, base64: 'ZGF0YQ==' } },
  ));
  const parsed = parsePackageJson(json);
  assert.equal(parsed.board.name, 'Board');
  assert.equal(parsed.workingFiles[0].uri, 'fieldnote-files/a.pdf');
  assert.equal(parsed.blobs['fieldnote-files/a.pdf'].base64, 'ZGF0YQ==');
  assert.equal(conflictSafeBoardName('Board', ['Board', 'Board (2)']), 'Board (3)');
});

test('storage core recovers corrupt primary JSON from backup', () => {
  const backup = JSON.stringify({ boards: [{ id: 'b', name: 'Backup', updatedAt: 1, items: [] }] });
  const parsed = parseBoardsWithBackup('{bad', backup, null);
  assert.equal(parsed.recoveredFromBackup, true);
  assert.equal(parsed.boards[0].name, 'Backup');
});

test('storage usage clamps invalid working-file sizes', () => {
  const usage = estimateStorageUsage([], [{ id: 'f', name: 'bad', uri: 'u', size: -10, addedAt: 1 }]);
  assert.ok(usage.totalBytes >= usage.jsonBytes);
});
