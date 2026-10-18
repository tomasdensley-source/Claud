import { BoardItem, TaskItem } from '../types';

// A task is blocked while any task it depends on isn't done yet. Dependency
// ids that don't resolve to a task (deleted, foreign, or pointing at a
// non-task item) are ignored rather than treated as permanently blocking —
// a dangling reference shouldn't lock a task forever.
export function isTaskBlocked(task: TaskItem, items: BoardItem[]): boolean {
  if (!task.dependsOn || task.dependsOn.length === 0) return false;
  const byId = new Map(items.map((it) => [it.id, it]));
  return task.dependsOn.some((depId) => {
    const dep = byId.get(depId);
    return dep?.type === 'task' && !dep.done;
  });
}
