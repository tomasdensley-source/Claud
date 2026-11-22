import { useMemo, useState } from 'react';
import { useAppState } from '../store';
import { useNav } from '../nav';
import { money, perHour, perMile, rates, todayISO, type Rates } from '../metrics';
import type { Gig } from '../types';
import { Chip, Empty, Header, Section, Stat, Tile } from '../ui/kit';

type Range = 'month' | 'week' | 'year' | 'all';
const RANGE_LABEL: Record<Range, string> = { week: 'Last 7 days', month: 'This month', year: 'This year', all: 'All time' };

function inRange(date: string, range: Range): boolean {
  const today = todayISO();
  if (range === 'all') return true;
  if (range === 'month') return date.startsWith(today.slice(0, 7));
  if (range === 'year') return date.startsWith(today.slice(0, 4));
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return date >= todayISO(d) && date <= today;
}

export function Money() {
  const s = useAppState();
  const nav = useNav();
  const [range, setRange] = useState<Range>('month');

  const perGig = useMemo(() => {
    const rows: { gig: Gig; r: Rates }[] = [];
    for (const g of s.gigs) {
      const jobs = g.jobs.filter((j) => inRange(j.date, range));
      if (jobs.length) rows.push({ gig: g, r: rates(jobs) });
    }
    return rows.sort((a, b) => b.r.gross - a.r.gross);
  }, [s, range]);

  const total = useMemo(
    () => rates(s.gigs.flatMap((g) => g.jobs.filter((j) => inRange(j.date, range)))),
    [s, range],
  );

  const withHour = perGig.filter((x) => x.r.perHour != null).sort((a, b) => b.r.perHour! - a.r.perHour!);
  const withMile = perGig.filter((x) => x.r.perMile != null).sort((a, b) => b.r.perMile! - a.r.perMile!);
  const worstHour = withHour[withHour.length - 1];
  const worstMile = withMile[withMile.length - 1];
  const maxGross = Math.max(1, ...perGig.map((x) => x.r.gross));

  return (
    <div className="screen">
      <Header title="Money" subtitle="Door to door, from home and back" />
      <div className="chips-scroll">
        {(Object.keys(RANGE_LABEL) as Range[]).map((k) => (
          <Chip key={k} on={range === k} onClick={() => setRange(k)}>
            {RANGE_LABEL[k]}
          </Chip>
        ))}
      </div>

      <div className="hero">
        <div className="hero-label">{RANGE_LABEL[range]}</div>
        <div className="hero-value">{money(total.gross, 2)}</div>
        <div className="hero-grid">
          <div>
            <span>Per hour</span>
            <strong>{perHour(total.perHour)}</strong>
          </div>
          <div>
            <span>Per mile</span>
            <strong>{perMile(total.perMile)}</strong>
          </div>
          <div>
            <span>Jobs</span>
            <strong>{total.jobs}</strong>
          </div>
          <div>
            <span>Hours</span>
            <strong>{total.hours.toFixed(1)}</strong>
          </div>
        </div>
      </div>

      {perGig.length === 0 ? (
        <Empty icon="money" title="No jobs logged in this range" body="Open a gig and tap Add job after each shift. The math does the rest." />
      ) : (
        <>
          <Section title="Best and worst">
            <div className="stats">
              <Stat label={`Best per hour: ${withHour[0]?.gig.name ?? ''}`} value={perHour(withHour[0]?.r.perHour ?? null)} tone="good" />
              <Stat label={`Best per mile: ${withMile[0]?.gig.name ?? ''}`} value={perMile(withMile[0]?.r.perMile ?? null)} tone="good" />
              {withHour.length > 1 && (
                <Stat label={`Lowest per hour: ${worstHour.gig.name}`} value={perHour(worstHour.r.perHour)} tone="bad" />
              )}
              {withMile.length > 1 && (
                <Stat label={`Lowest per mile: ${worstMile.gig.name}`} value={perMile(worstMile.r.perMile)} tone="bad" />
              )}
            </div>
          </Section>

          <Section title="By gig" count={perGig.length}>
            <div className="card list">
              {perGig.map(({ gig, r }) => (
                <button key={gig.id} className="money-row" onClick={() => nav.push({ kind: 'gig', id: gig.id })}>
                  <Tile gig={gig} size={44} />
                  <div className="money-main">
                    <div className="money-top">
                      <strong>{gig.name}</strong>
                      <strong>{money(r.gross, 2)}</strong>
                    </div>
                    <div className="bar"><span style={{ width: `${(r.gross / maxGross) * 100}%` }} /></div>
                    <div className="money-sub">
                      {perHour(r.perHour)}, {perMile(r.perMile)}, {r.jobs} job{r.jobs === 1 ? '' : 's'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        </>
      )}
      <div className="bottom-space" />
    </div>
  );
}
