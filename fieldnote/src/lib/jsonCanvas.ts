/**
 * JSON Canvas 1.0 (Obsidian-compatible) import/export.
 * Spec: https://jsoncanvas.org/
 * Fieldnote extras live under node.metadata.fieldnote (ignored by Obsidian).
 */

import { Board, BoardItem, ConnectorSide, DraftBoardItem } from '../types';
import { uid } from './seed';
import { colors } from '../theme';

export interface FieldnoteNodeMeta {
  kind?: string;
  paths?: { color: string; width: number; points: { x: number; y: number }[] }[];
  shape?: 'rect' | 'ellipse' | 'line';
  dependsOn?: string[];
  children?: string[];
  collapsed?: boolean;
  branchColor?: string;
  done?: boolean;
  name?: string;
  mimeType?: string;
  pageCount?: number;
  sizeBytes?: number;
  fileCount?: number;
  label?: string;
  frameColor?: string;
  fontSize?: number;
  role?: string;
  markdown?: boolean;
  alt?: string;
  assetKey?: string;
  title?: string;
  durationMs?: number;
  coverUri?: string;
  trackIds?: string[];
  childIds?: string[];
  working?: boolean;
}

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
  metadata?: { fieldnote?: FieldnoteNodeMeta };
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

function withMeta(
  node: JsonCanvasNode,
  meta: FieldnoteNodeMeta | undefined,
): JsonCanvasNode {
  if (!meta || Object.keys(meta).length === 0) return node;
  return { ...node, metadata: { fieldnote: meta } };
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

    if (it.type === 'drawing') {
      nodes.push(
        withMeta(
          {
            id: it.id,
            type: 'text',
            x: it.x,
            y: it.y,
            width: it.width,
            height: it.height,
            text: '',
            color: it.color ?? it.backgroundColor,
          },
          { kind: 'drawing', paths: it.paths },
        ),
      );
      continue;
    }

    if (it.type === 'shape') {
      nodes.push(
        withMeta(
          {
            id: it.id,
            type: 'text',
            x: it.x,
            y: it.y,
            width: it.width,
            height: it.height,
            text: '',
            color: it.color ?? it.backgroundColor,
          },
          { kind: 'shape', shape: it.shape },
        ),
      );
      continue;
    }

    if (it.type === 'region') {
      nodes.push(
        withMeta(
          {
            id: it.id,
            type: 'group',
            x: it.x,
            y: it.y,
            width: it.width,
            height: it.height,
            color: it.frameColor ?? it.backgroundColor,
            label: it.label,
          },
          {
            kind: 'region',
            label: it.label,
            frameColor: it.frameColor,
          },
        ),
      );
      continue;
    }

    if (it.type === 'file' || it.type === 'image') {
      const meta: FieldnoteNodeMeta =
        it.type === 'file'
          ? {
              kind: 'file',
              name: it.name,
              mimeType: it.mimeType,
              pageCount: it.pageCount,
              sizeBytes: it.sizeBytes,
            }
          : {
              kind: 'image',
              alt: it.alt,
              assetKey: it.assetKey,
            };
      nodes.push(
        withMeta(
          {
            id: it.id,
            type: 'file',
            x: it.x,
            y: it.y,
            width: it.width,
            height: it.height,
            file: it.uri,
            color: it.backgroundColor,
            label: it.type === 'file' ? it.name : it.alt,
          },
          meta,
        ),
      );
      continue;
    }

    if (it.type === 'folder') {
      nodes.push(
        withMeta(
          {
            id: it.id,
            type: 'text',
            x: it.x,
            y: it.y,
            width: it.width,
            height: it.height,
            text: it.name,
            color: it.color ?? it.backgroundColor,
          },
          { kind: 'folder', name: it.name, fileCount: it.fileCount },
        ),
      );
      continue;
    }

    if (it.type === 'task') {
      nodes.push(
        withMeta(
          {
            id: it.id,
            type: 'text',
            x: it.x,
            y: it.y,
            width: it.width,
            height: it.height,
            text: `${it.done ? '[x]' : '[ ]'} ${it.text}`,
            color: it.color ?? it.backgroundColor,
          },
          {
            kind: 'task',
            dependsOn: it.dependsOn,
            done: it.done,
            markdown: it.markdown,
          },
        ),
      );
      continue;
    }

    if (it.type === 'mindmap') {
      nodes.push(
        withMeta(
          {
            id: it.id,
            type: 'text',
            x: it.x,
            y: it.y,
            width: it.width,
            height: it.height,
            text: it.text,
            color: it.color ?? it.backgroundColor,
          },
          {
            kind: 'mindmap',
            children: it.children,
            collapsed: it.collapsed,
            branchColor: it.branchColor,
          },
        ),
      );
      continue;
    }

    if (it.type === 'audio') {
      nodes.push(
        withMeta(
          {
            id: it.id,
            type: 'file',
            x: it.x,
            y: it.y,
            width: it.width,
            height: it.height,
            file: it.uri,
            label: it.title,
            color: it.backgroundColor,
          },
          {
            kind: 'audio',
            title: it.title,
            durationMs: it.durationMs,
            coverUri: it.coverUri,
          },
        ),
      );
      continue;
    }

    if (it.type === 'playlist') {
      nodes.push(
        withMeta(
          {
            id: it.id,
            type: 'text',
            x: it.x,
            y: it.y,
            width: it.width,
            height: it.height,
            text: it.title,
            color: it.backgroundColor,
          },
          {
            kind: 'playlist',
            title: it.title,
            trackIds: it.trackIds,
            coverUri: it.coverUri,
          },
        ),
      );
      continue;
    }

    if (it.type !== 'text') continue;

    // text
    nodes.push(
      withMeta(
        {
          id: it.id,
          type: 'text',
          x: it.x,
          y: it.y,
          width: it.width,
          height: it.height,
          text: it.text,
          color: it.color ?? it.backgroundColor,
        },
        {
          kind: 'text',
          fontSize: it.fontSize,
          role: it.role,
          markdown: it.markdown,
        },
      ),
    );
  }

  return { nodes, edges };
}

