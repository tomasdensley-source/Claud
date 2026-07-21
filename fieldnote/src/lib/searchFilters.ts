import { BoardItem } from '../types';
import { boardFileName, boardFileSearchText, isBoardFileItem } from './fileTypes';

export type SearchTypeFilter = 'everything' | 'text' | 'image' | 'file' | 'task' | 'mindmap' | 'region';

export function itemSearchText(item: BoardItem): string {
  if (item.type === 'text' || item.type === 'task' || item.type === 'mindmap') return item.text;
  if (isBoardFileItem(item)) return boardFileSearchText(item);
  if (item.type === 'region') return item.label;
  if (item.type === 'shape') return [item.type, item.shape].join(' ');
  if (item.type === 'drawing') return 'drawing sketch stroke';
  return 'item';
}

export function itemMatchesType(item: BoardItem, filter: SearchTypeFilter) {
  if (filter === 'everything') return true;
  if (filter === 'file') return isBoardFileItem(item);
  return item.type === filter;
}

export function itemMatchesSearch(item: BoardItem, query: string, filter: SearchTypeFilter = 'everything') {
  if (!itemMatchesType(item, filter)) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return itemSearchText(item).toLowerCase().includes(q);
}

export function searchResultLabel(item: BoardItem) {
  if (item.type === 'text' || item.type === 'task' || item.type === 'mindmap') return item.text.slice(0, 80) || 'Untitled';
  if (isBoardFileItem(item)) return boardFileName(item);
  if (item.type === 'region') return item.label;
  return item.type;
}

export function groupSearchResults(items: BoardItem[]) {
  return items.reduce<Record<string, BoardItem[]>>((groups, item) => {
    const key = isBoardFileItem(item) ? 'files' : item.type;
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {});
}
