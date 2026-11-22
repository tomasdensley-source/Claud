import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { App as CapApp } from '@capacitor/app';
import { ConfirmDialog, Sheet, Toast, type ConfirmSpec } from './ui/kit';
import { isNative } from './native';

export type Tab = 'today' | 'pipeline' | 'queue' | 'browse' | 'money';
export type Screen =
  | { kind: 'gig'; id: string }
  | { kind: 'profile' }
  | { kind: 'more' }
  | { kind: 'floors' };

interface SheetSpec {
  title: string;
  render: (close: () => void) => ReactNode;
}

type Layer = 'screen' | 'sheet';

interface Nav {
  tab: Tab;
  stack: Screen[];
  setTab: (t: Tab) => void;
  push: (s: Screen) => void;
  back: () => void;
  openSheet: (s: SheetSpec) => void;
  closeSheet: (force?: boolean) => void;
  confirm: (c: ConfirmSpec) => void;
  toast: (text: string) => void;
  setDirty: (layer: Layer, dirty: boolean) => void;
}

const Ctx = createContext<Nav | null>(null);

export function useNav() {
  const n = useContext(Ctx);
  if (!n) throw new Error('useNav outside NavProvider');
  return n;
}

/** Marks the current screen or sheet as having unsaved edits, so Back asks first. */
export function useDirty(layer: Layer, dirty: boolean) {
  const { setDirty } = useNav();
  useEffect(() => {
    setDirty(layer, dirty);
    return () => setDirty(layer, false);
  }, [layer, dirty, setDirty]);
}

const DISCARD = {
  title: 'Discard your changes?',
  body: 'You have edits that are not saved yet.',
  yes: 'Discard',
  no: 'Keep editing',
  danger: true,
};

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('today');
  const [stack, setStack] = useState<Screen[]>([]);
  const [sheet, setSheet] = useState<SheetSpec | null>(null);
  const [dialog, setDialog] = useState<ConfirmSpec | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const dirty = useRef<Record<Layer, boolean>>({ screen: false, sheet: false });
  const toastTimer = useRef<number | undefined>(undefined);

  const setDirty = useCallback((layer: Layer, d: boolean) => {
    dirty.current[layer] = d;
  }, []);

  const toast = useCallback((text: string) => {
    setToastText(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastText(null), 2600);
  }, []);

  const confirm = useCallback((c: ConfirmSpec) => setDialog(c), []);

  const closeSheet = useCallback((force = false) => {
    if (!force && dirty.current.sheet) {
      setDialog({ ...DISCARD, onYes: () => { dirty.current.sheet = false; setSheet(null); } });
      return;
    }
    dirty.current.sheet = false;
    setSheet(null);
  }, []);

  const popScreen = useCallback(() => {
    if (dirty.current.screen) {
      setDialog({ ...DISCARD, onYes: () => { dirty.current.screen = false; setStack((s) => s.slice(0, -1)); } });
      return;
    }
    setStack((s) => s.slice(0, -1));
  }, []);

  // Back order: dialog, then sheet, then inner screen, then Today, then ask to quit.
  const stateRef = useRef({ tab, stack, sheet, dialog });
  stateRef.current = { tab, stack, sheet, dialog };

  const back = useCallback(() => {
    const s = stateRef.current;
    if (s.dialog) {
      s.dialog.onNo?.();
      setDialog(null);
      return;
    }
    if (s.sheet) {
      closeSheet();
      return;
    }
    if (s.stack.length > 0) {
      popScreen();
      return;
    }
    if (s.tab !== 'today') {
      setTabState('today');
      return;
    }
    setDialog({
      title: 'Close Odd-Work Atlas?',
      body: 'Everything is saved on your phone.',
      yes: 'Close app',
      no: 'Stay',
      onYes: () => {
        if (isNative()) void CapApp.exitApp();
      },
    });
  }, [closeSheet, popScreen]);

  useEffect(() => {
    if (!isNative()) return;
    const handle = CapApp.addListener('backButton', () => back());
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [back]);

  const setTab = useCallback(
    (t: Tab) => {
      const go = () => {
        dirty.current.screen = false;
        setStack([]);
        setTabState(t);
      };
      if (dirty.current.screen && stateRef.current.stack.length > 0) {
        setDialog({ ...DISCARD, onYes: go });
        return;
      }
      go();
    },
    [],
  );

  const push = useCallback((s: Screen) => setStack((st) => [...st, s]), []);
  const openSheet = useCallback((s: SheetSpec) => setSheet(s), []);

  const value = useMemo<Nav>(
    () => ({ tab, stack, setTab, push, back, openSheet, closeSheet, confirm, toast, setDirty }),
    [tab, stack, setTab, push, back, openSheet, closeSheet, confirm, toast, setDirty],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {sheet && (
        <Sheet title={sheet.title} onClose={() => closeSheet()}>
          {sheet.render(() => closeSheet(true))}
        </Sheet>
      )}
      {dialog && <ConfirmDialog spec={dialog} onDone={() => setDialog(null)} />}
      {toastText && <Toast text={toastText} />}
    </Ctx.Provider>
  );
}
