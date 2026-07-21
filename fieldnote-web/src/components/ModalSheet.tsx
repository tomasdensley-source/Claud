import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { placement } from '../lib/placement';

export function ModalSheet({
  open,
  title,
  subtitle,
  eyebrow,
  icon,
  onClose,
  children,
  id = 'modal',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  id?: string;
}) {
  useEffect(() => {
    if (!open) {
      placement.unregister(id);
      return;
    }
    const w = Math.min(520, window.innerWidth - 32);
    const h = Math.min(560, window.innerHeight * 0.78);
    placement.place({
      id,
      w,
      h,
      prefer: 'tr',
      anchor: { x: window.innerWidth / 2 + w / 2, y: 80 },
    });
  }, [open, id]);

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
            className="relative z-10 flex max-h-[min(88vh,640px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-[var(--paper)] shadow-2xl"
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
            <div className="flex-1 overflow-y-auto overscroll-contain p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
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
