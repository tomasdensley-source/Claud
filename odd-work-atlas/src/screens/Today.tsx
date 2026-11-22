import { useMemo } from 'react';
import { bumpDailyCount, dailyCount, useAppState } from '../store';
import { useNav } from '../nav';
import { earnNow, upcoming, waitingOnMe, waitingOnThem } from '../selectors';
import { money, perHour, prettyDate, prettyTime, rates, todayISO } from '../metrics';
import { Empty, GigRow, Header, Section, Tile } from '../ui/kit';
import { Icon } from '../ui/Icon';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Today() {
  const s = useAppState();
  const nav = useNav();
  const today = todayISO();

  const earn = useMemo(() => earnNow(s), [s]);
  const mine = useMemo(() => waitingOnMe(s), [s]);
  const theirs = useMemo(() => waitingOnThem(s), [s]);
  const events = useMemo(() => upcoming(s, today, 7), [s, today]);
  const capped = useMemo(() => s.gigs.filter((g) => g.dailyCap != null && !g.flags.closed), [s]);

  const monthPrefix = today.slice(0, 7);
  const month = useMemo(
    () => rates(s.gigs.flatMap((g) => g.jobs.filter((j) => j.date.startsWith(monthPrefix)))),
    [s, monthPrefix],
  );

  const open = (id: string) => nav.push({ kind: 'gig', id });
  const dateLine = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="screen">
      <Header
        title={greeting()}
        subtitle={dateLine}
        actions={
          <button className="icon-btn" aria-label="More" onClick={() => nav.push({ kind: 'more' })}>
            <Icon name="more" />
          </button>
        }
      />

      <div className="hero">
        <div className="hero-row">
          <div>
            <div className="hero-label">Earned this month</div>
            <div className="hero-value">{money(month.gross)}</div>
          </div>
          <div className="hero-side">
            <div className="hero-label">Door to door</div>
            <div className="hero-side-value">{perHour(month.perHour)}</div>
          </div>
        </div>
        <div className="hero-pills">
          <button className="hero-pill" onClick={() => document.getElementById('earn')?.scrollIntoView({ behavior: 'smooth' })}>
            <strong>{earn.length}</strong> can earn now
          </button>
          <button className="hero-pill" onClick={() => document.getElementById('mine')?.scrollIntoView({ behavior: 'smooth' })}>
            <strong>{mine.length}</strong> your move
          </button>
          <button className="hero-pill" onClick={() => document.getElementById('theirs')?.scrollIntoView({ behavior: 'smooth' })}>
            <strong>{theirs.length}</strong> their move
          </button>
        </div>
      </div>

      {events.length > 0 && (
        <Section title="On the calendar" count={events.length}>
          <div className="card list">
            {events.map(({ gig, event }) => (
              <button key={event.id} className="event-row" onClick={() => open(gig.id)}>
                <div className={`event-date ${event.date === today ? 'is-today' : ''}`}>
                  <span>{event.date === today ? 'Today' : prettyDate(event.date).split(',')[0]}</span>
                  <strong>{event.time ? prettyTime(event.time) : 'All day'}</strong>
                </div>
                <div className="event-main">
                  <div className="event-title">{event.title}</div>
                  <div className="event-sub">{gig.name} · {prettyDate(event.date)}</div>
                </div>
                <Icon name="chevron" size={20} className="muted" />
              </button>
            ))}
          </div>
        </Section>
      )}

      {capped.map((g) => {
        const n = dailyCount(g.id, today);
        const cap = g.dailyCap!;
        return (
          <div key={g.id} className="card cap-card">
            <Tile gig={g} size={44} />
            <div className="cap-main">
              <div className="cap-title">{g.name} today</div>
              <div className="cap-sub">
                {n >= cap ? 'Daily limit reached. Try again tomorrow.' : `${cap - n} of ${cap} applications left today`}
              </div>
              <div className="meter" aria-hidden="true">
                {Array.from({ length: cap }, (_, i) => (
                  <span key={i} className={i < n ? 'on' : ''} />
                ))}
              </div>
            </div>
            <div className="cap-actions">
              <button className="round-btn" aria-label="Remove one" disabled={n === 0} onClick={() => bumpDailyCount(g.id, -1)}>
                −
              </button>
              <button className="round-btn primary" aria-label="I sent one" disabled={n >= cap} onClick={() => bumpDailyCount(g.id, 1)}>
                +
              </button>
            </div>
          </div>
        );
      })}

      <div id="earn" />
      <Section title="Earn now" count={earn.length}>
        {earn.length === 0 ? (
          <Empty icon="money" title="Nothing open to earn on" body="Gigs show here when they are active and above your floor." />
        ) : (
          <div className="card list">
            {earn.map((g) => {
              const r = rates(g.jobs);
              return (
                <GigRow
                  key={g.id}
                  gig={g}
                  onOpen={() => open(g.id)}
                  right={
                    r.perHour == null ? undefined : (
                      <div className="rate-col">
                        <strong>{money(r.perHour, 0)}</strong>
                        <span>per hour</span>
                      </div>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </Section>

      <div id="mine" />
      <Section title="Your move" count={mine.length}>
        {mine.length === 0 ? (
          <Empty icon="check" title="Nothing is waiting on you" />
        ) : (
          <div className="card list">
            {mine.slice(0, 8).map((g) => (
              <GigRow key={g.id} gig={g} onOpen={() => open(g.id)} sub={g.nextStep || g.description} />
            ))}
            {mine.length > 8 && (
              <button className="list-more" onClick={() => nav.setTab('pipeline')}>
                See all {mine.length} in Pipeline
              </button>
            )}
          </div>
        )}
      </Section>

      <div id="theirs" />
      <Section title="Their move" count={theirs.length}>
        {theirs.length === 0 ? (
          <Empty icon="hourglass" title="Nothing is waiting on them" />
        ) : (
          <div className="card list">
            {theirs.map((g) => (
              <GigRow key={g.id} gig={g} onOpen={() => open(g.id)} sub={g.nextStep || g.description} />
            ))}
          </div>
        )}
      </Section>
      <div className="bottom-space" />
    </div>
  );
}
