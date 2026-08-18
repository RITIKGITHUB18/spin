import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-cream-900/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            // Sits 12px below the top of the nav so its rounded corners tuck
            // behind the bar rather than meeting it on a visible seam. --nav-h
            // is published by BottomNav and tracks the safe-area inset, so this
            // holds on devices with a home indicator.
            className="fixed inset-x-0 bottom-[calc(var(--nav-h,0px)-12px)] z-[51] mx-auto max-w-md rounded-t-[26px] bg-white px-6 pb-6 pt-2.5 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-cream-200" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
