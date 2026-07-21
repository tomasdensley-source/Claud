export type Tool = 'select' | 'multi' | 'draw';

export type Panel =
  | null
  | 'add'
  | 'files'
  | 'find'
  | 'more'
  | 'textFormat'
  | 'draw'
  | 'gestures'
  | 'storage'
  | 'onboarding';

export type ObjectType =
  | 'text'
  | 'task'
  | 'image'
  | 'file'
  | 'pdf'
  | 'markdown'
  | 'mindmap'
  | 'region'
  | 'drawing'
  | 'shape'
  | 'connector';

export type TaskState = 'blocked' | 'ready' | 'done';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface BoardObjectBase {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  fill?: string;
  stroke?: string;
  locked?: boolean;
  opacity?: number;
}

export interface TextObject extends BoardObjectBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700;
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  color: string;
}

export interface TaskObject extends BoardObjectBase {
  type: 'task';
  text: string;
  done: boolean;
  state: TaskState;
  /** Upstream prerequisite task ids (water-flow) */
  dependsOn: string[];
}

export interface ImageObject extends BoardObjectBase {
  type: 'image';
  src: string;
  alt?: string;
}

export interface FileObject extends BoardObjectBase {
  type: 'file';
  name: string;
  mime?: string;
  src: string;
  size?: number;
}

export interface PdfObject extends BoardObjectBase {
  type: 'pdf';
  name: string;
  src: string;
  coverDataUrl?: string;
  pageCount?: number;
}

export interface MarkdownObject extends BoardObjectBase {
  type: 'markdown';
  name: string;
  content: string;
}

export interface MindMapObject extends BoardObjectBase {
  type: 'mindmap';
  text: string;
  parentId: string | null;
  collapsed?: boolean;
  branchColor: string;
}

export interface RegionObject extends BoardObjectBase {
  type: 'region';
  label: string;
  pattern?: 'solid' | 'dots' | 'grid';
}

export interface DrawingObject extends BoardObjectBase {
  type: 'drawing';
  paths: DrawPath[];
}

export interface ShapeObject extends BoardObjectBase {
  type: 'shape';
  shape: 'rect' | 'ellipse';
}

export interface ConnectorObject extends BoardObjectBase {
  type: 'connector';
  fromId: string;
  toId: string;
  fromSide: Side;
  toSide: Side;
  kind: 'default' | 'mindmap' | 'dependency';
  curved?: boolean;
}

export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface DrawPath {
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
  points: number[];
}

export type BoardObject =
  | TextObject
  | TaskObject
  | ImageObject
  | FileObject
  | PdfObject
  | MarkdownObject
  | MindMapObject
  | RegionObject
  | DrawingObject
  | ShapeObject
  | ConnectorObject;

export interface BoardSnapshot {
  id: string;
  name: string;
  updatedAt: number;
  camera: Camera;
  objects: BoardObject[];
}

export interface WorkingFile {
  id: string;
  name: string;
  mime?: string;
  src: string;
  coverDataUrl?: string;
  size?: number;
  createdAt: number;
}

export interface TextFormatPrefs {
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700;
  color: string;
  align: 'left' | 'center' | 'right';
}

export interface UiPrefs {
  toolbar: { x: number; y: number; collapsed: boolean };
  paletteOpen: boolean;
  lastColor: string;
  textFormat: TextFormatPrefs;
  draw: { color: string; width: number; tool: 'pen' | 'highlighter' | 'eraser' };
}
