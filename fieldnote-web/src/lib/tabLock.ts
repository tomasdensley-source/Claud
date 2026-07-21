export const CHANNEL = 'fieldnote-tab-v1';
export const LOCK_KEY = 'fieldnote.writelock.v1';

const HEARTBEAT_MS = 2_000;
const LOCK_TTL_MS = 5_000;

type LockRecord = { tabId: string; updatedAt: number };
type LockMessage = { type: 'claim' | 'heartbeat' | 'release'; tabId: string; updatedAt: number };

const tabId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let beforeUnloadActive = false;

function readLock(): LockRecord | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<LockRecord>;
    if (typeof parsed.tabId !== 'string' || typeof parsed.updatedAt !== 'number') {
      return null;
    }

    return { tabId: parsed.tabId, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

function isFresh(lock: LockRecord, now = Date.now()) {
  return now - lock.updatedAt < LOCK_TTL_MS;
}

function writeLock(updatedAt = Date.now()) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId, updatedAt }));
    return true;
  } catch {
    return false;
  }
}

function createChannel() {
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(CHANNEL);
}

function announce(type: LockMessage['type'], channel?: BroadcastChannel | null) {
  const updatedAt = Date.now();
  const message: LockMessage = { type, tabId, updatedAt };

  if (channel) {
    channel.postMessage(message);
    return;
  }

  const tempChannel = createChannel();
  tempChannel?.postMessage(message);
  tempChannel?.close();
}

function hasLostLeadership() {
  const current = readLock();
  return !current || current.tabId !== tabId;
}

export function acquireWriteLock(): { ok: boolean; isLeader: boolean } {
  const now = Date.now();
  const current = readLock();

  if (current && current.tabId !== tabId && isFresh(current, now)) {
    return { ok: false, isLeader: false };
  }

  if (!writeLock(now)) {
    return { ok: false, isLeader: false };
  }

  const ok = readLock()?.tabId === tabId;
  if (ok) announce('claim');

  return { ok, isLeader: ok };
}

export function startWriteLockHeartbeat(onLost: () => void): () => void {
  const channel = createChannel();
  let stopped = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    if (stopped) return;

    stopped = true;
    if (interval !== null) clearInterval(interval);
    channel?.removeEventListener('message', onMessage);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
    channel?.close();
  };

  const markLost = () => {
    if (stopped) return;

    cleanup();
    onLost();
  };

  const refresh = () => {
    if (stopped) return;

    const current = readLock();
    if (current && current.tabId !== tabId && isFresh(current)) {
      markLost();
      return;
    }

    if (!writeLock()) {
      markLost();
      return;
    }

    if (hasLostLeadership()) {
      markLost();
      return;
    }

    announce('heartbeat', channel);
  };

  function onMessage(event: MessageEvent<LockMessage>) {
    const message = event.data;
    if (!message || message.tabId === tabId || message.type === 'release') return;

    const current = readLock();
    if (current && current.tabId !== tabId && isFresh(current)) {
      markLost();
    }
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== LOCK_KEY || stopped) return;

    if (hasLostLeadership()) {
      markLost();
    }
  }

  channel?.addEventListener('message', onMessage);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  interval = setInterval(refresh, HEARTBEAT_MS);
  refresh();

  return cleanup;
}

export function releaseWriteLock() {
  const current = readLock();
  if (current?.tabId !== tabId) return;

  localStorage.removeItem(LOCK_KEY);
  announce('release');
}

const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = '';
  return '';
};

export function warnUnsavedBeforeUnload(enabled: boolean) {
  if (typeof window === 'undefined' || beforeUnloadActive === enabled) return;

  beforeUnloadActive = enabled;

  if (enabled) {
    window.addEventListener('beforeunload', beforeUnloadHandler);
  } else {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }
}
