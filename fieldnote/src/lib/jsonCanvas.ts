/**
 * JSON Canvas 1.0 (Obsidian-compatible) import/export.
 * Spec: https://jsoncanvas.org/
 */

import { Board, BoardItem, ConnectorSide, DraftBoardItem } from '../types';
import { uid } from './seed';
import { colors } from '../theme';

export interface JsonCanvasFile {
  nodes?: JsonCanvasNode[];
  edges?: JsonCanvasEdge[];
}

export interface JsonCanvasNode {
  id: string;
  type: 'text' | 'file' | 'link' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  url?: string;
  label?: string;
}

export interface JsonCanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: ConnectorSide;
  toSide?: ConnectorSide;
  color?: string;
  label?: string;
}

const COLOR_MAP: Record<string, string> = {
  '1': '#c43c3c',
  '2': '#cb7d46',
  '3': '#edb64a',
  '4': '#2f9e6b',
  '5': '#2f6fed',
  '6': '#7c3aed',
};

function mapColor(c?: string): string | undefined {
  if (!c) return undefined;
  if (COLOR_MAP[c]) return COLOR_MAP[c];
  if (c.startsWith('#')) return c;
  return undefined;
}

export function boardToJsonCanvas(board: Board): JsonCanvasFile {
  const nodes: JsonCanvasNode[] = [];
  const edges: JsonCanvasEdge[] = [];

  for (const it of board.items) {
    if (it.type === 'connector') {
      edges.push({
        id: it.id,
        fromNode: it.fromId,
        toNode: it.toId,
        fromSide: it.fromSide,
        toSide: it.toSide,
        color: it.color,
      });
      continue;
    }
    if (it.type === 'drawing' || it.type === 'shape') continue;

    if (it.type === 'region') {
      nodes.push({
        id: it.id,
        type: 'group',
        x: it.x,
        y: it.y,
        width: it.width,
        height: it.height,
        color: it.frameColor ?? it.backgroundColor,
        label: it.label,
      });
      continue;
    }

    if (it.type === 'file' || it.type === 'image') {
      nodes.push({
        id: it.id,
        type: 'file',
        x: it.x,
        y: it.y,
        width: it.width,
        height: it.height,
        file: it.type === 'file' ? it.uri : it.uri,
        color: it.backgroundColor,
      });
      continue;
    }

    const text =
      it.type === 'text' || it.type === 'task' || it.type === 'mindmap'
        ? it.type === 'task'
          ? `${it.done ? '[x]' : '[ ]'} ${it.text}`
          : it.text
        : it.type === 'folder'
          ? it.name
          : '';

    nodes.push({
      id: it.id,
      type: 'text',
      x: it.x,
      y: it.y,
      width: it.width,
      height: it.height,
      text,
      color: it.color ?? it.backgroundColor,
    });
  }

  return { nodes, edges };
}

export function jsonCanvasToItems(doc: JsonCanvasFile): BoardItem[] {
  const items: BoardItem[] = [];
  let z = 1;

  for (const node of doc.nodes ?? []) {
    const base = {
      id: node.id || uid('node'),
      x: node.x,
      y: node.y,
      width: Math.max(80, node.width),
      height: Math.max(60, node.height),
      zIndex: z++,
      color: mapColor(node.color),
      backgroundColor: mapColor(node.color) ?? colors.paper,
    };

    if (node.type === 'group') {
      items.push({
        ...base,
        type: 'region',
        label: node.label || 'Region',
        frameColor: mapColor(node.color),
      });
      continue;
    }

    if (node.type === 'file' || node.type === 'link') {
      const uri = node.file || node.url || '';
      const isImage = /\.(png|jpe?g|webp|gif)$/i.test(uri);
      if (isImage) {
        items.push({
          ...base,
          type: 'image',
          uri,
          alt: node.label || 'Image',
        });
      } else {
        items.push({
          ...base,
          type: 'file',
          name: node.label || node.file || node.url || 'File',
          uri,
        });
      }
      continue;
    }

    const raw = node.text ?? '';
    const taskMatch = raw.match(/^\s*\[([ xX])\]\s*(.*)$/s);
    if (taskMatch) {
      items.push({
        ...base,
        type: 'task',
        text: taskMatch[2] || 'Task',
        done: taskMatch[1].toLowerCase() === 'x',
        dependsOn: [],
        markdown: true,
      });
    } else {
      items.push({
        ...base,
        type: 'text',
        text: raw,
        fontSize: 18,
        role: 'body',
        markdown: true,
      });
    }
  }

  for (const edge of doc.edges ?? []) {
    items.push({
      id: edge.id || uid('edge'),
      type: 'connector',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      zIndex: z++,
      fromId: edge.fromNode,
      toId: edge.toNode,
      fromSide: edge.fromSide,
      toSide: edge.toSide,
      color: mapColor(edge.color) ?? colors.ink,
      thickness: 2,
      glowing: false,
    });
  }

  return items;
}

export function parseJsonCanvas(raw: string): JsonCanvasFile {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON Canvas document');
  }
  const doc = parsed as JsonCanvasFile;
  if (!Array.isArray(doc.nodes) && !Array.isArray(doc.edges)) {
    throw new Error('JSON Canvas needs nodes or edges');
  }
  return {
    nodes: Array.isArray(doc.nodes) ? doc.nodes : [],
    edges: Array.isArray(doc.edges) ? doc.edges : [],
  };
}

export function stringifyJsonCanvas(doc: JsonCanvasFile): string {
  return JSON.stringify(doc, null, 2);
}

/** Accept messy LLM JSON: extract first {...} object if wrapped in prose. */
export function repairAiJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw new Error('No JSON object found');
}

export function layoutRepair(items: BoardItem[]): BoardItem[] {
  // Nudge overlapping text/tasks slightly so Paste AI Board is usable.
  const next = items.map((it) => ({ ...it }));
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const a = next[i];
      const b = next[j];
      if (a.type === 'connector' || b.type === 'connector') continue;
      const overlap =
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
      if (overlap) {
        next[j] = { ...b, x: b.x + 36, y: b.y + 36 };
      }
    }
  }
  return next;
}

export type { DraftBoardItem };
