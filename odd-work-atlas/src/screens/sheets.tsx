import { useState } from 'react';
import { uid, updateGig } from '../store';
import { useDirty, useNav } from '../nav';
import { effectiveFloor, money, offerClearsFloor, perHour, perMile, rates, todayISO } from '../metrics';
import type { Gig, GigEvent, Job } from '../types';
import { Btn, Field } from '../ui/kit';
import { getState } from '../store';

const num = (v: string) => {
  const n = parseFloat(v.replace(/[$,]/g, ''));
  return isFinite(n) ? n : NaN;
};

function NumInput({ value, onChange, placeholder, suffix }: { value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string }) {
  return (
    <div className="num-input">
      <input className="input" inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
}

function RatePreview({ gross, shiftHours, driveMinutes, miles, floor }: { gross: number; shiftHours: number; driveMinutes: number; miles: number; floor: number | null }) {
  const ok = [gross, shiftHours, driveMinutes, miles].every((n) => isFinite(n));
  const r = ok ? rates([{ gross, shiftHours, driveMinutes, miles }]) : null;
  const pass = r && floor != null ? r.perHour != null && r.perHour >= floor : null;
  return (
    <div className={`preview ${pass === false ? 'bad' : pass ? 'good' : ''}`}>
      <div>
        <span>Door to door</span>
        <strong>{r ? perHour(r.perHour) : '–'}</strong>
      </div>
      <div>
        <span>Per mile</span>
        <strong>{r ? perMile(r.perMile) : '–'}</strong>
      </div>
      {floor != null && (
        <div>
          <span>Your floor</span>
          <strong>{money(floor, 2)}/hr</strong>
        </div>
      )}
    </div>
  );
}

export function JobSheet({ gig, job, close }: { gig: Gig; job?: Job; close: () => void }) {
  const nav = useNav();
  const [date, setDate] = useState(job?.date ?? todayISO());
  const [gross, setGross] = useState(job ? String(job.gross) : '');
  const [hours, setHours] = useState(job ? String(job.shiftHours) : '');
  const [drive, setDrive] = useState(job ? String(job.driveMinutes) : '');
  const [miles, setMiles] = useState(job ? String(job.miles) : '');
  const [memo, setMemo] = useState(job?.memo ?? '');
  const dirty = job
    ? date !== job.date || gross !== String(job.gross) || hours !== String(job.shiftHours) || drive !== String(job.driveMinutes) || miles !== String(job.miles) || memo !== (job.memo ?? '')
    : !!(gross || hours || drive || miles || memo);
  useDirty('sheet', dirty);

  const g = num(gross);
  const h = num(hours);
  const d = drive.trim() === '' ? 0 : num(drive);
  const m = miles.trim() === '' ? 0 : num(miles);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && g >= 0 && h >= 0 && d >= 0 && m >= 0 && h + d > 0;

  const save = () => {
    if (!valid) return;
    const next: Job = { id: job?.id ?? uid(), date, gross: g, shiftHours: h, driveMinutes: d, miles: m, memo: memo.trim() || undefined };
    updateGig(gig.id, (cur) => ({
      jobs: job ? cur.jobs.map((x) => (x.id === job.id ? next : x)) : [...cur.jobs, next].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    nav.toast(job ? 'Job updated' : 'Job added');
    close();
  };

  const remove = () => {
    if (!job) return;
    nav.confirm({
      title: 'Delete this job?',
      body: `${money(job.gross, 2)} on ${job.date}. This cannot be undone.`,
      yes: 'Delete',
      danger: true,
      onYes: () => {
        updateGig(gig.id, (cur) => ({ jobs: cur.jobs.filter((x) => x.id !== job.id) }));
        nav.toast('Job deleted');
        close();
      },
    });
  };

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Field label="Date">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Total pay, with tips">
        <NumInput value={gross} onChange={setGross} placeholder="0.00" suffix="$" />
      </Field>
      <div className="two">
        <Field label="Hours worked">
          <NumInput value={hours} onChange={setHours} placeholder="0" suffix="hr" />
        </Field>
        <Field label="Drive, round trip">
          <NumInput value={drive} onChange={setDrive} placeholder="0" suffix="min" />
        </Field>
      </div>
      <Field label="Miles, round trip from home">
        <NumInput value={miles} onChange={setMiles} placeholder="0" suffix="mi" />
      </Field>
      <Field label="Memo (optional)">
        <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Where, what, anything to remember" />
      </Field>
      <RatePreview gross={g} shiftHours={h} driveMinutes={d} miles={m} floor={effectiveFloor(gig, getState().settings)} />
      <Btn kind="primary" type="submit" full disabled={!valid}>
        {job ? 'Save job' : 'Add job'}
      </Btn>
      {job && (
        <Btn kind="danger" full icon="trash" onClick={remove}>
          Delete job
        </Btn>
      )}
    </form>
  );
}

/** Tests a shift offer against the floor. A failing offer is not saved anywhere. */
export function OfferSheet({ gig, close }: { gig: Gig; close: () => void }) {
  const nav = useNav();
  const floor = effectiveFloor(gig, getState().settings);
  const [gross, setGross] = useState('');
  const [rate, setRate] = useState('');
  const [hours, setHours] = useState('');
  const [drive, setDrive] = useState('');
  const [miles, setMiles] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  useDirty('sheet', !!(gross || rate || hours || drive || miles));

  const h = num(hours);
  const total = gross.trim() ? num(gross) : num(rate) * h;
  const d = drive.trim() === '' ? 0 : num(drive);
  const m = miles.trim() === '' ? 0 : num(miles);
  const ready = isFinite(total) && h > 0;
  const pay = { gross: total, shiftHours: h, driveMinutes: d, miles: m };
  const pass = ready && offerClearsFloor(pay, floor);

  const saveShift = () => {
    const ev: GigEvent = { id: uid(), date, time: time || undefined, title: `${gig.name} shift`, confirmed: true, pay };
    updateGig(gig.id, (cur) => ({ events: [...cur.events, ev] }));
    nav.toast('Shift added to your calendar');
    close();
  };

  return (
    <div className="stack">
      <p className="hint">
        {floor != null
          ? `Floor for this gig: ${money(floor, 2)}/hr door to door. Offers under it are skipped, not saved.`
          : 'No floor is set for this gig. Set one to filter offers.'}
      </p>
      <div className="two">
        <Field label="Hourly rate">
          <NumInput value={rate} onChange={setRate} placeholder="0.00" suffix="$/hr" />
        </Field>
        <Field label="Or total pay">
          <NumInput value={gross} onChange={setGross} placeholder="0.00" suffix="$" />
        </Field>
      </div>
      <div className="two">
        <Field label="Shift hours">
          <NumInput value={hours} onChange={setHours} placeholder="0" suffix="hr" />
        </Field>
        <Field label="Drive, round trip">
          <NumInput value={drive} onChange={setDrive} placeholder="0" suffix="min" />
        </Field>
      </div>
      <Field label="Miles, round trip">
        <NumInput value={miles} onChange={setMiles} placeholder="0" suffix="mi" />
      </Field>
      <RatePreview gross={total} shiftHours={h} driveMinutes={d} miles={m} floor={floor} />
      {ready && !pass && (
        <div className="verdict bad">Under your floor. Skip this one.</div>
      )}
      {ready && pass && (
        <>
          <div className="verdict good">Clears your floor.</div>
          <p className="hint">If the shift is confirmed, add it to your calendar.</p>
          <div className="two">
            <Field label="Date">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Start time">
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Btn kind="primary" full icon="calendar" onClick={saveShift}>
            Add confirmed shift
          </Btn>
        </>
      )}
    </div>
  );
}

export function EventSheet({ gig, event, close }: { gig: Gig; event?: GigEvent; close: () => void }) {
  const nav = useNav();
  const [date, setDate] = useState(event?.date ?? todayISO());
  const [time, setTime] = useState(event?.time ?? '');
  const [title, setTitle] = useState(event?.title ?? '');
  const [confirmed, setConfirmed] = useState(event?.confirmed ?? false);
  useDirty('sheet', event ? date !== event.date || time !== (event.time ?? '') || title !== event.title || confirmed !== event.confirmed : !!title);
  const valid = title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const save = () => {
    const next: GigEvent = { ...(event ?? { id: uid() }), date, time: time || undefined, title: title.trim(), confirmed };
    updateGig(gig.id, (cur) => ({ events: event ? cur.events.map((e) => (e.id === event.id ? next : e)) : [...cur.events, next] }));
    nav.toast('Saved');
    close();
  };
  const remove = () => {
    if (!event) return;
    nav.confirm({
      title: 'Delete this date?',
      yes: 'Delete',
      danger: true,
      onYes: () => {
        updateGig(gig.id, (cur) => ({ events: cur.events.filter((e) => e.id !== event.id) }));
        close();
      },
    });
  };

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (valid) save(); }}>
      <Field label="What">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Interview, shift, deadline" />
      </Field>
      <div className="two">
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time (optional)">
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <button type="button" className={`toggle-row ${confirmed ? 'on' : ''}`} onClick={() => setConfirmed(!confirmed)} aria-pressed={confirmed}>
        <span className="toggle" />
        <span>
          <strong>Confirmed</strong>
          <small>Only confirmed dates show on Today and the calendar.</small>
        </span>
      </button>
      <Btn kind="primary" type="submit" full disabled={!valid}>Save</Btn>
      {event && <Btn kind="danger" full icon="trash" onClick={remove}>Delete</Btn>}
    </form>
  );
}

