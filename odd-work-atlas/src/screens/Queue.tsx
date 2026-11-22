import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addToQueue, reorderQueue, updateGig, useAppState } from '../store';
import { useNav } from '../nav';
import { matches, queue } from '../selectors';
import { recommendable } from '../metrics';
import type { Gig } from '../types';
import { Btn, Empty, Fab, FlagBadges, Header, StageRoute, Tile } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { tap } from '../native';

function Row({ gig, index }: { gig: Gig; index: number }) {
  const nav = useNav();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: gig.id });
  return (
    <div
      ref={setNodeRef}
      className={`queue-row ${isDragging ? 'dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button className="drag-handle" aria-label={`Drag to move ${gig.name}`} {...attributes} {...listeners}>
        <Icon name="grip" />
      </button>
      <span className="queue-num">{index + 1}</span>
      <button className="queue-main press" onClick={() => nav.push({ kind: 'gig', id: gig.id })}>
        <Tile gig={gig} size={52} />
        <div className="gig-row-main">
          <div className="gig-row-name">{gig.name}</div>
          <div className="gig-row-sub">{gig.nextStep || gig.description}</div>
          <div className="gig-row-foot">
            <StageRoute stage={gig.stage} />
            <span className="badges"><FlagBadges gig={gig} /></span>
          </div>
        </div>
      </button>
      <button
        className={`icon-btn pin-btn ${gig.pinned ? 'on' : ''}`}
        aria-label={gig.pinned ? `Unpin ${gig.name}` : `Pin ${gig.name} to the top`}
        aria-pressed={gig.pinned}
        onClick={() => { tap(); updateGig(gig.id, { pinned: !gig.pinned }); }}
      >
        <Icon name="pin" size={20} />
      </button>
    </div>
  );
}

function AddSheet({ close }: { close: () => void }) {
  const s = useAppState();
  const nav = useNav();
  const [q, setQ] = useState('');
  const cache = useMemo(() => new Map<string, string>(), []);
  const options = useMemo(
    () =>
      s.gigs
        .filter((g) => g.queuePosition == null && recommendable(g) && matches(g, q, cache))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 40),
    [s, q, cache],
  );
  return (
    <div className="stack">
      <input
        className="input search-input"
        placeholder="Find a gig to add"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
        enterKeyHint="search"
      />
      <p className="hint">Closed gigs and plasma records cannot be queued.</p>
      <div className="card list">
        {options.map((g) => (
          <button
            key={g.id}
            className="gig-row compact"
            onClick={() => {
              addToQueue(g.id);
              nav.toast(`Added ${g.name}`);
              close();
            }}
          >
            <Tile gig={g} size={40} />
            <div className="gig-row-main">
              <div className="gig-row-name">{g.name}</div>
              <div className="gig-row-sub">{g.category}</div>
            </div>
            <Icon name="plus" size={20} className="accent" />
          </button>
        ))}
        {options.length === 0 && <Empty icon="search" title="No match" />}
      </div>
    </div>
  );
}

export function Queue() {
  const s = useAppState();
  const nav = useNav();
  const list = useMemo(() => queue(s), [s]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = list.map((g) => g.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    reorderQueue(arrayMove(ids, from, to));
    tap();
  };

  return (
    <>
    <div className="screen">
      <Header title="Priority queue" subtitle="Pinned gigs stay on top. Drag the handle to reorder." />
      {list.length === 0 ? (
        <>
          <Empty icon="queue" title="Your queue is empty" body="Add the gigs you want to apply to or work next." />
          <div className="pad">
            <Btn kind="primary" full icon="plus" onClick={() => nav.openSheet({ title: 'Add to queue', render: (close) => <AddSheet close={close} /> })}>
              Add a gig
            </Btn>
          </div>
        </>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <div className="card list queue-list">
              {list.map((g, i) => (
                <Row key={g.id} gig={g} index={i} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <div className="bottom-space fab-space" />
    </div>
    <Fab label="Add a gig" icon="plus" onClick={() => nav.openSheet({ title: 'Add to queue', render: (close) => <AddSheet close={close} /> })} />
    </>
  );
}
