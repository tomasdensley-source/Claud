import { useMemo, useState } from 'react';
import { addToQueue, removeFromQueue, updateGig, useAppState } from '../store';
import { useDirty, useNav } from '../nav';
import { belowFloor, effectiveFloor, money, offerClearsFloor, perHour, perMile, prettyDate, prettyTime, rates } from '../metrics';
import { FLAG_KEYS, FLAG_LABEL, STAGES, STAGE_LABEL, type Gig, type NoSkillTier } from '../types';
import { Btn, Chip, Empty, FlagBadges, Header, Section, StageBadge, Stat, Tile } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { openExternal, tap } from '../native';
import { EventSheet, FloorSheet, JobSheet, OfferSheet, TextSheet } from './sheets';

function NoteCard({ gig }: { gig: Gig }) {
  const nav = useNav();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(gig.note);
  const [expanded, setExpanded] = useState(false);
  useDirty('screen', editing && draft !== gig.note);

  if (editing) {
    return (
      <div className="card pad-card">
        <textarea
          className="input textarea note-edit"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={10}
          autoFocus
          aria-label="Note"
          placeholder="Pay facts, blockers, deadlines, contacts, outcomes"
        />
        <div className="row-actions">
          <Btn
            kind="ghost"
            onClick={() => {
              if (draft !== gig.note) {
                nav.confirm({
                  title: 'Discard your changes?',
                  yes: 'Discard',
                  no: 'Keep editing',
                  danger: true,
                  onYes: () => { setDraft(gig.note); setEditing(false); },
                });
              } else setEditing(false);
            }}
          >
            Cancel
          </Btn>
          <Btn kind="primary" icon="check" onClick={() => { updateGig(gig.id, { note: draft }); setEditing(false); nav.toast('Note saved'); }}>
            Save note
          </Btn>
        </div>
      </div>
    );
  }

  const long = gig.note.length > 420;
  return (
    <div className="card pad-card">
      {gig.note ? (
        <p className={`note-text ${long && !expanded ? 'clamped' : ''}`}>{gig.note}</p>
      ) : (
        <p className="muted">No note yet. Add pay facts, blockers, deadlines and contacts.</p>
      )}
      <div className="row-actions">
        {long && (
          <Btn kind="ghost" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show less' : 'Read all'}
          </Btn>
        )}
        <Btn icon="edit" onClick={() => { setDraft(gig.note); setEditing(true); }}>
          {gig.note ? 'Edit note' : 'Add note'}
        </Btn>
      </div>
    </div>
  );
}

