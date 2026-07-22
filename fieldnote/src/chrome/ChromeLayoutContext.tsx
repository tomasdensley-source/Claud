import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Keyboard, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutSlot,
  Rect,
  SafeInsets,
  resolveAll,
} from '../lib/panelLayout';
import { ChromeSlotId, SLOT_PRIORITY } from './disclosure';

type SlotReg = {
  id: ChromeSlotId;
  preferred: Rect;
  visible: boolean;
};

type ChromeLayoutValue = {
  viewport: { width: number; height: number };
  insets: SafeInsets;
  keyboardHeight: number;
  registerSlot: (slot: SlotReg) => void;
  unregisterSlot: (id: ChromeSlotId) => void;
  getSlotRect: (id: ChromeSlotId) => Rect | null;
};

const ChromeLayoutContext = createContext<ChromeLayoutValue | null>(null);

export function ChromeLayoutProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [regs, setRegs] = useState<Partial<Record<ChromeSlotId, SlotReg>>>({});

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const insets: SafeInsets = useMemo(
    () => ({
      top: safe.top,
      right: safe.right,
      bottom: Math.max(safe.bottom, keyboardHeight > 0 ? keyboardHeight : safe.bottom),
      left: safe.left,
    }),
    [safe.top, safe.right, safe.bottom, safe.left, keyboardHeight],
  );

  const registerSlot = useCallback((slot: SlotReg) => {
    setRegs((prev) => {
      const cur = prev[slot.id];
      if (
        cur &&
        cur.visible === slot.visible &&
        cur.preferred.x === slot.preferred.x &&
        cur.preferred.y === slot.preferred.y &&
        cur.preferred.width === slot.preferred.width &&
        cur.preferred.height === slot.preferred.height
      ) {
        return prev;
      }
      return { ...prev, [slot.id]: slot };
    });
  }, []);

  const unregisterSlot = useCallback((id: ChromeSlotId) => {
    setRegs((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const resolved = useMemo(() => {
    const slots: LayoutSlot[] = Object.values(regs)
      .filter(Boolean)
      .map((s) => ({
        id: s!.id,
        preferred: s!.preferred,
        priority: SLOT_PRIORITY[s!.id] ?? 0,
        visible: s!.visible,
      }));
    return resolveAll(slots, { width, height }, insets);
  }, [regs, width, height, insets]);

  const getSlotRect = useCallback(
    (id: ChromeSlotId) => resolved.get(id) ?? null,
    [resolved],
  );

  const value = useMemo(
    () => ({
      viewport: { width, height },
      insets,
      keyboardHeight,
      registerSlot,
      unregisterSlot,
      getSlotRect,
    }),
    [width, height, insets, keyboardHeight, registerSlot, unregisterSlot, getSlotRect],
  );

  return (
    <ChromeLayoutContext.Provider value={value}>{children}</ChromeLayoutContext.Provider>
  );
}

export function useChromeLayout() {
  const ctx = useContext(ChromeLayoutContext);
  if (!ctx) throw new Error('useChromeLayout requires ChromeLayoutProvider');
  return ctx;
}

/** Register a slot and return absolute left/top when visible. */
export function useChromeSlot(
  id: ChromeSlotId,
  preferred: Rect,
  visible: boolean,
): { left: number; top: number; width: number; height: number } | null {
  const { registerSlot, unregisterSlot, getSlotRect } = useChromeLayout();

  useEffect(() => {
    registerSlot({ id, preferred, visible });
    return () => unregisterSlot(id);
  }, [
    id,
    preferred.x,
    preferred.y,
    preferred.width,
    preferred.height,
    visible,
    registerSlot,
    unregisterSlot,
  ]);

  if (!visible) return null;
  const rect = getSlotRect(id);
  if (!rect) {
    return {
      left: preferred.x,
      top: preferred.y,
      width: preferred.width,
      height: preferred.height,
    };
  }
  return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
}
