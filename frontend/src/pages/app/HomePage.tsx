import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useMachines } from '../../hooks/useMachines';
import { useNotifications } from '../../hooks/useNotifications';
import { useNow } from '../../hooks/useCountdown';
import { useWeather } from '../../hooks/useWeather';
import { MachineCard } from '../../components/machines/MachineCard';
import { PullToRefresh } from '../../components/common/PullToRefresh';
import { InstallBanner } from '../../components/common/InstallBanner';
import { SkyBackdrop } from '../../components/common/SkyBackdrop';
import { StatStrip } from '../../components/common/StatChip';
import { LoadingBlock } from '../../components/common/Spinner';
import { firstNameOf } from '../../utils/initials';
import {
  cloudKindFor,
  conditionLabel,
  greetingForHour,
  heroClipFor,
  isLightSky,
  isRaining,
  isThunder,
  istHour,
  readSkyOverride,
  phaseForHour,
} from '../../utils/sky';

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { data: machines, isLoading } = useMachines();
  const { data: notifData } = useNotifications();
  const { data: weather } = useWeather();
  const openNotif = useUiStore((s) => s.openNotif);
  const now = useNow();
  const queryClient = useQueryClient();

  // Pull refreshes exactly what this screen shows, nothing more.
  const refresh = useCallback(
    () =>
      Promise.all([
        queryClient.refetchQueries({ queryKey: ['machines'] }),
        queryClient.refetchQueries({ queryKey: ['notifications'] }),
      ]),
    [queryClient]
  );

  const free = machines?.filter((m) => m.status === 'available').length ?? 0;
  const busy = machines?.filter((m) => m.status === 'inuse').length ?? 0;
  const done = machines?.filter((m) => m.status === 'done').length ?? 0;
  const unread = notifData?.unread ?? 0;

  // Dev-only: ?hr=13&wx=0 forces a time and weather code so every sky state can
  // be previewed without waiting for the real weather.
  const override = readSkyOverride(window.location.search);

  // Phase follows the clock in India regardless of device timezone; `now`
  // already ticks for the machine countdowns, so this re-derives with it.
  const hour = override.hour ?? istHour(now);
  const phase = phaseForHour(hour);
  // Time of day comes from the clock, never from the network — the greeting is
  // correct on the very first frame even if the weather call is still running.
  const greeting = greetingForHour(hour);
  // If the weather call fails or is still in flight, fall back to a clear sky —
  // the time-of-day gradient still renders.
  const weatherCode = override.weatherCode ?? weather?.weatherCode;
  const cloudCover = override.weatherCode !== undefined ? 0 : (weather?.cloudCover ?? 0);
  const cloudKind = weatherCode !== undefined ? cloudKindFor(weatherCode, cloudCover) : 'clear';
  const clip = weatherCode !== undefined ? heroClipFor(weatherCode, phase) : null;

  // Daytime skies are bright, so the header flips to dark text; dawn, dusk and
  // night stay dark at the top and keep white.
  const lightSky = isLightSky(phase);
  const headerText = lightSky ? 'text-cream-900' : 'text-white';
  const headerMuted = lightSky ? 'text-cream-900/70' : 'text-white/80';
  const headerChip = lightSky
    ? 'bg-cream-900/8 text-cream-900/80'
    : 'bg-white/10 text-white/85';
  const headerButton = lightSky
    ? 'border-cream-900/15 bg-cream-900/5'
    : 'border-white/20 bg-white/10';

  return (
    <PullToRefresh onRefresh={refresh} className="scrollbar-none h-full overflow-y-auto pb-24">
      <div className={`relative overflow-hidden rounded-b-[28px] px-5.5 pb-11 pt-12.5 ${headerText}`}>
        <SkyBackdrop
          phase={phase}
          cloudKind={cloudKind}
          cloudCover={cloudCover}
          clip={clip}
          raining={weatherCode !== undefined ? isRaining(weatherCode) : false}
          thunder={weatherCode !== undefined ? isThunder(weatherCode) : false}
        />
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-serif text-2xl italic">spin</span>
          <button
            type="button"
            onClick={openNotif}
            className={`relative flex h-10.5 w-10.5 items-center justify-center rounded-[13px] border ${headerButton}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-white/70 bg-danger-ic px-1 text-[11px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
        </div>
        <div className={`relative z-10 mt-4.5 text-sm ${headerMuted}`}>{greeting},</div>
        <div className="relative z-10 mt-0.5 font-serif text-[30px] leading-tight">{firstNameOf(user?.fullName ?? '')}</div>
        <div className="relative z-10 mt-2.5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${headerChip}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
            </svg>
            {user?.buildingName} · Flat {user?.flat}
          </span>
          {/* Rendered only once the reading exists. A placeholder chip would
              reserve space for a value that may never arrive if the call
              fails, and the header would sit with a permanent gap. */}
          {weather && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${headerChip}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 14.76V4.5a2.5 2.5 0 0 0-5 0v10.26a4.5 4.5 0 1 0 5 0z" />
              </svg>
              {/* `weatherCode`, not `weather.weatherCode` — the label has to
                  describe the sky actually on screen, which the dev override
                  can repaint. Reading the raw value put "Overcast" under a
                  clear sun whenever ?wx= was set. */}
              {Math.round(weather.temperature)}° · {conditionLabel(weatherCode ?? weather.weatherCode)}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 -mt-6.5 px-5.5">
        <StatStrip free={free} busy={busy} done={done} />
      </div>

      <InstallBanner />

      <div className="px-5.5 pb-2 pt-5">
        <span className="font-serif text-xl text-cream-900">Laundry room</span>
      </div>

      <div className="flex flex-col gap-3 px-5.5 pb-5.5">
        {isLoading && <LoadingBlock label="Loading machines" />}
        {machines?.map((m) => (
          <MachineCard key={m.id} machine={m} now={now} />
        ))}
      </div>

    </PullToRefresh>
  );
}
