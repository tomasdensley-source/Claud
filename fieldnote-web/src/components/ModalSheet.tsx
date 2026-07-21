import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { placement } from '../lib/placement';
import { applyInertiaScroll } from '../lib/inertia';

export function ModalSheet({
  open,
  title,
  subtitle,
  eyebrow,
  icon,
  onClose,
  children,
  id = 'modal',
  size = 'default',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  id?: string;
  size?: 'default' | 'peek' | 'half' | 'full';
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (!open) {
      placement.unregister(id);
      setPlaced(null);
      return;
    }
    const w = Math.min(size === 'full' ? 860 : 520, window.innerWidth - 32);
    const h =
      size === 'peek'
        ? Math.min(260, window.innerHeight * 0.36)
        : size === 'half'
          ? Math.min(520, window.innerHeight * 0.56)
          : size === 'full'
            ? Math.min(860, window.innerHeight * 0.92)
            : Math.min(560, window.innerHeight * 0.78);
    const next = placement.place({
      id,
      w,
      h,
      prefer: 'tr',
      anchor: { x: window.innerWidth / 2 + w / 2, y: 80 },
    });
    setPlaced(next);
  }, [open, id, size]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!open || !el) return;
    return applyInertiaScroll(el);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className={`relative z-10 flex w-full flex-col overflow-hidden rounded-[22px] bg-[var(--paper)] shadow-2xl ${
              size === 'peek'
                ? 'h-[min(34vh,260px)] max-w-[520px]'
                : size === 'half'
                  ? 'h-[min(58vh,520px)] max-w-[620px]'
                  : size === 'full'
                    ? 'h-[min(92vh,860px)] max-w-[860px]'
                    : 'max-h-[min(88vh,640px)] max-w-[520px]'
            }`}
            style={
              placed && window.innerWidth >= 768
                ? {
                    position: 'absolute',
                    left: placed.x,
                    top: placed.y,
                    width: placed.w,
                    maxHeight: placed.h,
                  }
                : undefined
            }
          >
            <header className="flex items-start gap-3 bg-[var(--walnut)] px-4 py-3.5 text-[var(--cream)]">
              {icon}
              <div className="min-w-0 flex-1">
                {eyebrow && (
                  <div className="text-[10px] font-bold tracking-[0.08em] text-white/60">{eyebrow}</div>
                )}
                <h2 className="text-lg font-bold">{title}</h2>
                {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
              </div>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain p-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function useViewCenter() {
  return null;
}
