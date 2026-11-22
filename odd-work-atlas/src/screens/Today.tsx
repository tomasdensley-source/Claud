import { useMemo, type ReactNode } from 'react';
import { bumpDailyCount, dailyCount, useAppState } from '../store';
import { useNav } from '../nav';
import { earnNow, upcoming, waitingOnMe, waitingOnThem } from '../selectors';
import { money, prettyDate, prettyTime, rates, todayISO } from '../metrics';
import { Empty, GigRow, Header, Tile } from '../ui/kit';
import { Icon, type IconName } from '../ui/Icon';
import { tap } from '../native';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** One stop on the day's route: a marker on the dotted line, a heading, then its gigs. */
function Leg({ id, icon, title, count, tone, children }: { id: string; icon: IconName; title: string; count?: number; tone?: 'coin' | 'me' | 'them' | 'cal'; children: ReactNode }) {
  return (
    <li className={`leg leg-${tone ?? 'plain'}`} id={id}>
      <span className="leg-marker" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <h2 className="leg-title">
        {title}
        {count != null && <span className="count">{count}</span>}
      </h2>
      <div className="leg-body">{children}</div>
    </li>
  );
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
  const month = useMemo(() => rates(s.gigs.flatMap((g) => g.jobs.filter((j) => j.date.startsWith(today.slice(0, 7))))), [s, today]);

  const open = (id: string) => nav.push({ kind: 'gig', id });
  const dateLine = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="screen">
      <Header
        title={greeting()}
        subtitle={dateLine}
        actions={
          <button className="icon-btn" aria-label="Settings and backup" onClick={() => nav.push({ kind: 'more' })}>
            <Icon name="more" />
          </button>
        }
      />

      <button className="ledger press" onClick={() => { tap(); nav.setTab('money'); }}>
        <span className="coin" aria-hidden="true">$</span>
        <span className="ledger-main">
          <span className="ledger-label">Earned this month</span>
          <span className="ledger-value">{money(month.gross)}</span>
        </span>
        {month.perHour != null && (
          <span className="ledger-side">
            <span className="ledger-label">Door to door</span>
            <span className="ledger-rate">{money(month.perHour, 2)} an hour</span>
          </span>
        )}
        <Icon name="chevron" size={22} className="row-chevron" />
      </button>

      {capped.map((g) => {
        const n = dailyCount(g.id, today);
        const cap = g.dailyCap!;
        return (
          <div key={g.id} className="cap-card">
            <Tile gig={g} size={48} />
            <div className="cap-main">
              <div className="cap-title">{g.name} applications</div>
              <div className="cap-sub">{n >= cap ? 'All used today. More tomorrow.' : `${cap - n} of ${cap} left today`}</div>
              <div className="meter" aria-hidden="true">
                {Array.from({ length: cap }, (_, i) => (
                  <span key={i} className={i < n ? 'on' : ''} />
                ))}
              </div>
            </div>
            <div className="cap-actions">
              <button className="round-btn press" aria-label="Take one back" disabled={n === 0} onClick={() => { tap(); bumpDailyCount(g.id, -1); }}>
                <Icon name="arrowDown" size={22} />
              </button>
              <button className="round-btn primary press" aria-label="I sent one" disabled={n >= cap} onClick={() => { tap(); bumpDailyCount(g.id, 1); }}>
                <Icon name="plus" size={24} />
              </button>
            </div>
          </div>
        );
      })}

      <ol className="dayroute">
        {events.length > 0 && (
          <Leg id="cal" icon="calendar" title="On the calendar" count={events.length} tone="cal">
            <div className="card list">
              {events.map(({ gig, event }) => (
                <button key={event.id} className="event-row press" onClick={() => open(gig.id)}>
                  <span className={`event-date ${event.date === today ? 'is-today' : ''}`}>
                    <span>{event.date === today ? 'Today' : prettyDate(event.date).split(',')[0]}</span>
                    <strong>{event.time ? prettyTime(event.time) : 'All day'}</strong>
                  </span>
                  <span className="event-main">
                    <span className="event-title">{event.title}</span>
                    <span className="event-sub">{gig.name}, {prettyDate(event.date)}</span>
                  </span>
                  <Icon name="chevron" size={22} className="row-chevron" />
                </button>
              ))}
            </div>
          </Leg>
        )}

        <Leg id="earn" icon="money" title="Earn now" count={earn.length} tone="coin">
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
                        <span className="rate-col">
                          <strong>{money(r.perHour, 0)}</strong>
                          <span>an hour</span>
                        </span>
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </Leg>

        <Leg id="mine" icon="hand" title="Your move" count={mine.length} tone="me">
          {mine.length === 0 ? (
            <Empty icon="check" title="Nothing is waiting on you" />
          ) : (
            <div className="card list">
              {mine.slice(0, 8).map((g) => (
                <GigRow key={g.id} gig={g} onOpen={() => open(g.id)} sub={g.nextStep || g.description} showCategory={false} />
              ))}
              {mine.length > 8 && (
                <button className="list-more press" onClick={() => nav.setTab('pipeline')}>
                  See all {mine.length} in Pipeline
                </button>
              )}
            </div>
          )}
        </Leg>

        <Leg id="theirs" icon="hourglass" title="Their move" count={theirs.length} tone="them">
          {theirs.length === 0 ? (
            <Empty icon="hourglass" title="Nothing is waiting on them" />
          ) : (
            <div className="card list">
              {theirs.map((g) => (
                <GigRow key={g.id} gig={g} onOpen={() => open(g.id)} sub={g.nextStep || g.description} showCategory={false} />
              ))}
            </div>
          )}
        </Leg>
      </ol>
      <div className="bottom-space" />
    </div>
  );
}
