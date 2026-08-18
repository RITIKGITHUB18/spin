export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';
export type CloudKind = 'clear' | 'cirrus' | 'cumulus' | 'stratus' | 'storm';

const IST = 'Asia/Kolkata';

/** Current hour (0-23) in India, regardless of where the device is. */
export function istHour(at: number | Date = Date.now()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    hour: '2-digit',
    hour12: false,
  }).format(new Date(at));
  // en-GB renders midnight as "24" in some engines.
  return Number(parts) % 24;
}

export function phaseForHour(hour: number): SkyPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

// Dawn, dusk and night start deep at the top and carry white header text.
// Day is a genuinely bright sky and carries dark text instead — see isLightSky.
export const SKY_GRADIENT: Record<SkyPhase, string> = {
  dawn: 'linear-gradient(168deg, #2d3561 0%, #7a5a8e 48%, #f0a07c 100%)',
  day: 'linear-gradient(168deg, #6fbbe8 0%, #a2d5f0 52%, #dff1fb 100%)',
  dusk: 'linear-gradient(168deg, #3a2c5a 0%, #99506b 50%, #f08a5d 100%)',
  night: 'linear-gradient(168deg, #0b1120 0%, #16203a 55%, #2b3a5c 100%)',
};

/**
 * Greeting for the hour in India. Deliberately not derived from SkyPhase: the
 * sky splits at 8am/5pm because that is when the light changes, but "morning"
 * runs to noon and "evening" to bed — the two boundaries do not line up.
 */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Short label for a WMO code. Thresholds mirror cloudKindFor/isRaining so the
 * words never contradict what the backdrop is drawing.
 */
export function conditionLabel(weatherCode: number): string {
  if (weatherCode >= 95) return 'Thunderstorm';
  if (weatherCode >= 85) return 'Snow showers';
  if (weatherCode >= 80) return 'Showers';
  if (weatherCode >= 71) return 'Snow';
  if (weatherCode >= 61) return 'Rain';
  if (weatherCode >= 51) return 'Drizzle';
  if (weatherCode === 45 || weatherCode === 48) return 'Fog';
  if (weatherCode === 3) return 'Overcast';
  if (weatherCode === 2) return 'Partly cloudy';
  if (weatherCode === 1) return 'Mainly clear';
  return 'Clear';
}

/**
 * True when the sky is bright enough that header text must be dark. Only the
 * daytime sky qualifies — dawn, dusk and night are all deep at the top, which
 * is where the header sits.
 */
export function isLightSky(phase: SkyPhase): boolean {
  return phase === 'day';
}

/**
 * Skies used behind the sun clip. That clip is artwork on a white background so
 * it can only be composited with `multiply`, which takes the sun's yellow
 * straight into the sky's colour — against a mid-tone it turns muddy and the
 * disc disappears. Each of these therefore stays pale exactly where the sun
 * sits, and only the surrounding stops carry the hour's colour.
 */
export const SKY_GRADIENT_SUN: Record<'dawn' | 'day' | 'dusk', string> = {
  dawn: 'linear-gradient(168deg, #3b4478 0%, #b98aa8 38%, #ffe6ca 70%, #ffc79a 100%)',
  day: 'linear-gradient(168deg, #62b4e4 0%, #cfe8f6 52%, #f2fafd 100%)',
  dusk: 'linear-gradient(168deg, #46345f 0%, #c07289 38%, #ffe2c6 70%, #ff9f6b 100%)',
};

/**
 * Clear (0), mainly clear (1) or partly cloudy (2). Both hero clips contain
 * clouds of their own, so they read correctly right up to partly cloudy.
 */
const CALM_MAX_CODE = 2;

export type HeroClip = 'sun' | 'moon' | null;

/**
 * Which hero clip belongs on the header. Dawn, day and dusk all reuse the sun
 * clip — `multiply` retints it with whichever sky is behind it, so one asset
 * covers three phases (a low warm glow at dawn/dusk, a bright disc at midday).
 */
export function heroClipFor(weatherCode: number, phase: SkyPhase): HeroClip {
  if (weatherCode > CALM_MAX_CODE) return null; // overcast or worse — clouds instead
  return phase === 'night' ? 'moon' : 'sun';
}

/** The sun clip sits lower at dawn/dusk so the disc lands in the pale band. */
export function sunClipPosition(phase: SkyPhase): string {
  return phase === 'day' ? 'center center' : 'center 0%';
}

export function skyGradientFor(phase: SkyPhase, clip: HeroClip): string {
  if (clip === 'sun' && phase !== 'night') return SKY_GRADIENT_SUN[phase];
  return SKY_GRADIENT[phase];
}

export interface SkyOverride {
  hour?: number;
  weatherCode?: number;
}

/**
 * Dev-only preview override, e.g. `?hr=13&wx=0` for a clear midday sky or
 * `?hr=23&wx=1` for the moon. Without it these states are only visible when the
 * real weather happens to cooperate — an overcast day (code 3) legitimately
 * shows generated clouds and no clip at all, which is easily mistaken for a
 * bug. Compiled out of production builds.
 */
export function readSkyOverride(search: string): SkyOverride {
  if (!import.meta.env.DEV) return {};
  const params = new URLSearchParams(search);
  const hour = Number(params.get('hr'));
  const code = Number(params.get('wx'));
  return {
    hour: params.has('hr') && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : undefined,
    weatherCode: params.has('wx') && Number.isInteger(code) && code >= 0 ? code : undefined,
  };
}

/** Thunderstorm — gets a lightning flash on top of the storm clouds and rain. */
export function isThunder(weatherCode: number): boolean {
  return weatherCode >= 95;
}

/**
 * True for liquid precipitation only — drizzle, rain, rain showers and
 * thunderstorms. Snow (71-77, 85-86) is deliberately excluded: the overlay is
 * falling rain streaks and reads wrong for snow.
 */
export function isRaining(weatherCode: number): boolean {
  return (
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82) ||
    weatherCode >= 95
  );
}

/**
 * WMO weather codes as returned by Open-Meteo's `weather_code`.
 * @see https://open-meteo.com/en/docs
 */
export function cloudKindFor(weatherCode: number, cloudCover: number): CloudKind {
  if (weatherCode >= 95) return 'storm'; // thunderstorm
  if (weatherCode >= 51) return 'stratus'; // drizzle, rain, snow, showers
  if (weatherCode === 45 || weatherCode === 48) return 'stratus'; // fog
  if (weatherCode === 3) return 'stratus'; // overcast
  if (weatherCode === 2) return 'cumulus'; // partly cloudy
  if (weatherCode === 1) return 'cirrus'; // mainly clear
  // weatherCode 0 (clear): fall back to raw cover so a hazy sky still reads.
  if (cloudCover > 60) return 'stratus';
  if (cloudCover > 25) return 'cumulus';
  return 'clear';
}