function readMeta(node: JsonCanvasNode): FieldnoteNodeMeta | undefined {
  const meta = node.metadata?.fieldnote;
  return meta && typeof meta === 'object' ? meta : undefined;
}

export function jsonCanvasToItems(doc: JsonCanvasFile): BoardItem[] {
  const items: BoardItem[] = [];
  let z = 1;

  for (const node of doc.nodes ?? []) {
    const meta = readMeta(node);
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

    if (meta?.kind === 'drawing' && Array.isArray(meta.paths)) {
      items.push({
        ...base,
        type: 'drawing',
        paths: meta.paths.map((p) => ({
          color: typeof p.color === 'string' ? p.color : colors.ink,
          width: typeof p.width === 'number' ? p.width : 3,
          points: Array.isArray(p.points)
            ? p.points
                .filter((pt) => pt && typeof pt.x === 'number' && typeof pt.y === 'number')
                .map((pt) => ({ x: pt.x, y: pt.y }))
            : [],
        })),
      });
      continue;
    }

    if (meta?.kind === 'shape') {
      const shape =
        meta.shape === 'ellipse' || meta.shape === 'line' ? meta.shape : 'rect';
      items.push({ ...base, type: 'shape', shape });
      continue;
    }

    if (meta?.kind === 'mindmap' || (meta?.children && Array.isArray(meta.children))) {
      items.push({
        ...base,
        type: 'mindmap',
        text: node.text ?? 'Idea',
        children: Array.isArray(meta?.children)
          ? meta!.children!.filter((c): c is string => typeof c === 'string')
          : [],
        collapsed: Boolean(meta?.collapsed),
        branchColor: typeof meta?.branchColor === 'string' ? meta.branchColor : undefined,
      });
      continue;
    }

    if (meta?.kind === 'folder') {
      items.push({
        ...base,
        type: 'folder',
        name: meta.name || node.text || node.label || 'Folder',
        fileCount: typeof meta.fileCount === 'number' ? meta.fileCount : 0,
        childIds: Array.isArray(meta.childIds)
          ? meta.childIds.filter((id): id is string => typeof id === 'string')
          : [],
        working: Boolean(meta.working),
      });
      continue;
    }

    if (meta?.kind === 'audio') {
      items.push({
        ...base,
        type: 'audio',
        title: meta.title || node.label || 'Audio',
        uri: node.file || node.url || '',
        durationMs: typeof meta.durationMs === 'number' ? meta.durationMs : undefined,
        coverUri: typeof meta.coverUri === 'string' ? meta.coverUri : undefined,
      });
      continue;
    }

    if (meta?.kind === 'playlist') {
      items.push({
        ...base,
        type: 'playlist',
        title: meta.title || node.text || 'Playlist',
        trackIds: Array.isArray(meta.trackIds)
          ? meta.trackIds.filter((id): id is string => typeof id === 'string')
          : [],
        coverUri: typeof meta.coverUri === 'string' ? meta.coverUri : undefined,
      });
      continue;
    }

    if (node.type === 'group' || meta?.kind === 'region') {
      items.push({
        ...base,
        type: 'region',
        label: meta?.label || node.label || 'Region',
        frameColor: meta?.frameColor ?? mapColor(node.color),
      });
      continue;
    }

    if (node.type === 'file' || node.type === 'link' || meta?.kind === 'file' || meta?.kind === 'image') {
      const uri = node.file || node.url || '';
      const isImage =
        meta?.kind === 'image' || /\.(png|jpe?g|webp|gif)$/i.test(uri);
      if (isImage) {
        items.push({
          ...base,
          type: 'image',
          uri,
          alt: meta?.alt || node.label || 'Image',
          assetKey:
            meta?.assetKey === 'pottery' || meta?.assetKey === 'wildflower'
              ? meta.assetKey
              : undefined,
        });
      } else {
        items.push({
          ...base,
          type: 'file',
          name: meta?.name || node.label || node.file || node.url || 'File',
          uri,
          mimeType: meta?.mimeType,
          pageCount: meta?.pageCount,
          sizeBytes: meta?.sizeBytes,
        });
      }
      continue;
    }

    const raw = node.text ?? '';
    const taskMatch = raw.match(/^\s*\[([ xX])\]\s*(.*)$/s);
    if (meta?.kind === 'task' || taskMatch) {
      items.push({
        ...base,
        type: 'task',
        text: taskMatch ? taskMatch[2] || 'Task' : raw || 'Task',
        done: meta?.done ?? (taskMatch ? taskMatch[1].toLowerCase() === 'x' : false),
        dependsOn: Array.isArray(meta?.dependsOn)
          ? meta!.dependsOn!.filter((id): id is string => typeof id === 'string')
          : [],
        markdown: meta?.markdown ?? true,
      });
      continue;
    }

    items.push({
      ...base,
      type: 'text',
      text: raw,
      fontSize: typeof meta?.fontSize === 'number' ? meta.fontSize : 18,
      role: (meta?.role as 'title' | 'body' | 'note') || 'body',
      markdown: meta?.markdown ?? true,
    });
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
