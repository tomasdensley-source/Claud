import { useMemo, useState } from 'react';
import { useAppState } from '../store';
import { useNav } from '../nav';
import { STAGES, STAGE_LABEL, FLAG_LABEL, type FlagKey, type Gig, type Stage } from '../types';
import { Chip, Empty, GigRow, Header } from '../ui/kit';
import { Icon } from '../ui/Icon';

type FlagFilter = 'all' | FlagKey;

export function Pipeline() {
  const s = useAppState();
  const nav = useNav();
  const [flag, setFlag] = useState<FlagFilter>('all');
  const [openStages, setOpenStages] = useState<Record<Stage, boolean>>({
    not_started: false,
    researching: true,
    signed_up: true,
    active: true,
    first_job: true,
    earning: true,
  });

  const filtered = useMemo(
    () =>
      s.gigs.filter((g) => {
        if (flag === 'all') return !g.flags.closed;
        return g.flags[flag];
      }),
    [s, flag],
  );

  const byStage = useMemo(() => {
    const m = new Map<Stage, Gig[]>(STAGES.map((st) => [st, []]));
    for (const g of filtered) m.get(g.stage)!.push(g);
    for (const list of m.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [filtered]);

  const flagCounts = useMemo(() => {
    const c: Record<FlagKey, number> = { waitingOnMe: 0, waitingOnThem: 0, waitlisted: 0, blocked: 0, closed: 0 };
    for (const g of s.gigs) for (const k of Object.keys(c) as FlagKey[]) if (g.flags[k]) c[k]++;
    return c;
  }, [s]);

  const order: Stage[] = [...STAGES].reverse();
  const total = filtered.length;

  return (
    <div className="screen">
      <Header title="Pipeline" subtitle={`${total} gigs ${flag === 'all' ? 'in play' : 'shown'}`} />

      <div className="funnel" role="list">
        {order.map((st) => {
          const n = byStage.get(st)!.length;
          return (
            <button
              key={st}
              role="listitem"
              className={`funnel-step stage-${st}`}
              onClick={() => {
                setOpenStages((o) => ({ ...o, [st]: true }));
                document.getElementById(`stage-${st}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <strong>{n}</strong>
              <span>{STAGE_LABEL[st]}</span>
            </button>
          );
        })}
      </div>

      <div className="chips-scroll">
        <Chip on={flag === 'all'} onClick={() => setFlag('all')}>
          All open
        </Chip>
        {(['waitingOnMe', 'waitingOnThem', 'waitlisted', 'blocked', 'closed'] as FlagKey[]).map((k) => (
          <Chip key={k} on={flag === k} onClick={() => setFlag(flag === k ? 'all' : k)}>
            {FLAG_LABEL[k]} <span className="chip-count">{flagCounts[k]}</span>
          </Chip>
        ))}
      </div>

      {total === 0 && <Empty icon="pipeline" title="No gigs match" />}

      {order.map((st) => {
        const list = byStage.get(st)!;
        if (list.length === 0) return null;
        const isOpen = openStages[st] || flag !== 'all';
        return (
          <section key={st} id={`stage-${st}`} className="section">
            <button className="stage-head" onClick={() => setOpenStages((o) => ({ ...o, [st]: !isOpen }))} aria-expanded={isOpen}>
              <span className={`stage-dot stage-${st}`} />
              <h2>{STAGE_LABEL[st]}</h2>
              <span className="count">{list.length}</span>
              <Icon name={isOpen ? 'up' : 'down'} size={20} className="muted push-right" />
            </button>
            {isOpen && (
              <div className="card list">
                {list.map((g) => (
                  <GigRow key={g.id} gig={g} onOpen={() => nav.push({ kind: 'gig', id: g.id })} />
                ))}
              </div>
            )}
          </section>
        );
      })}
      <div className="bottom-space" />
    </div>
  );
}
