import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { playNotifySound } from '../../services/sound';

export function PushBanner() {
  const push = useUiStore((s) => s.push);
  const dismissPush = useUiStore((s) => s.dismissPush);
  const openNotif = useUiStore((s) => s.openNotif);

  useEffect(() => {
    if (!push) return;
    playNotifySound();
    const t = setTimeout(dismissPush, 5200);
    return () => clearTimeout(t);
  }, [push, dismissPush]);

  return (
    <AnimatePresence>
      {push && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          className="fixed left-3 right-3 top-3 z-[70] mx-auto max-w-sm cursor-pointer"
          onClick={() => {
            dismissPush();
            openNotif();
          }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/90 p-3 shadow-xl backdrop-blur-lg">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-brand-500 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
                <path d="M12 3v3.2" />
                <path d="M9.3 11a1 1 0 1 0 2 0 1 1 0 1 0-2 0" />
                <path d="M12.5 13.6a1 1 0 1 0 2 0 1 1 0 1 0-2 0" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-[13px] font-bold italic text-cream-700">spin</span>
                <span className="text-[10px] text-cream-400">now</span>
              </div>
              <div className="mt-0.5 text-[13.5px] font-bold text-cream-900">{push.title}</div>
              <div className="text-xs text-cream-500">{push.body}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
