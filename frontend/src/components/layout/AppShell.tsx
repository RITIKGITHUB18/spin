import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation, useOutlet } from 'react-router-dom';
import { PageTransition } from './PageTransition';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useMachines } from '../../hooks/useMachines';
import { useActiveBookings } from '../../hooks/useActiveBookings';
import { useNotifications } from '../../hooks/useNotifications';
import { useSession } from '../../hooks/useSession';
import { BottomNav } from './BottomNav';
import { BottomSheet } from '../sheets/BottomSheet';
import { BookingSheet } from '../sheets/BookingSheet';
import { ManageSheet } from '../sheets/ManageSheet';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { PushBanner } from '../notifications/PushBanner';
import { Toast } from '../common/Toast';
import { armNotifySound, playNotifySound } from '../../services/sound';

export function AppShell() {
  const location = useLocation();
  // Captured as an element so the exiting page keeps its own content — see below.
  const outlet = useOutlet();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const sheet = useUiStore((s) => s.sheet);
  const sheetMachineId = useUiStore((s) => s.sheetMachineId);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const showPush = useUiStore((s) => s.showPush);

  const { data: machines } = useMachines();
  const { data: activeBookings } = useActiveBookings();
  const { data: notifData } = useNotifications();
  const { needsProfile } = useSession();

  // The nav now paints above the sheet, so a tab is tappable while one is open.
  // Without this you could land on another screen with a sheet from the
  // previous one still raised.
  useEffect(() => {
    closeSheet();
  }, [location.pathname, closeSheet]);

  // Autoplay policy needs a gesture before audio works; arm on the first one so
  // the earliest notification of a session is not the silent one.
  useEffect(() => armNotifySound(), []);

  // A real push arriving while the app is open: the OS notification uses the
  // system tone, but the foreground app can use ours.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'spin:push') return;
      playNotifySound();
      // Pull the new row straight away rather than waiting out the poll. This
      // is what lets useNotifications sit on a slow interval without the
      // in-app banner lagging behind the system notification.
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [queryClient]);

  const lastNotifId = useRef<string | null>(null);
  useEffect(() => {
    const latest = notifData?.notifications[0];
    if (!latest) return;
    if (lastNotifId.current === null) {
      lastNotifId.current = latest._id;
      return;
    }
    if (latest._id !== lastNotifId.current) {
      lastNotifId.current = latest._id;
      showPush(latest.title, latest.body);
    }
  }, [notifData, showPush]);

  if (!token) return <Navigate to="/" replace />;
  // Verified but never finished onboarding — send them to fill in name and flat
  // rather than into an app with a nameless header and an empty Profile page.
  if (needsProfile) return <Navigate to="/name" replace />;

  const sheetMachine = machines?.find((m) => m.id === sheetMachineId);
  const mineDot = (activeBookings ?? []).some((b) => b.status === 'inuse');

  return (
    <div className="relative min-h-svh bg-cream-50">
      {/* `useOutlet()` rather than <Outlet />: Outlet is a live component that
          always renders the *current* route, so the wrapper AnimatePresence
          keeps mounted for the exit would re-render into the destination page.
          The result was the new page appearing in place and then an identical
          copy sliding in over it. useOutlet returns an element, so the exiting
          copy keeps the page it was rendered with.

          initial={true} so the first tab also slides in when arriving from
          onboarding. */}
      <AnimatePresence initial={true}>
        <PageTransition key={location.pathname}>{outlet}</PageTransition>
      </AnimatePresence>
      {/* The search string is only carried in dev: it exists to keep the sky
          override alive across tabs, and production should not propagate
          arbitrary query params between screens. */}
      <BottomNav mineDot={mineDot} search={import.meta.env.DEV ? location.search : ''} />
      <BottomSheet open={sheet !== null && !!sheetMachine} onClose={closeSheet}>
        {sheetMachine && sheet === 'book' && <BookingSheet machine={sheetMachine} />}
        {sheetMachine && sheet === 'manage' && <ManageSheet machine={sheetMachine} />}
      </BottomSheet>
      <NotificationDrawer />
      <PushBanner />
      <Toast />
    </div>
  );
}