export function FloorSheet({ gig, close }: { gig: Gig; close: () => void }) {
  const nav = useNav();
  const [value, setValue] = useState(gig.floor != null ? String(gig.floor) : '');
  const [until, setUntil] = useState(gig.floorUntil ?? '');
  const cat = getState().settings.categoryFloors[gig.category];
  useDirty('sheet', value !== (gig.floor != null ? String(gig.floor) : '') || until !== (gig.floorUntil ?? ''));
  const v = num(value);
  const save = (clear = false) => {
    updateGig(gig.id, clear ? { floor: null, floorUntil: null } : { floor: v, floorUntil: until || null });
    nav.toast(clear ? 'Floor removed' : 'Floor saved');
    close();
  };
  return (
    <div className="stack">
      <p className="hint">
        A floor is a filter. When this gig earns under it door to door, it leaves Today and the queue. Nothing under the floor is
        shown with a warning; it is simply not shown.
      </p>
      {cat != null && <p className="hint">Category floor for {gig.category}: {money(cat, 2)}/hr. A gig floor overrides it.</p>}
      <Field label="Minimum door-to-door pay">
        <NumInput value={value} onChange={setValue} placeholder="20" suffix="$/hr" />
      </Field>
      <Field label="Ends after (optional)" hint="Leave blank to keep it with no end date.">
        <input className="input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
      </Field>
      <Btn kind="primary" full disabled={!(v > 0)} onClick={() => save()}>Save floor</Btn>
      {gig.floor != null && <Btn kind="ghost" full onClick={() => save(true)}>Remove floor</Btn>}
    </div>
  );
}

export function TextSheet({
  label,
  initial,
  placeholder,
  multiline,
  inputMode,
  onSave,
  close,
}: {
  label: string;
  initial: string;
  placeholder?: string;
  multiline?: boolean;
  inputMode?: 'url' | 'text';
  onSave: (v: string) => void;
  close: () => void;
}) {
  const [v, setV] = useState(initial);
  useDirty('sheet', v !== initial);
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); onSave(v.trim()); close(); }}>
      <Field label={label}>
        {multiline ? (
          <textarea className="input textarea" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} rows={5} autoFocus />
        ) : (
          <input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} inputMode={inputMode} autoFocus />
        )}
      </Field>
      <Btn kind="primary" type="submit" full>Save</Btn>
    </form>
  );
}
