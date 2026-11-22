import { useRef, useState } from 'react';
import {
  buildSeedState,
  categories,
  exportJSON,
  markBackedUp,
  replaceAll,
  setCategoryFloor,
  updateProfile,
  useAppState,
  validateImport,
} from '../store';
import { useDirty, useNav } from '../nav';
import { money, todayISO } from '../metrics';
import type { Profile } from '../types';
import { Btn, Field, Header, Section } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { saveBackupFile } from '../native';

export function More() {
  const s = useAppState();
  const nav = useNav();
  const fileRef = useRef<HTMLInputElement>(null);

  const backup = async () => {
    try {
      const msg = await saveBackupFile(exportJSON(), `odd-work-atlas-backup-${todayISO()}.json`);
      markBackedUp();
      nav.toast(msg);
    } catch (e) {
      nav.toast(`Backup failed: ${(e as Error).message}`);
    }
  };

  const onFile = async (file: File) => {
    try {
      const next = validateImport(await file.text());
      nav.confirm({
        title: 'Replace everything with this backup?',
        body: `The backup has ${next.gigs.length} gigs. What is on the phone now will be replaced.`,
        yes: 'Restore backup',
        danger: true,
        onYes: () => {
          replaceAll(next);
          nav.toast('Backup restored');
        },
      });
    } catch (e) {
      nav.toast((e as Error).message || 'Could not read that file');
    }
  };

  const jobs = s.gigs.reduce((n, g) => n + g.jobs.length, 0);

  return (
    <div className="screen">
      <Header title="More" onBack={nav.back} />

      <div className="card list">
        <button className="menu-row" onClick={() => nav.push({ kind: 'profile' })}>
          <span className="menu-icon"><Icon name="user" /></span>
          <span className="menu-main">
            <strong>Application profile</strong>
            <small>Your standing answers for sign-up forms</small>
          </span>
          <Icon name="chevron" size={20} className="muted" />
        </button>
        <button className="menu-row" onClick={() => nav.push({ kind: 'floors' })}>
          <span className="menu-icon"><Icon name="floor" /></span>
          <span className="menu-main">
            <strong>Category floors</strong>
            <small>Hide whole categories under a $/hr line</small>
          </span>
          <Icon name="chevron" size={20} className="muted" />
        </button>
      </div>

      <Section title="Backup">
        <div className="card pad-card stack">
          <p className="muted">
            Your data lives on this phone. A private copy is also kept in the app's own files. Save a backup to Drive or email now
            and then.
          </p>
          <p className="detail-small">
            Last backup: {s.settings.lastBackupAt ? new Date(s.settings.lastBackupAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'never'}
          </p>
          <Btn kind="primary" full icon="download" onClick={backup}>Save a backup file</Btn>
          <Btn full icon="upload" onClick={() => fileRef.current?.click()}>Restore from a file</Btn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </Section>

      <Section title="About">
        <div className="card pad-card stack">
          <p>
            <strong>Odd-Work Atlas</strong> keeps every gig you have found, applied to, or worked in one place, and puts the
            right ones on top.
          </p>
          <p className="detail-small">
            {s.gigs.length} gigs · {jobs} jobs logged · home base {s.settings.home}
          </p>
          <Btn
            kind="danger"
            full
            icon="trash"
            onClick={() =>
              nav.confirm({
                title: 'Start over from the original data?',
                body: 'This erases your jobs, notes and changes, and reloads the 341 starting records. Save a backup first.',
                yes: 'Erase and reload',
                danger: true,
                onYes: () => {
                  replaceAll(buildSeedState());
                  nav.toast('Reloaded the starting data');
                },
              })
            }
          >
            Reset to starting data
          </Btn>
        </div>
      </Section>
      <div className="bottom-space" />
    </div>
  );
}

const PROFILE_FIELDS: { key: keyof Profile; label: string; multiline?: boolean }[] = [
  { key: 'fullName', label: 'Full name' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'address', label: 'Home address' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'device', label: 'Phone model' },
  { key: 'license', label: 'Driver license' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'radius', label: 'Travel radius' },
  { key: 'availability', label: 'Availability' },
  { key: 'householdIncome', label: 'Household income' },
  { key: 'computer', label: 'Computer' },
  { key: 'extra', label: 'Other standing answers', multiline: true },
];

export function ProfileScreen() {
  const s = useAppState();
  const nav = useNav();
  const [draft, setDraft] = useState<Profile>(s.profile);
  const dirty = PROFILE_FIELDS.some((f) => draft[f.key] !== s.profile[f.key]);
  useDirty('screen', dirty);

  return (
    <div className="screen">
      <Header
        title="Application profile"
        onBack={nav.back}
        actions={
          dirty ? (
            <Btn kind="primary" icon="check" onClick={() => { updateProfile(draft); nav.toast('Profile saved'); }}>
              Save
            </Btn>
          ) : undefined
        }
      />
      <div className="banner never">
        <Icon name="shield" />
        <div>
          <strong>Never stored here</strong>
          <span>Social Security number, license number, and bank details. Background checks, signatures and voice tests are always yours to do.</span>
        </div>
      </div>
      <div className="card pad-card stack">
        {PROFILE_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            {f.multiline ? (
              <textarea className="input textarea" rows={4} value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
            ) : (
              <input className="input" value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
            )}
          </Field>
        ))}
        <Btn kind="primary" full disabled={!dirty} onClick={() => { updateProfile(draft); nav.toast('Profile saved'); }}>
          Save profile
        </Btn>
      </div>
      <div className="bottom-space" />
    </div>
  );
}

export function FloorsScreen() {
  const s = useAppState();
  const nav = useNav();
  const cats = categories(s);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');

  return (
    <div className="screen">
      <Header title="Category floors" onBack={nav.back} />
      <p className="hint pad-x">
        A floor hides gigs in a category when they earn under it door to door. A floor set on a single gig wins over its category.
      </p>
      <div className="card list">
        {cats.map((c) => {
          const f = s.settings.categoryFloors[c];
          const n = s.gigs.filter((g) => g.category === c).length;
          if (editing === c) {
            return (
              <div key={c} className="floor-edit">
                <strong>{c}</strong>
                <div className="num-input">
                  <input className="input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus placeholder="20" />
                  <span className="suffix">$/hr</span>
                </div>
                <div className="row-actions">
                  {f != null && (
                    <Btn kind="ghost" onClick={() => { setCategoryFloor(c, null); setEditing(null); }}>
                      Remove
                    </Btn>
                  )}
                  <Btn kind="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                  <Btn
                    kind="primary"
                    disabled={!(parseFloat(value) > 0)}
                    onClick={() => { setCategoryFloor(c, parseFloat(value)); setEditing(null); nav.toast('Floor saved'); }}
                  >
                    Save
                  </Btn>
                </div>
              </div>
            );
          }
          return (
            <button key={c} className="menu-row" onClick={() => { setEditing(c); setValue(f != null ? String(f) : ''); }}>
              <span className="menu-main">
                <strong>{c}</strong>
                <small>{n} gigs</small>
              </span>
              <span className={`floor-pill ${f != null ? 'on' : ''}`}>{f != null ? `${money(f, 2)}/hr` : 'No floor'}</span>
            </button>
          );
        })}
      </div>
      <div className="bottom-space" />
    </div>
  );
}
