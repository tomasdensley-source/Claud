import { BoardItem, TaskItem } from '../types';

/** Water-flow task dependency helpers. */

export function isTask(item: BoardItem): item is TaskItem {
  return item.type === 'task';
}

export function taskMap(items: BoardItem[]): Map<string, TaskItem> {
  const map = new Map<string, TaskItem>();
  items.forEach((it) => {
    if (isTask(it)) map.set(it.id, it);
  });
  return map;
}

/** Root tasks (no deps) are always completable. */
export function isDependencySatisfied(
  task: TaskItem,
  tasks: Map<string, TaskItem>,
): boolean {
  const deps = task.dependsOn ?? [];
  if (deps.length === 0) return true;
  return deps.every((id) => {
    const dep = tasks.get(id);
    // Missing deps do not permanently block (deleted / corrupt ids).
    return !dep || dep.done === true;
  });
}

export function canCompleteTask(task: TaskItem, items: BoardItem[]): boolean {
  if (task.done) return true;
  return isDependencySatisfied(task, taskMap(items));
}

/** Incoming dependency edges that should glow because the source is done. */
export function glowingDependencyEdgeIds(items: BoardItem[]): Set<string> {
  const tasks = taskMap(items);
  const glowing = new Set<string>();
  for (const it of items) {
    if (it.type !== 'connector') continue;
    const from = tasks.get(it.fromId);
    const to = tasks.get(it.toId);
    if (!from || !to) continue;
    // Edge from dependency → dependent glows when dependency is complete.
    if (from.done && (to.dependsOn ?? []).includes(from.id)) {
      glowing.add(it.id);
    }
  }
  return glowing;
}

export function syncConnectorGlow(items: BoardItem[]): BoardItem[] {
  const glowing = glowingDependencyEdgeIds(items);
  return items.map((it) => {
    if (it.type !== 'connector') return it;
    const shouldGlow = glowing.has(it.id);
    return it.glowing === shouldGlow ? it : { ...it, glowing: shouldGlow };
  });
}
