import { useQuery } from '@tanstack/react-query';

/**
 * The laundry room itself — plus code `WJH4+4W Bengaluru` (full form
 * `7J4VWJH4+4W`), decoded to the centre of its 14m cell.
 *
 * Primary source rather than a mere fallback: every resident shares one
 * building, so the building's sky is the right one to draw even for someone
 * checking the app from the office. Verified against Open-Meteo — the point
 * resolves to Asia/Kolkata at 901m, which is Bengaluru's plateau.
 */
export const BUILDING_COORDS = { latitude: 12.9278, longitude: 77.6073, label: 'Bengaluru' };

export interface WeatherNow {
  weatherCode: number;
  cloudCover: number;
  temperature: number;
  /** False only when a device fix was available and used instead. */
  usedBuildingLocation: boolean;
}

/**
 * Resolves to the device position, or the fallback coords if geolocation is
 * unavailable, denied, or slow. Never rejects — a missing position should
 * degrade the backdrop, not break the page.
 */
type Coords = { latitude: number; longitude: number };

/**
 * Starts from the building and only improves on it when that is free.
 *
 * Geolocation is consulted *only* where permission has already been granted,
 * so the app never raises a prompt of its own. That matters beyond politeness:
 * the `timeout` option below does not cover time spent waiting on an
 * unanswered prompt, so a prompt left sitting used to stall the first paint
 * indefinitely. Anywhere the state is denied, still to be asked, or simply
 * unknowable, this returns the building immediately with no async work at all.
 */
async function resolveCoords(timeoutMs = 1500): Promise<Coords> {
  if (!('geolocation' in navigator)) return BUILDING_COORDS;

  const status = await navigator.permissions
    ?.query({ name: 'geolocation' as PermissionName })
    .catch(() => null);
  if (status?.state !== 'granted') return BUILDING_COORDS;

  return new Promise((resolve) => {
    // Belt and braces: permission is granted, but acquiring a fix can still
    // hang on a cold GPS.
    const deadline = setTimeout(() => resolve(BUILDING_COORDS), timeoutMs);
    const settle = (coords: Coords) => {
      clearTimeout(deadline);
      resolve(coords);
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => settle({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => settle(BUILDING_COORDS),
      { timeout: timeoutMs, maximumAge: 30 * 60 * 1000 }
    );
  });
}

/**
 * Shared so the sky can be warmed before entering the app (see OtpPage) using
 * the exact same key — a prefetch under a different key would fetch twice and
 * still leave the header empty on first paint.
 */
export const weatherQueryOptions = {
  queryKey: ['weather'] as const,
  staleTime: 15 * 60 * 1000,
  refetchInterval: 15 * 60 * 1000,
  retry: 1,
  queryFn: async (): Promise<WeatherNow> => {
    const coords = await resolveCoords();

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', coords.latitude.toFixed(4));
    url.searchParams.set('longitude', coords.longitude.toFixed(4));
    url.searchParams.set('current', 'temperature_2m,weather_code,cloud_cover');

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);

    const json = (await res.json()) as {
      current: { temperature_2m: number; weather_code: number; cloud_cover: number };
    };

    return {
      weatherCode: json.current.weather_code,
      cloudCover: json.current.cloud_cover,
      temperature: json.current.temperature_2m,
      usedBuildingLocation: coords === BUILDING_COORDS,
    };
  },
};

export function useWeather() {
  return useQuery(weatherQueryOptions);
}
