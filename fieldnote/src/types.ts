export type ItemType =
  | 'text'
  | 'image'
  | 'task'
  | 'mindmap'
  | 'region'
  | 'shape'
  | 'drawing'
  | 'file'
  | 'folder'
  | 'connector';

export type TextRole = 'title' | 'body' | 'note';

export type ConnectorSide = 'left' | 'right' | 'top' | 'bottom' | 'center';

export interface BoardItemBase {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  backgroundColor?: string;
  color?: string;
  /** Nested region membership (colored frames hold children). */
  parentId?: string | null;
  locked?: boolean;
  opacity?: number;
}

export interface TextItem extends BoardItemBase {
  type: 'text';
  text: string;
  fontSize: number;
  role?: TextRole;
  fontWeight?: '400' | '500' | '600' | '700';
  /** Lightweight Markdown source (exportable). */
  markdown?: boolean;
}

export interface ImageItem extends BoardItemBase {
  type: 'image';
  uri: string;
  alt?: string;
  assetKey?: 'pottery' | 'wildflower';
}

export interface TaskItem extends BoardItemBase {
  type: 'task';
  text: string;
  done: boolean;
  /** Task IDs that must complete before this task can finish (water-flow). */
  dependsOn?: string[];
  markdown?: boolean;
}

export interface MindMapItem extends BoardItemBase {
  type: 'mindmap';
  text: string;
  children: string[];
  collapsed?: boolean;
  branchColor?: string;
}

export interface RegionItem extends BoardItemBase {
  type: 'region';
  label: string;
  /** Frame fill — regions take over background when zoomed into. */
  frameColor?: string;
}

export interface ShapeItem extends BoardItemBase {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'line';
}

export interface DrawingItem extends BoardItemBase {
  type: 'drawing';
  paths: { color: string; width: number; points: { x: number; y: number }[] }[];
}

export interface FileItem extends BoardItemBase {
  type: 'file';
  name: string;
  uri: string;
  mimeType?: string;
}

export interface FolderItem extends BoardItemBase {
  type: 'folder';
  name: string;
  fileCount: number;
}

export interface ConnectorItem extends BoardItemBase {
  type: 'connector';
  fromId: string;
  toId: string;
  fromSide?: ConnectorSide;
  toSide?: ConnectorSide;
  thickness?: number;
  /** When true, dependency edge is satisfied / glowing. */
  glowing?: boolean;
}

export type BoardItem =
  | TextItem
  | ImageItem
  | TaskItem
  | MindMapItem
  | RegionItem
  | ShapeItem
  | DrawingItem
  | FileItem
  | FolderItem
  | ConnectorItem;

export interface Board {
  id: string;
  name: string;
  items: BoardItem[];
  updatedAt: number;
  thumbnailUri?: string;
}

export interface AppState {
  boards: Board[];
  currentBoardId: string;
  selectedIds: string[];
  tool: 'select' | 'draw' | 'multi';
  drawColor: string;
  history: Board[][];
  future: Board[][];
}

export type DraftBoardItem = BoardItem extends infer T
  ? T extends BoardItem
    ? Omit<T, 'id' | 'zIndex'> & { id?: string; zIndex?: number }
    : never
  : never;

export type PanelKind =
  | null
  | 'add'
  | 'boards'
  | 'files'
  | 'search'
  | 'more'
  | 'gestures'
  | 'storage'
  | 'pasteAi'
  | 'export';

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContextualAddRequest {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  token: number;
}
