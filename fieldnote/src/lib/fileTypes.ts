import { BoardItem, DraftBoardItem, WorkingFileRecord } from '../types';
import { colors } from '../theme';
import { centerRect, staggerCenter } from './placement';

export type FileCardType = 'image' | 'file' | 'pdf' | 'audio' | 'markdown';

export type PickedFileLike = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  text?: string;
};

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
const MARKDOWN_EXT = /\.(md|markdown)$/i;

function humanFileSize(size?: number | null) {
  if (!size || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function classifyFile(mimeType?: string | null, name?: string | null): FileCardType {
  const mime = (mimeType ?? '').toLowerCase();
  const fileName = (name ?? '').toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic)$/i.test(fileName)) return 'image';
  if (mime.includes('pdf') || fileName.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('audio/') || AUDIO_EXT.test(fileName)) return 'audio';
  if (mime.includes('markdown') || mime === 'text/x-markdown' || MARKDOWN_EXT.test(fileName)) return 'markdown';
  return 'file';
}

export function isBoardFileItem(item: BoardItem): item is Extract<BoardItem, { type: FileCardType | 'folder' }> {
  return item.type === 'file' || item.type === 'folder' || item.type === 'image' || item.type === 'pdf' || item.type === 'audio' || item.type === 'markdown';
}

export function boardFileName(item: BoardItem): string {
  if (item.type === 'file' || item.type === 'folder' || item.type === 'pdf' || item.type === 'audio' || item.type === 'markdown') return item.name;
  if (item.type === 'image') return item.alt ?? 'Image';
  return item.type;
}

export function boardFileSearchText(item: BoardItem): string {
  if (!isBoardFileItem(item)) return '';
  const body = item.type === 'markdown' ? item.text ?? '' : '';
  const size = 'size' in item ? humanFileSize(item.size) ?? '' : '';
  const mime = 'mimeType' in item ? item.mimeType ?? '' : '';
  return [boardFileName(item), item.type, mime, size, body].join(' ').toLowerCase();
}

export function workingFileSearchText(file: WorkingFileRecord): string {
  return [file.name, file.mimeType ?? '', humanFileSize(file.size) ?? '', classifyFile(file.mimeType, file.name)].join(' ').toLowerCase();
}

export function defaultCardSize(file: PickedFileLike) {
  const kind = classifyFile(file.mimeType, file.name);
  if (kind !== 'image') return { width: 240, height: 120 };
  const width = 280;
  const ratio = file.width && file.height ? file.height / Math.max(file.width, 1) : 220 / 280;
  return { width, height: Math.max(120, Math.min(420, Math.round(width * ratio))) };
}

export function makeFileCardDrafts(files: PickedFileLike[], center: { x: number; y: number }): DraftBoardItem[] {
  return files.map((file, index) => {
    const type = classifyFile(file.mimeType, file.name);
    const size = defaultCardSize(file);
    const origin = files.length === 1 ? centerRect(center, size) : staggerCenter(center, size, index);
    const common = {
      ...origin,
      width: size.width,
      height: size.height,
      uri: file.uri,
      mimeType: file.mimeType ?? undefined,
      size: typeof file.size === 'number' ? file.size : undefined,
      backgroundColor: type === 'image' ? colors.paper : colors.paperStrong,
    };
    if (type === 'image') {
      return {
        ...common,
        type: 'image',
        alt: file.name ?? 'Image',
      } satisfies DraftBoardItem;
    }
    return {
      ...common,
      type,
      name: file.name ?? type,
      text: type === 'markdown' && file.text ? file.text : [file.mimeType ?? undefined, humanFileSize(file.size ?? undefined)].filter(Boolean).join(' · '),
    } satisfies DraftBoardItem;
  });
}

export function createWorkingFileRecords(files: PickedFileLike[]): Omit<WorkingFileRecord, 'id' | 'addedAt'>[] {
  return files.map((file) => ({
    name: file.name ?? file.uri.split('/').pop() ?? 'File',
    uri: file.uri,
    mimeType: file.mimeType ?? undefined,
    size: typeof file.size === 'number' ? file.size : undefined,
  }));
}
