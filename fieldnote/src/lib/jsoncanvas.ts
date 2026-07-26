import { Board, BoardItem, ItemType } from '../types';
import { repairBoardItems } from './normalize';

// JSON Canvas 1.0 (https://jsoncanvas.org) import/export.
//
// Fieldnote's item types (task, mindmap, region, drawing, ...) don't map
// 1:1 onto the four JSON Canvas node types (text, file, link, group), so every
// exported node also carries the full original Fieldnote item under
// `metadata.fieldnote`. Any JSON Canvas viewer sees a reasonable generic
// card; re-importing into Fieldnote restores the exact original — a lossless
// round-trip. Connectors are out of scope here: Fieldnote has no first-class
// edge/connector item yet (that arrives when connectors become editable), so
// `edges` is always empty on export.

type JSONCanvasNodeType = 'text' | 'file' | 'link' | 'group';

interface JSONCanvasNode {
  id: string;
  type: JSONCanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  url?: string;
  label?: string;
  metadata?: { fieldnote?: BoardItem };
}

export interface JSONCanvasDocument {
  nodes: JSONCanvasNode[];
  edges: [];
}

const KNOWN_ITEM_TYPES: ItemType[] = [
  'text',
  'image',
  'task',
  'mindmap',
  'region',
  'shape',
  'drawing',
  'file',
  'folder',
];

function toGenericNode(item: BoardItem): JSONCanvasNode {
  const base = {
    id: item.id,
    x: Math.round(item.x),
    y: Math.round(item.y),
    width: Math.round(item.width),
    height: Math.round(item.height),
    color: item.backgroundColor,
    metadata: { fieldnote: item },
  };
  switch (item.type) {
    case 'region':
      return { ...base, type: 'group', label: item.label };
    case 'file':
    case 'folder':
      return { ...base, type: 'file', file: item.name };
    case 'task':
      return { ...base, type: 'text', text: `${item.done ? '[x]' : '[ ]'} ${item.text}` };
    case 'mindmap':
      return { ...base, type: 'text', text: item.text };
    case 'shape':
      return { ...base, type: 'text', text: `[${item.shape} shape]` };
    case 'drawing':
      return { ...base, type: 'text', text: '[Drawing]' };
    case 'image':
      return { ...base, type: 'text', text: item.alt ?? '[Image]' };
    case 'text':
    default:
      return { ...base, type: 'text', text: item.text };
  }
}

export function boardToJSONCanvas(board: Board): JSONCanvasDocument {
  return { nodes: board.items.map(toGenericNode), edges: [] };
}

export function serializeJSONCanvas(board: Board): string {
  return JSON.stringify(boardToJSONCanvas(board), null, 2);
}

export interface ImportResult {
  items: BoardItem[];
  issues: string[];
  changed: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

// Structural check for a round-tripped Fieldnote item embedded in
// metadata.fieldnote — enough to trust it as a BoardItem shape. Coordinate
// and size sanity is handled uniformly by repairBoardItems afterwards.
function looksLikeBoardItem(v: unknown): v is BoardItem {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.type === 'string' &&
    KNOWN_ITEM_TYPES.includes(v.type as ItemType)
  );
}

function fromForeignNode(node: Record<string, unknown>, index: number): BoardItem {
  const id = typeof node.id === 'string' && node.id ? node.id : `import-${index}`;
  const x = Number(node.x);
  const y = Number(node.y);
  const width = Number(node.width);
  const height = Number(node.height);
  const backgroundColor = typeof node.color === 'string' ? node.color : undefined;
  const zIndex = index + 1;
  if (node.type === 'group') {
    const label = typeof node.label === 'string' ? node.label : '';
    return { id, type: 'region', x, y, width, height, zIndex, backgroundColor, label };
  }
  const text =
    (typeof node.text === 'string' && node.text) ||
    (typeof node.file === 'string' && node.file) ||
    (typeof node.url === 'string' && node.url) ||
    '';
  return {
    id,
    type: 'text',
    x,
    y,
    width,
    height,
    zIndex,
    backgroundColor,
    text,
    fontSize: 20,
  };
}

// Parses a JSON Canvas document — whether exported by Fieldnote or pasted
// from elsewhere (e.g. an AI board generator) — into board items. Coordinate
// repair always runs afterwards: pasted / AI-generated boards routinely
// arrive with missing, NaN, or wildly out-of-range coordinates.
export function parseJSONCanvas(raw: string): ImportResult {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    return { items: [], issues: ['That did not look like valid JSON.'], changed: false };
  }
  if (!isRecord(doc) || !Array.isArray(doc.nodes)) {
    return {
      items: [],
      issues: ['Missing a "nodes" array — not a JSON Canvas document.'],
      changed: false,
    };
  }

  const usedIds = new Set<string>();
  const items: BoardItem[] = [];
  (doc.nodes as unknown[]).forEach((rawNode, index) => {
    if (!isRecord(rawNode)) return;
    const original = rawNode.metadata && isRecord(rawNode.metadata) ? rawNode.metadata.fieldnote : undefined;
    const item = looksLikeBoardItem(original) ? { ...original } : fromForeignNode(rawNode, index);
    let id = item.id;
    while (usedIds.has(id)) id = `${id}-${index}`;
    usedIds.add(id);
    items.push({ ...item, id });
  });

  const repaired = repairBoardItems(items);
  return { items: repaired.items, issues: repaired.issues, changed: repaired.changed };
}
