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
};

type UnknownPath = {
  color?: string;
  width?: number;
  points?: { x?: number; y?: number }[];
  mode?: 'pen' | 'highlighter' | 'eraser';
};

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

  source.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object' || !raw.type) return;
    const base = {
      id: raw.id ?? uid(String(raw.type)),
      x: Number.isFinite(raw.x) ? Number(raw.x) : 80 + index * 24,
      y: Number.isFinite(raw.y) ? Number(raw.y) : 80 + index * 24,
      width: Number.isFinite(raw.width) ? Math.max(60, Number(raw.width)) : 260,
      height: Number.isFinite(raw.height) ? Math.max(50, Number(raw.height)) : 140,
      zIndex: Number.isFinite(raw.zIndex) ? Number(raw.zIndex) : index + 1,
      backgroundColor: raw.backgroundColor,
      color: raw.color,
      locked: Boolean(raw.locked),
      opacity: typeof raw.opacity === 'number' ? raw.opacity : undefined,
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
        const dependsOn = Array.isArray(raw.dependsOn) ? raw.dependsOn.filter(Boolean) : [];
        output.push({
          ...base,
          type: 'task',
          text: String((raw as { text?: unknown }).text ?? 'Task'),
          done: Boolean(raw.done),
          dependsOn,
          state: raw.done ? 'done' : dependsOn.length ? 'blocked' : 'ready',
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
          opacity: typeof raw.opacity === 'number' ? raw.opacity : 0.16,
        });
        break;
      case 'shape':
        output.push({
          ...base,
          type: 'shape',
          shape: (raw as { shape?: 'rect' | 'ellipse' | 'line' }).shape ?? 'rect',
        });
        break;
      case 'drawing':
        output.push({
          ...base,
          type: 'drawing',
          paths: Array.isArray((raw as { paths?: unknown }).paths)
            ? ((raw as { paths: UnknownPath[] }).paths).map((path) => ({
                color: path.color ?? colors.ink,
                width: Number(path.width ?? 3),
                mode: path.mode ?? 'pen',
                points: Array.isArray(path.points)
                  ? path.points.map((point) => ({
                      x: Number(point.x ?? 0),
                      y: Number(point.y ?? 0),
                    }))
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
        id: uid('mindmap'),
        type: 'mindmap',
        x: Number(raw.x ?? 0) + 260,
        y: Number(raw.y ?? 0) + index * 92 - 46,
        width: 220,
        height: 70,
        zIndex: Number(raw.zIndex ?? 1) + index + 1,
        backgroundColor: colors.paperStrong,
        color: colors.ink,
        text: String(childText),
        parentId: raw.id ?? null,
        collapsed: false,
        branchColor: PALETTE[index % PALETTE.length],
      });
    });
  });

  return withMigratedMindmaps.map((item) =>
    item.type === 'task'
      ? ({
          ...item,
          state: taskState(item.done, item.dependsOn, withMigratedMindmaps),
        } satisfies TaskItem)
      : item,
  );
}

export function migrateBoards(raw: unknown): Board[] {
  const boards = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { boards?: unknown }).boards)
      ? (raw as { boards: unknown[] }).boards
      : [];

  return boards
    .filter((board): board is Partial<Board> & { id?: string; name?: string } => Boolean(board))
    .map((board, index) => ({
      id: board.id ?? uid('board'),
      name: board.name ?? `Board ${index + 1}`,
      items: normalizeBoardItems((board as { items?: unknown }).items),
      updatedAt: Number((board as { updatedAt?: unknown }).updatedAt ?? Date.now()),
    }));
}

export function mindMapDescendantIds(items: BoardItem[], rootId: string): string[] {
  const descendants: string[] = [];
  const visit = (id: string) => {
    items.forEach((item) => {
      if (item.type === 'mindmap' && item.parentId === id) {
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
