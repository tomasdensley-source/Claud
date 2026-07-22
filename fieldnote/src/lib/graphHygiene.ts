import { BoardItem, ConnectorItem, MindMapItem, TaskItem } from '../types';

/** Remove dangling graph refs after deletions. */
export function pruneDeletedIds(items: BoardItem[], deleted: Set<string>): BoardItem[] {
  if (deleted.size === 0) return items;
  return items
    .filter((it) => !deleted.has(it.id))
    .map((it) => {
      if (it.type === 'connector') {
        const c = it as ConnectorItem;
        if (deleted.has(c.fromId) || deleted.has(c.toId)) return null;
        return it;
      }
      if (it.type === 'task') {
        const t = it as TaskItem;
        const dependsOn = (t.dependsOn ?? []).filter((id) => !deleted.has(id));
        if (dependsOn.length === (t.dependsOn ?? []).length) return it;
        return { ...t, dependsOn };
      }
      if (it.type === 'mindmap') {
        const m = it as MindMapItem;
        const children = m.children.filter((id) => !deleted.has(id));
        const parentId = m.parentId && deleted.has(m.parentId) ? null : m.parentId;
        if (children.length === m.children.length && parentId === m.parentId) return it;
        return { ...m, children, parentId };
      }
      if (it.parentId && deleted.has(it.parentId)) {
        return { ...it, parentId: null };
      }
      return it;
    })
    .filter((it): it is BoardItem => it != null);
}

/** Remap graph fields after duplication / import id rewrite. */
export function remapIds(items: BoardItem[], idMap: Map<string, string>): BoardItem[] {
  if (idMap.size === 0) return items;
  const mapOne = (id: string) => idMap.get(id) ?? id;
  return items.map((it) => {
    const id = mapOne(it.id);
    const parentId =
      it.parentId != null ? (deletedOrMap(it.parentId, idMap) as string | null) : it.parentId;
    if (it.type === 'connector') {
      return {
        ...it,
        id,
        parentId,
        fromId: mapOne(it.fromId),
        toId: mapOne(it.toId),
      };
    }
    if (it.type === 'task') {
      return {
        ...it,
        id,
        parentId,
        dependsOn: (it.dependsOn ?? []).map(mapOne),
      };
    }
    if (it.type === 'mindmap') {
      return {
        ...it,
        id,
        parentId,
        children: it.children.map(mapOne),
      };
    }
    return { ...it, id, parentId };
  });
}

function deletedOrMap(id: string, idMap: Map<string, string>): string | null {
  return idMap.has(id) ? idMap.get(id)! : id;
}

/** Ensure incoming items don't collide with existing ids; remap graph fields. */
export function ensureUniqueIds(
  incoming: BoardItem[],
  existingIds: Set<string>,
): { items: BoardItem[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();
  const used = new Set(existingIds);
  for (const it of incoming) {
    if (!used.has(it.id)) {
      used.add(it.id);
      continue;
    }
    const base = it.id.replace(/-\d+$/, '');
    let n = 1;
    let next = `${base}-${n}`;
    while (used.has(next)) {
      n += 1;
      next = `${base}-${n}`;
    }
    idMap.set(it.id, next);
    used.add(next);
  }
  const remapped = incoming.map((it) => {
    const id = idMap.get(it.id) ?? it.id;
    return id === it.id ? it : { ...it, id };
  });
  return { items: remapIds(remapped, idMap), idMap };
}

/** When duplicating a mindmap root, include its descendant mindmap ids. */
export function expandMindMapSelection(items: BoardItem[], selectedIds: string[]): string[] {
  const maps = items.filter((it): it is MindMapItem => it.type === 'mindmap');
  const byId = new Map(maps.map((m) => [m.id, m]));
  const out = new Set(selectedIds);
  const walk = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    out.add(id);
    node.children.forEach(walk);
  };
  selectedIds.forEach((id) => {
    if (byId.has(id)) walk(id);
  });
  return Array.from(out);
}
