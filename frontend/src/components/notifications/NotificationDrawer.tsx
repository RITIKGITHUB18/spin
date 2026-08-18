import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '../../store/uiStore';
import { useNotifications } from '../../hooks/useNotifications';
import { markNotificationsRead } from '../../services/api/notifications';
import { fmtAgo } from '../../utils/time';

export function NotificationDrawer() {
  const open = useUiStore((s) => s.notifOpen);
  const close = useUiStore((s) => s.closeNotif);
  const { data } = useNotifications();
  const qc = useQueryClient();
  const markRead = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  function handleOpen() {
    if (data && data.unread > 0) markRead.mutate();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={handleOpen}
            className="fixed inset-0 z-50 bg-cream-900/40"
            onClick={close}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.28 }}
            className="fixed inset-x-0 bottom-0 top-32 z-[51] mx-auto flex max-w-md flex-col rounded-t-[26px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-cream-150 px-5 py-4">
              <span className="text-lg font-bold text-cream-900">Notifications</span>
              <button
                type="button"
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-cream-200 text-cream-600"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="scrollbar-none flex-1 overflow-y-auto py-2">
              {data && data.notifications.length > 0 ? (
                data.notifications.map((n) => (
                  <div key={n._id} className="flex gap-3 border-b border-cream-100 px-5 py-3.5">
                    <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-success-bg text-success-ic">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
                        <path d="M8 12l2.5 2.5L16 9" />
                      </svg>
                    </div>
                    <div className="flex-1 leading-tight">
                      <div className="text-sm font-bold text-cream-900">{n.title}</div>
                      <div className="mt-0.5 text-[12.5px] text-cream-500">{n.body}</div>
                      <div className="mt-1 font-mono text-[11px] text-cream-400">{fmtAgo(n.createdAt)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-3 px-8 py-14 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-100 text-cream-400">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                  </div>
                  <div className="text-sm text-cream-500">
                    All quiet for now.
                    <br />
                    We'll buzz you the moment your wash is done.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
