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
  | 'audio'
  | 'pdf'
  | 'markdown';

export type TextRole = 'title' | 'body' | 'note';
export type TextAlign = 'left' | 'center' | 'right';
export type TaskState = 'blocked' | 'ready' | 'done';
export type DrawMode = 'pen' | 'highlighter' | 'eraser';

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
  locked?: boolean;
  opacity?: number;
}

export interface TextItem extends BoardItemBase {
  type: 'text';
  text: string;
  fontSize: number;
  role?: TextRole;
  fontWeight?: '400' | '500' | '600' | '700';
  textAlign?: TextAlign;
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
  dependsOn: string[];
  state: TaskState;
}

export interface MindMapItem extends BoardItemBase {
  type: 'mindmap';
  text: string;
  parentId: string | null;
  collapsed?: boolean;
  branchColor: string;
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
  paths: {
    color: string;
    width: number;
    points: { x: number; y: number }[];
    mode?: DrawMode;
  }[];
}

export interface FileItem extends BoardItemBase {
  type: 'file';
  name: string;
  uri: string;
  mimeType?: string;
  size?: number;
}

export interface FolderItem extends BoardItemBase {
  type: 'folder';
  name: string;
  fileCount: number;
}

export interface StubItem extends BoardItemBase {
  type: 'audio' | 'pdf' | 'markdown';
  name: string;
  text?: string;
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
  | StubItem;

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
  drawWidth: number;
  drawMode: DrawMode;
  history: Board[][];
  future: Board[][];
}

export interface WorkingFileRecord {
  id: string;
  name: string;
  uri: string;
  mimeType?: string;
  size?: number;
  addedAt: number;
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
  | 'storage';
