import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  const dismissToast = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, 4000);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          className="fixed left-4 right-4 bottom-24 z-[60] mx-auto max-w-sm"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-cream-900 px-4 py-3 shadow-lg">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-white/10 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
                <path d="M8 12l2.5 2.5L16 9" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-[13.5px] font-bold text-white">{toast.title}</div>
              <div className="text-xs text-white/70">{toast.body}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
