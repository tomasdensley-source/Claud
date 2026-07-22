export type ItemType =
  | 'text'
  | 'image'
  | 'task'
  | 'mindmap'
  | 'region'
  | 'shape'
  | 'drawing'
  | 'file'
  | 'folder';

export type TextRole = 'title' | 'body' | 'note';

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
}

export interface TextItem extends BoardItemBase {
  type: 'text';
  text: string;
  fontSize: number;
  role?: TextRole;
  fontWeight?: '400' | '500' | '600' | '700';
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
}

export interface MindMapItem extends BoardItemBase {
  type: 'mindmap';
  text: string;
  children: string[];
}

export interface RegionItem extends BoardItemBase {
  type: 'region';
  label: string;
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

export type BoardItem =
  | TextItem
  | ImageItem
  | TaskItem
  | MindMapItem
  | RegionItem
  | ShapeItem
  | DrawingItem
  | FileItem
  | FolderItem;

export interface Board {
  id: string;
  name: string;
  items: BoardItem[];
  updatedAt: number;
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
export type PaletteTarget = 'frame' | 'body';

export type PanelKind =
  | null
  | 'add'
  | 'boards'
  | 'files'
  | 'search'
  | 'more'
  | 'gestures'
  | 'storage'
  | 'jsoncanvas';
