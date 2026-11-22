import { useEffect, useRef, useState, type ReactNode } from 'react';
import logoIds from '../data/logos.json';
import { Icon, type IconName } from './Icon';
import type { Gig } from '../types';
import { STAGE_LABEL } from '../types';
import { tap } from '../native';

// Category tones: one family of soft tiles with deep ink, so every gig gets a
// designed two-tone monogram while the app keeps one signature accent.
const TONES = [
  ['#E3F1EE', '#0B5C55'],
  ['#E6EEFB', '#1F4C9A'],
  ['#F5EBDD', '#7A4A12'],
  ['#EEE8F8', '#55348F'],
  ['#E5F2E3', '#2F6A28'],
  ['#FBE7E4', '#93342A'],
  ['#E2F0F6', '#155E78'],
  ['#F7EED6', '#6E5410'],
  ['#F3E6F0', '#7E2F67'],
  ['#E9ECEF', '#3A4651'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const words = name
    .replace(/\(.*?\)/g, '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).replace(/^./, (c) => c.toUpperCase());
  return (words[0][0] + words[1][0]).toUpperCase();
}

const LOGOS = new Set<string>(logoIds as string[]);

/** The company's real logo when one is bundled; otherwise a designed two-tone monogram. */
export function Tile({ gig, size = 48 }: { gig: Pick<Gig, 'id' | 'name' | 'category'>; size?: number }) {
  const [broken, setBroken] = useState(false);
  const [bg, fg] = TONES[hash(gig.category) % TONES.length];
  if (LOGOS.has(gig.id) && !broken) {
    return (
      <img
        className="tile logo"
        src={`${import.meta.env.BASE_URL}logos/${gig.id}.webp`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ borderRadius: size * 0.26 }}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div
      className="tile"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38, borderRadius: size * 0.3 }}
      aria-hidden="true"
    >
      {initials(gig.name)}
    </div>
  );
}

export function StageBadge({ stage }: { stage: Gig['stage'] }) {
  return <span className={`badge stage-${stage}`}>{STAGE_LABEL[stage]}</span>;
}

export function FlagBadges({ gig }: { gig: Gig }) {
  const out: ReactNode[] = [];
  if (gig.flags.closed) out.push(<span key="c" className="badge flag-closed">Closed</span>);
  if (gig.flags.blocked) out.push(<span key="b" className="badge flag-blocked">Blocked</span>);
  if (gig.flags.waitlisted) out.push(<span key="w" className="badge flag-wait">Waitlisted</span>);
  if (gig.flags.waitingOnMe) out.push(<span key="m" className="badge flag-me">Your move</span>);
  if (gig.flags.waitingOnThem) out.push(<span key="t" className="badge flag-them">Their move</span>);
  if (gig.neverRecommend) out.push(<span key="n" className="badge flag-never">Record only</span>);
  return <>{out}</>;
}

export function GigRow({
  gig,
  onOpen,
  right,
  sub,
}: {
  gig: Gig;
  onOpen: () => void;
  right?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <button className="gig-row" onClick={() => { tap(); onOpen(); }}>
      <Tile gig={gig} />
      <div className="gig-row-main">
        <div className="gig-row-name">
          {gig.pinned && <Icon name="pin" size={16} className="pin-mark" />}
          {gig.name}
        </div>
        <div className="gig-row-sub">{sub ?? gig.category}</div>
        <div className="badges">
          <StageBadge stage={gig.stage} />
          <FlagBadges gig={gig} />
        </div>
      </div>
      {right ?? <Icon name="chevron" size={20} className="muted" />}
    </button>
  );
}

export function Header({
  title,
  subtitle,
  onBack,
  actions,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  return (
    <header className="header">
      {onBack && (
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
      )}
      <div className="header-titles">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-actions">{actions}</div>
    </header>
  );
}

export function Section({ title, count, children, action }: { title: string; count?: number; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>
          {title}
          {count != null && <span className="count">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={28} />
      </div>
      <div className="empty-title">{title}</div>
      {body && <div className="empty-body">{body}</div>}
    </div>
  );
}

export function Chip({ on, children, onClick }: { on?: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button className={`chip ${on ? 'on' : ''}`} onClick={() => { tap(); onClick(); }} aria-pressed={!!on}>
      {on && <Icon name="check" size={16} />}
      {children}
    </button>
  );
}

export function Btn({
  children,
  onClick,
  kind = 'secondary',
  icon,
  disabled,
  full,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  full?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      className={`btn btn-${kind} ${full ? 'full' : ''}`}
      onClick={() => { tap(); onClick?.(); }}
      disabled={disabled}
    >
      {icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
    </button>
  );
}

/** Bottom sheet. Closing is handled by the navigator so Back closes it too. */
export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} ref={ref} tabIndex={-1}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export interface ConfirmSpec {
  title: string;
  body?: string;
  yes: string;
  no?: string;
  danger?: boolean;
  onYes: () => void;
  onNo?: () => void;
}

export function ConfirmDialog({ spec, onDone }: { spec: ConfirmSpec; onDone: () => void }) {
  return (
    <div className="scrim center" onClick={() => { spec.onNo?.(); onDone(); }}>
      <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{spec.title}</h2>
        {spec.body && <p>{spec.body}</p>}
        <div className="dialog-actions">
          <Btn kind="ghost" onClick={() => { spec.onNo?.(); onDone(); }}>
            {spec.no ?? 'Cancel'}
          </Btn>
          <Btn kind={spec.danger ? 'danger' : 'primary'} onClick={() => { onDone(); spec.onYes(); }}>
            {spec.yes}
          </Btn>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return <div className="toast" role="status">{text}</div>;
}