export function GigDetail({ id }: { id: string }) {
  const s = useAppState();
  const nav = useNav();
  const gig = s.gigs.find((g) => g.id === id);
  const r = useMemo(() => rates(gig?.jobs ?? []), [gig]);

  if (!gig) {
    return (
      <div className="screen">
        <Header title="Not found" onBack={nav.back} />
        <Empty icon="search" title="This gig is not in the Atlas" />
      </div>
    );
  }

  const floor = effectiveFloor(gig, s.settings);
  const under = belowFloor(gig, s.settings);
  const queued = gig.queuePosition != null;
  const hiddenOffers = gig.events.filter((e) => e.pay && !offerClearsFloor(e.pay, floor)).length;
  const visibleEvents = gig.events
    .filter((e) => !(e.pay && !offerClearsFloor(e.pay, floor)))
    .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));

  const sheet = (title: string, render: (close: () => void) => React.ReactNode) => nav.openSheet({ title, render });

  return (
    <div className="screen">
      <Header
        title={gig.name}
        onBack={nav.back}
        actions={
          !gig.neverRecommend && !gig.flags.closed ? (
            <button
              className={`icon-btn pin-btn ${gig.pinned ? 'on' : ''}`}
              aria-label={gig.pinned ? 'Unpin' : 'Pin to top of queue'}
              aria-pressed={gig.pinned}
              onClick={() => {
                tap();
                if (!gig.pinned && !queued) addToQueue(gig.id);
                updateGig(gig.id, { pinned: !gig.pinned });
                nav.toast(gig.pinned ? 'Unpinned' : 'Pinned to the top of your queue');
              }}
            >
              <Icon name="pin" />
            </button>
          ) : undefined
        }
      />

      <div className="detail-hero">
        <Tile gig={gig} size={72} />
        <div className="detail-hero-main">
          <div className="badges">
            <StageBadge stage={gig.stage} />
            <FlagBadges gig={gig} />
          </div>
        </div>
      </div>
      <div className="card pad-card about-card">
        <div className="about-label">What it is</div>
        <p className="about-text">{gig.description || 'No description yet.'}</p>
        <div className="about-label">Category</div>
        <p className="about-cat">{gig.category}</p>
      </div>

      {gig.neverRecommend && (
        <div className="banner never">
          <Icon name="shield" />
          <div>
            <strong>Record only</strong>
            <span>{gig.neverRecommendReason} It never appears on Today or in the queue.</span>
          </div>
        </div>
      )}
      {gig.flags.closed && (
        <div className="banner closed">
          <Icon name="ban" />
          <div>
            <strong>Closed</strong>
            <span>{gig.nextStep || 'This gig is closed. It stays here for the record.'}</span>
          </div>
        </div>
      )}
      {under && !gig.flags.closed && (
        <div className="banner floor">
          <Icon name="floor" />
          <div>
            <strong>Under your floor</strong>
            <span>
              Earning {perHour(r.perHour)} against a {money(floor, 2)}/hr floor, so it is kept off Today and the queue.
            </span>
          </div>
        </div>
      )}

      {!gig.flags.closed && (
        <button
          className="next-card"
          onClick={() =>
            sheet('Next step', (close) => (
              <TextSheet label="What happens next, and who does it" initial={gig.nextStep} multiline onSave={(v) => updateGig(gig.id, { nextStep: v })} close={close} />
            ))
          }
        >
          <div className="next-label">
            <Icon name={gig.flags.waitingOnThem && !gig.flags.waitingOnMe ? 'hourglass' : 'hand'} size={18} />
            {gig.flags.waitingOnMe ? 'Your move' : gig.flags.waitingOnThem ? 'Their move' : 'Next step'}
          </div>
          <div className="next-text">{gig.nextStep || 'Tap to write the next step.'}</div>
        </button>
      )}

      <div className="action-grid">
        {gig.appUrl ? (
          <button className="action" onClick={() => openExternal(gig.appUrl!)}>
            <Icon name="external" />
            <span>Open app</span>
          </button>
        ) : (
          <div className="action disabled" aria-label="No app">
            <Icon name="ban" />
            <span>No app</span>
          </div>
        )}
        {gig.reviewUrl ? (
          <button className="action" onClick={() => openExternal(gig.reviewUrl!)}>
            <Icon name="play" />
            <span>Review video</span>
          </button>
        ) : (
          <button
            className="action subtle"
            onClick={() =>
              sheet('Review video link', (close) => (
                <TextSheet label="YouTube review link" initial="" placeholder="https://www.youtube.com/watch?v=" inputMode="url" onSave={(v) => updateGig(gig.id, { reviewUrl: v || null })} close={close} />
              ))
            }
          >
            <Icon name="play" />
            <span>Add review</span>
          </button>
        )}
        <button className="action" onClick={() => sheet('Add a job', (close) => <JobSheet gig={gig} close={close} />)}>
          <Icon name="plus" />
          <span>Add job</span>
        </button>
        {gig.neverRecommend || gig.flags.closed ? (
          <div className="action disabled">
            <Icon name="queue" />
            <span>Not queueable</span>
          </div>
        ) : (
          <button
            className={`action ${queued ? 'on' : ''}`}
            onClick={() => {
              tap();
              if (queued) {
                removeFromQueue(gig.id);
                nav.toast('Removed from queue');
              } else {
                addToQueue(gig.id);
                nav.toast('Added to queue');
              }
            }}
          >
            <Icon name={queued ? 'check' : 'queue'} />
            <span>{queued ? 'In queue' : 'Add to queue'}</span>
          </button>
        )}
      </div>

      <Section title="Money">
        <div className="stats">
          <Stat label="Door to door" value={perHour(r.perHour)} tone={floor != null && r.perHour != null ? (r.perHour >= floor ? 'good' : 'bad') : undefined} />
          <Stat label="Per mile" value={perMile(r.perMile)} />
          <Stat label="Earned" value={money(r.gross, 2)} />
          <Stat label="Jobs" value={String(r.jobs)} />
        </div>
        <div className="row-actions wrap">
          <Btn icon="floor" onClick={() => sheet('Floor', (close) => <FloorSheet gig={gig} close={close} />)}>
            {gig.floor != null ? `Floor ${money(gig.floor, 2)}/hr${gig.floorUntil ? ` to ${prettyDate(gig.floorUntil)}` : ''}` : floor != null ? `Category floor ${money(floor, 2)}` : 'Set a floor'}
          </Btn>
          <Btn icon="car" onClick={() => sheet('Check a shift offer', (close) => <OfferSheet gig={gig} close={close} />)}>
            Check an offer
          </Btn>
        </div>
        {gig.jobs.length > 0 && (
          <div className="card list">
            {gig.jobs.map((j) => {
              const jr = rates([j]);
              return (
                <button key={j.id} className="job-row" onClick={() => sheet('Edit job', (close) => <JobSheet gig={gig} job={j} close={close} />)}>
                  <div className="job-date">{prettyDate(j.date)}</div>
                  <div className="job-main">
                    <strong>{money(j.gross, 2)}</strong>
                    <span>
                      {j.shiftHours} hr + {j.driveMinutes} min drive · {j.miles} mi{j.memo ? ` · ${j.memo}` : ''}
                    </span>
                  </div>
                  <div className="rate-col">
                    <strong>{jr.perHour == null ? '–' : money(jr.perHour, 0)}</strong>
                    <span>{jr.perMile == null ? 'per hr' : `${money(jr.perMile, 2)}/mi`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title="Dates"
        count={visibleEvents.length || undefined}
        action={
          <button className="link-btn" onClick={() => sheet('Add a date', (close) => <EventSheet gig={gig} close={close} />)}>
            <Icon name="plus" size={18} /> Add
          </button>
        }
      >
        {visibleEvents.length === 0 ? (
          <p className="muted pad-x">No dates yet.</p>
        ) : (
          <div className="card list">
            {visibleEvents.map((e) => (
              <button key={e.id} className="event-row" onClick={() => sheet('Edit date', (close) => <EventSheet gig={gig} event={e} close={close} />)}>
                <div className="event-date">
                  <span>{prettyDate(e.date).split(',')[0]}</span>
                  <strong>{e.time ? prettyTime(e.time) : 'All day'}</strong>
                </div>
                <div className="event-main">
                  <div className="event-title">{e.title}</div>
                  <div className="event-sub">
                    {prettyDate(e.date)} · {e.confirmed ? 'Confirmed' : 'Not confirmed, kept off the calendar'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {hiddenOffers > 0 && <p className="hint pad-x">{hiddenOffers} saved offer(s) are under the floor and hidden.</p>}
      </Section>

      <Section title="Stage">
        <div className="chips-wrap pad-x">
          {STAGES.map((st) => (
            <Chip key={st} on={gig.stage === st} onClick={() => updateGig(gig.id, { stage: st })}>
              {STAGE_LABEL[st]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Status">
        <div className="chips-wrap pad-x">
          {FLAG_KEYS.map((k) => (
            <Chip
              key={k}
              on={gig.flags[k]}
              onClick={() => {
                const on = !gig.flags[k];
                updateGig(gig.id, (cur) => ({
                  flags: { ...cur.flags, [k]: on },
                  // A closed gig leaves the queue.
                  ...(k === 'closed' && on ? { queuePosition: null, pinned: false } : {}),
                }));
              }}
            >
              {FLAG_LABEL[k]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Note">
        <NoteCard key={gig.id} gig={gig} />
      </Section>

      <Section title="Details">
        <div className="card pad-card details">
          <div className="detail-line">
            <span>App</span>
            <strong>{gig.appUrl ? gig.appName ?? 'Google Play' : 'No app'}</strong>
          </div>
          {gig.appSweepNote && <p className="detail-small">{gig.appSweepNote}</p>}
          <div className="detail-line">
            <span>Review video</span>
            {gig.reviewUrl ? (
              <button
                className="link-btn"
                onClick={() =>
                  sheet('Review video link', (close) => (
                    <TextSheet label="YouTube review link" initial={gig.reviewUrl ?? ''} inputMode="url" onSave={(v) => updateGig(gig.id, { reviewUrl: v || null })} close={close} />
                  ))
                }
              >
                Edit link
              </button>
            ) : (
              <strong>None yet</strong>
            )}
          </div>
          <div className="detail-line">
            <span>No-skill tier</span>
            <div className="chips-wrap tight">
              {([1, 2, 'excluded', null] as NoSkillTier[]).map((t) => (
                <Chip key={String(t)} on={gig.noSkillTier === t} onClick={() => updateGig(gig.id, { noSkillTier: t })}>
                  {t === null ? 'Unknown' : t === 'excluded' ? 'Excluded' : `Tier ${t}`}
                </Chip>
              ))}
            </div>
          </div>
          {gig.lists.length > 0 && (
            <div className="detail-line">
              <span>Lists</span>
              <strong>{gig.lists.join(', ')}</strong>
            </div>
          )}
          {gig.dailyCap != null && (
            <div className="detail-line">
              <span>Daily limit</span>
              <strong>{gig.dailyCap} applications a day</strong>
            </div>
          )}
          <div className="detail-line">
            <span>Updated</span>
            <strong>{new Date(gig.updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
          </div>
        </div>
      </Section>
      <div className="bottom-space" />
    </div>
  );
}
