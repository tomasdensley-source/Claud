import { Board, BoardItem, MindMapItem, TaskItem } from '../types';
import { colors, PALETTE } from '../theme';
import { uid } from './seed';

export const STORAGE_SCHEMA_VERSION = 2;

type UnknownItem = Partial<BoardItem> & {
  id?: string;
  type?: string;
  children?: string[];
  dependsOn?: string[];
  done?: boolean;
  connectorSides?: Record<string, { fromSide?: string; toSide?: string }>;
};

type UnknownPath = {
  color?: string;
  width?: number;
  points?: { x?: number; y?: number }[];
  mode?: 'pen' | 'highlighter' | 'eraser';
};

const VALID_SIDES = new Set(['left', 'right', 'top', 'bottom']);

function finite(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function validColor(value: unknown, fallback?: string) {
  if (typeof value !== 'string') return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(value) || /^rgba?\(/.test(value)) return value;
  return fallback;
}

function uniqueId(rawId: unknown, type: string, used: Set<string>) {
  const base = typeof rawId === 'string' && rawId.trim() ? rawId.trim() : uid(type);
  let candidate = base;
  while (used.has(candidate)) candidate = uid(type);
  used.add(candidate);
  return candidate;
}

function sanitizeConnectorSides(raw: UnknownItem['connectorSides'], validIds: Set<string>) {
  if (!raw || typeof raw !== 'object') return undefined;
  const entries = Object.entries(raw).flatMap(([depId, sides]) => {
    if (!validIds.has(depId)) return [];
    const fromSide = VALID_SIDES.has(String(sides?.fromSide)) ? sides.fromSide : 'right';
    const toSide = VALID_SIDES.has(String(sides?.toSide)) ? sides.toSide : 'left';
    return [[depId, { fromSide, toSide }]];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function taskState(done: boolean, dependsOn: string[], items: BoardItem[]) {
  if (done) return 'done' as const;
  const complete = new Set(
    items.filter((it) => it.type === 'task' && it.done).map((it) => it.id),
  );
  return dependsOn.every((id) => complete.has(id)) ? 'ready' : 'blocked';
}

export function normalizeBoardItems(rawItems: unknown): BoardItem[] {
  if (!Array.isArray(rawItems)) return [];
  const output: BoardItem[] = [];
  const source = rawItems as UnknownItem[];
  const usedIds = new Set<string>();

  source.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object' || !raw.type) return;
    const base = {
      id: uniqueId(raw.id, String(raw.type), usedIds),
      x: clamp(finite(raw.x, 80 + index * 24), -100000, 100000),
      y: clamp(finite(raw.y, 80 + index * 24), -100000, 100000),
      width: clamp(finite(raw.width, 260), 60, 4000),
      height: clamp(finite(raw.height, 140), 50, 4000),
      zIndex: clamp(Math.round(finite(raw.zIndex, index + 1)), 1, 1000000),
      backgroundColor: validColor(raw.backgroundColor),
      color: validColor(raw.color),
      locked: Boolean(raw.locked),
      opacity: typeof raw.opacity === 'number' ? clamp(raw.opacity, 0, 1) : undefined,
    };

    switch (raw.type) {
      case 'text':
        output.push({
          ...base,
          type: 'text',
          text: String((raw as { text?: unknown }).text ?? ''),
          fontSize: Number((raw as { fontSize?: unknown }).fontSize ?? 22),
          role: (raw as { role?: 'title' | 'body' | 'note' }).role ?? 'body',
          fontWeight: (raw as { fontWeight?: '400' | '500' | '600' | '700' }).fontWeight,
          textAlign: (raw as { textAlign?: 'left' | 'center' | 'right' }).textAlign ?? 'left',
        });
        break;
      case 'image':
        output.push({
          ...base,
          type: 'image',
          uri: String((raw as { uri?: unknown }).uri ?? ''),
          alt: (raw as { alt?: string }).alt,
          assetKey: (raw as { assetKey?: 'pottery' | 'wildflower' }).assetKey,
        });
        break;
      case 'task': {
        const dependsOn = Array.isArray(raw.dependsOn) ? raw.dependsOn.filter((id): id is string => typeof id === 'string' && Boolean(id)) : [];
        output.push({
          ...base,
          type: 'task',
          text: String((raw as { text?: unknown }).text ?? 'Task'),
          done: Boolean(raw.done),
          dependsOn,
          connectorSides: sanitizeConnectorSides(raw.connectorSides, new Set(dependsOn)),
          state: raw.done ? 'done' : dependsOn.length ? 'blocked' : 'ready',
          priority: (raw as { priority?: 'low' | 'normal' | 'high' }).priority ?? 'normal',
          dueDate: typeof (raw as { dueDate?: unknown }).dueDate === 'string' ? (raw as { dueDate: string }).dueDate : undefined,
        });
        break;
      }
      case 'mindmap':
        output.push({
          ...base,
          type: 'mindmap',
          text: String((raw as { text?: unknown }).text ?? 'Idea'),
          parentId: (raw as { parentId?: string | null }).parentId ?? null,
          collapsed: Boolean((raw as { collapsed?: boolean }).collapsed),
          branchColor:
            (raw as { branchColor?: string }).branchColor ??
            PALETTE[index % PALETTE.length],
        });
        break;
      case 'region':
        output.push({
          ...base,
          type: 'region',
          label: String((raw as { label?: unknown }).label ?? 'Region'),
          opacity: typeof raw.opacity === 'number' ? clamp(raw.opacity, 0, 1) : 0.16,
        });
        break;
      case 'shape':
        output.push({
          ...base,
          type: 'shape',
          shape: (raw as { shape?: 'rect' | 'ellipse' | 'line' }).shape ?? 'rect',
          borderColor: validColor((raw as { borderColor?: unknown }).borderColor, colors.ink),
        });
        break;
      case 'drawing':
        output.push({
          ...base,
          type: 'drawing',
          paths: Array.isArray((raw as { paths?: unknown }).paths)
            ? ((raw as { paths: UnknownPath[] }).paths).map((path) => ({
                color: validColor(path.color, colors.ink) ?? colors.ink,
                width: clamp(finite(path.width, 3), 1, 80),
                mode: path.mode ?? 'pen',
                points: Array.isArray(path.points)
                  ? path.points
                      .map((point) => ({ x: finite(point.x, NaN), y: finite(point.y, NaN) }))
                      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
                      .map((point) => ({ x: clamp(point.x, -100000, 100000), y: clamp(point.y, -100000, 100000) }))
                  : [],
              }))
            : [],
        });
        break;
      case 'file':
        output.push({
          ...base,
          type: 'file',
          name: String((raw as { name?: unknown }).name ?? 'File'),
          uri: String((raw as { uri?: unknown }).uri ?? ''),
          mimeType: (raw as { mimeType?: string }).mimeType,
          size: (raw as { size?: number }).size,
        });
        break;
      case 'folder':
        output.push({
          ...base,
          type: 'folder',
          name: String((raw as { name?: unknown }).name ?? 'Folder'),
          fileCount: Number((raw as { fileCount?: unknown }).fileCount ?? 0),
        });
        break;
      case 'audio':
      case 'pdf':
      case 'markdown':
        output.push({
          ...base,
          type: raw.type,
          name: String((raw as { name?: unknown }).name ?? raw.type),
          text: (raw as { text?: string }).text,
          uri: typeof (raw as { uri?: unknown }).uri === 'string' ? (raw as { uri: string }).uri : undefined,
          mimeType: typeof (raw as { mimeType?: unknown }).mimeType === 'string' ? (raw as { mimeType: string }).mimeType : undefined,
          size: typeof (raw as { size?: unknown }).size === 'number' ? (raw as { size: number }).size : undefined,
        });
        break;
      default:
        break;
    }
  });

  const withMigratedMindmaps = [...output];
  source.forEach((raw) => {
    if (raw.type !== 'mindmap' || !raw.id || !Array.isArray(raw.children)) return;
    raw.children.forEach((childText, index) => {
      if (!childText) return;
      withMigratedMindmaps.push({
        id: uniqueId(undefined, 'mindmap', usedIds),
        type: 'mindmap',
        x: Number(raw.x ?? 0) + 260,
        y: Number(raw.y ?? 0) + index * 92 - 46,
        width: 220,
        height: 70,
        zIndex: Number(raw.zIndex ?? 1) + index + 1,
        backgroundColor: colors.paperStrong,
        color: colors.ink,
        text: String(childText),
        parentId: typeof raw.id === 'string' ? raw.id : null,
        collapsed: false,
        branchColor: PALETTE[index % PALETTE.length],
      });
    });
  });

  const validIds = new Set(withMigratedMindmaps.map((item) => item.id));
  return withMigratedMindmaps.map((item) => {
    if (item.type === 'task') {
      const dependsOn = Array.from(new Set(item.dependsOn.filter((id) => validIds.has(id) && id !== item.id)));
      return {
        ...item,
        dependsOn,
        connectorSides: sanitizeConnectorSides(item.connectorSides, new Set(dependsOn)),
        state: taskState(item.done, dependsOn, withMigratedMindmaps),
      } satisfies TaskItem;
    }
    if (item.type === 'mindmap') {
      const parentId = item.parentId && validIds.has(item.parentId) && item.parentId !== item.id ? item.parentId : null;
      return { ...item, parentId } satisfies MindMapItem;
    }
    return item;
  });
}

export function migrateBoards(raw: unknown): Board[] {
  const boards = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { boards?: unknown }).boards)
      ? (raw as { boards: unknown[] }).boards
      : [];

  const usedBoardIds = new Set<string>();
  return boards
    .filter((board): board is Partial<Board> & { id?: string; name?: string } => Boolean(board))
    .map((board, index) => ({
      id: uniqueId(board.id, 'board', usedBoardIds),
      name: board.name ?? `Board ${index + 1}`,
      items: normalizeBoardItems((board as { items?: unknown }).items),
      updatedAt: Number((board as { updatedAt?: unknown }).updatedAt ?? Date.now()),
    }));
}

export function mindMapDescendantIds(items: BoardItem[], rootId: string): string[] {
  const descendants: string[] = [];
  const visited = new Set<string>([rootId]);
  const visit = (id: string) => {
    items.forEach((item) => {
      if (item.type === 'mindmap' && item.parentId === id && !visited.has(item.id)) {
        visited.add(item.id);
        descendants.push(item.id);
        visit(item.id);
      }
    });
  };
  visit(rootId);
  return descendants;
}

export function hiddenMindMapIds(items: BoardItem[]): Set<string> {
  const hidden = new Set<string>();
  items.forEach((item) => {
    if (item.type === 'mindmap' && item.collapsed) {
      mindMapDescendantIds(items, item.id).forEach((id) => hidden.add(id));
    }
  });
  return hidden;
}
