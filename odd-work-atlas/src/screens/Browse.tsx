import { useMemo, useState } from 'react';
import { categories, useAppState } from '../store';
import { useNav } from '../nav';
import { matches } from '../selectors';
import { money, rates } from '../metrics';
import { FLAG_KEYS, FLAG_LABEL, STAGES, STAGE_LABEL, type FlagKey, type Gig, type Stage } from '../types';
import { Btn, Chip, Empty, GigRow, Header } from '../ui/kit';
import { Icon } from '../ui/Icon';

type Sort = 'name' | 'perHour' | 'perMile' | 'updated';
const SORT_LABEL: Record<Sort, string> = {
  name: 'Name',
  perHour: '$ per hour',
  perMile: '$ per mile',
  updated: 'Recently updated',
};

interface Filters {
  stages: Stage[];
  cats: string[];
  flags: FlagKey[];
  app: 'any' | 'has' | 'none';
  lists: string[];
  showClosed: boolean;
}

const EMPTY: Filters = { stages: [], cats: [], flags: [], app: 'any', lists: [], showClosed: true };

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function FilterSheet({ value, onChange, allCats, allLists }: { value: Filters; onChange: (f: Filters) => void; allCats: string[]; allLists: string[] }) {
  const [f, setF] = useState(value);
  const set = (next: Filters) => {
    setF(next);
    onChange(next);
  };
  return (
    <div className="stack">
      <div className="filter-group">
        <h3>Stage</h3>
        <div className="chips-wrap">
          {STAGES.map((st) => (
            <Chip key={st} on={f.stages.includes(st)} onClick={() => set({ ...f, stages: toggle(f.stages, st) })}>
              {STAGE_LABEL[st]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h3>Status</h3>
        <div className="chips-wrap">
          {FLAG_KEYS.map((k) => (
            <Chip key={k} on={f.flags.includes(k)} onClick={() => set({ ...f, flags: toggle(f.flags, k) })}>
              {FLAG_LABEL[k]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h3>App</h3>
        <div className="chips-wrap">
          <Chip on={f.app === 'has'} onClick={() => set({ ...f, app: f.app === 'has' ? 'any' : 'has' })}>Has app</Chip>
          <Chip on={f.app === 'none'} onClick={() => set({ ...f, app: f.app === 'none' ? 'any' : 'none' })}>No app</Chip>
        </div>
      </div>
      {allLists.length > 0 && (
        <div className="filter-group">
          <h3>Saved lists</h3>
          <div className="chips-wrap">
            {allLists.map((l) => (
              <Chip key={l} on={f.lists.includes(l)} onClick={() => set({ ...f, lists: toggle(f.lists, l) })}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className="filter-group">
        <h3>Category</h3>
        <div className="chips-wrap">
          {allCats.map((c) => (
            <Chip key={c} on={f.cats.includes(c)} onClick={() => set({ ...f, cats: toggle(f.cats, c) })}>
              {c}
            </Chip>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h3>Closed gigs</h3>
        <div className="chips-wrap">
          <Chip on={f.showClosed} onClick={() => set({ ...f, showClosed: !f.showClosed })}>Include closed</Chip>
        </div>
      </div>
      <Btn kind="ghost" full onClick={() => set(EMPTY)}>Clear all filters</Btn>
    </div>
  );
}

export function Browse() {
  const s = useAppState();
  const nav = useNav();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [f, setF] = useState<Filters>(EMPTY);

  const allCats = useMemo(() => categories(s), [s]);
  const allLists = useMemo(() => [...new Set(s.gigs.flatMap((g) => g.lists))].sort(), [s]);
  // Search text cache is rebuilt whenever data changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cache = useMemo(() => new Map<string, string>(), [s]);

  const results = useMemo(() => {
    const r = s.gigs.filter((g) => {
      if (!f.showClosed && g.flags.closed) return false;
      if (f.stages.length && !f.stages.includes(g.stage)) return false;
      if (f.cats.length && !f.cats.includes(g.category)) return false;
      if (f.flags.length && !f.flags.some((k) => g.flags[k])) return false;
      if (f.app === 'has' && !g.appUrl) return false;
      if (f.app === 'none' && g.appUrl) return false;
      if (f.lists.length && !f.lists.some((l) => g.lists.includes(l))) return false;
      return matches(g, q, cache);
    });
    const ph = (g: Gig) => rates(g.jobs).perHour ?? -1;
    const pm = (g: Gig) => rates(g.jobs).perMile ?? -1;
    r.sort((a, b) => {
      if (sort === 'perHour') return ph(b) - ph(a) || a.name.localeCompare(b.name);
      if (sort === 'perMile') return pm(b) - pm(a) || a.name.localeCompare(b.name);
      if (sort === 'updated') return b.updatedAt - a.updatedAt;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return r;
  }, [s, f, q, sort, cache]);

  const activeCount = f.stages.length + f.cats.length + f.flags.length + f.lists.length + (f.app !== 'any' ? 1 : 0) + (f.showClosed ? 0 : 1);

  const openFilters = () =>
    nav.openSheet({
      title: 'Filters',
      render: () => <FilterSheet value={f} onChange={setF} allCats={allCats} allLists={allLists} />,
    });

  return (
    <div className="screen">
      <Header title="Search" subtitle={`${results.length} of ${s.gigs.length} gigs`} />
      <div className="search-bar">
        <div className="search-wrap">
          <Icon name="search" size={20} className="muted" />
          <input
            className="search-field"
            type="search"
            placeholder="Name, note, pay, anything"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
            aria-label="Search all gigs"
          />
          {q && (
            <button className="icon-btn small" aria-label="Clear search" onClick={() => setQ('')}>
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <button className={`filter-btn ${activeCount ? 'on' : ''}`} onClick={openFilters} aria-label="Filters">
          <Icon name="filter" size={20} />
          {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        </button>
      </div>

      <div className="chips-scroll">
        {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
          <Chip key={k} on={sort === k} onClick={() => setSort(k)}>
            {SORT_LABEL[k]}
          </Chip>
        ))}
      </div>

      {activeCount > 0 && (
        <div className="chips-scroll active-filters">
          {f.stages.map((st) => (
            <Chip key={st} on onClick={() => setF({ ...f, stages: toggle(f.stages, st) })}>{STAGE_LABEL[st]}</Chip>
          ))}
          {f.flags.map((k) => (
            <Chip key={k} on onClick={() => setF({ ...f, flags: toggle(f.flags, k) })}>{FLAG_LABEL[k]}</Chip>
          ))}
          {f.app !== 'any' && <Chip on onClick={() => setF({ ...f, app: 'any' })}>{f.app === 'has' ? 'Has app' : 'No app'}</Chip>}
          {f.lists.map((l) => (
            <Chip key={l} on onClick={() => setF({ ...f, lists: toggle(f.lists, l) })}>{l}</Chip>
          ))}
          {f.cats.map((c) => (
            <Chip key={c} on onClick={() => setF({ ...f, cats: toggle(f.cats, c) })}>{c}</Chip>
          ))}
          {!f.showClosed && <Chip on onClick={() => setF({ ...f, showClosed: true })}>Hiding closed</Chip>}
        </div>
      )}

      {results.length === 0 ? (
        <Empty icon="search" title="Nothing found" body="Try fewer words, or clear the filters." />
      ) : (
        <div className="card list">
          {results.map((g) => {
            const r = rates(g.jobs);
            const right =
              sort === 'perHour' || sort === 'perMile' ? (
                <div className="rate-col">
                  <strong>{sort === 'perHour' ? (r.perHour == null ? '–' : money(r.perHour, 0)) : r.perMile == null ? '–' : money(r.perMile, 2)}</strong>
                  <span>{sort === 'perHour' ? 'per hour' : 'per mile'}</span>
                </div>
              ) : undefined;
            return <GigRow key={g.id} gig={g} onOpen={() => nav.push({ kind: 'gig', id: g.id })} right={right} />;
          })}
        </div>
      )}
      <div className="bottom-space" />
    </div>
  );
}
