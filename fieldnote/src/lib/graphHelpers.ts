import { BoardItem } from '../types';

export function hasDependencyPath(items: BoardItem[], fromId: string, targetId: string): boolean {
  const visited = new Set<string>();
  const walk = (id: string): boolean => {
    if (visited.has(id)) return false;
    visited.add(id);
    const task = items.find((item) => item.type === 'task' && item.id === id);
    if (!task || task.type !== 'task') return false;
    if (task.dependsOn.includes(targetId)) return true;
    return task.dependsOn.some((depId) => walk(depId));
  };
  return walk(fromId);
}

export function blockedTaskDetails(taskId: string, items: BoardItem[]) {
  const done = new Set(items.filter((item) => item.type === 'task' && item.done).map((item) => item.id));
  const task = items.find((item) => item.id === taskId && item.type === 'task');
  if (!task || task.type !== 'task') return [];
  return task.dependsOn
    .filter((depId) => !done.has(depId))
    .map((depId) => {
      const dep = items.find((item) => item.id === depId && item.type === 'task');
      return dep?.type === 'task' ? dep.text || 'Untitled task' : depId;
    });
}

export function expandLockedMindmapMoveIds(items: BoardItem[], ids: string[], descendants: (items: BoardItem[], id: string) => string[]) {
  const output = new Set(ids);
  ids.forEach((id) => descendants(items, id).forEach((childId) => output.add(childId)));
  return Array.from(output);
}
