import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import type { CloudKind, HeroClip, SkyPhase } from "../../utils/sky";
import { isLightSky, skyGradientFor, sunClipPosition } from "../../utils/sky";

/**
 * feTurbulence recipes per cloud type. numOctaves stays <= 5 — beyond that the
 * CPU cost climbs sharply for no visible gain.
 *
 * The noise drives *alpha*, not displacement. Displacing a solid ellipse only
 * ever roughens its top edge, and three stacked ellipses read as a range of
 * hills rather than cloud — which is exactly how the old recipe looked. Here a
 * full-bleed rect is punched through by the noise instead, so sky shows between
 * the clouds and there is no silhouette edge at all.
 *
 * `alpha = (bias + coverage * biasRange) - contrast * noise`, so a higher
 * reported cloud cover thickens the cloud rather than just darkening it.
 */
const CLOUD_FILTER: Record<
  Exclude<CloudKind, "clear">,
  {
    baseFrequency: string;
    numOctaves: number;
    contrast: number;
    bias: number;
    biasRange: number;
    soften: number;
  }
> = {
  // Anisotropic baseFrequency stretches the noise into directional wisps.
  cirrus: {
    baseFrequency: "0.016 0.004",
    numOctaves: 4,
    contrast: 1.2,
    bias: 0.35,
    biasRange: 0.55,
    soften: 4,
  },
  cumulus: {
    baseFrequency: "0.008",
    numOctaves: 5,
    contrast: 1.4,
    bias: 0.4,
    biasRange: 0.7,
    soften: 3,
  },
  stratus: {
    baseFrequency: "0.012",
    numOctaves: 5,
    contrast: 1.8,
    bias: 0.45,
    biasRange: 0.8,
    soften: 2,
  },
  storm: {
    baseFrequency: "0.005",
    numOctaves: 5,
    contrast: 1.5,
    bias: 0.5,
    biasRange: 0.75,
    soften: 5,
  },
};

// Back to front: fainter and slower behind, denser and quicker in front. Each
// layer gets its own seed — shape variation for free, without touching
// baseFrequency (which would change the cloud scale too).
const LAYERS = [
  { seed: 5, opacity: 0.55, duration: "52s" },
  { seed: 41, opacity: 0.75, duration: "34s" },
];

/**
 * Cloud tint is injected as the constant column of the colour matrix, so the
 * filter outputs tinted pixels directly. The layer's own background never
 * survives the filter — feColorMatrix replaces RGB outright.
 */
function rgbUnit(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function cloudColor(phase: SkyPhase, kind: CloudKind): string {
  if (kind === "storm") return phase === "night" ? "#6b7480" : "#9aa4b0";
  if (phase === "night") return "#8fa0bd";
  if (phase === "dawn" || phase === "dusk") return "#ffe8dc";
  return "#ffffff";
}

export function SkyBackdrop({
  phase,
  cloudKind,
  cloudCover,
  clip = null,
  raining = false,
  thunder = false,
}: {
  phase: SkyPhase;
  cloudKind: CloudKind;
  cloudCover: number;
  clip?: HeroClip;
  raining?: boolean;
  thunder?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();

  // The sun/moon clips are ambient scenery rather than motion effects, so under
  // reduced motion they still render — just paused on a still frame. Hiding
  // them entirely left the header empty for anyone with Windows "animation
  // effects" off, which Chrome reports as prefers-reduced-motion: reduce.
  // Rain and lightning stay gated below: those genuinely are motion.
  const heroClip = clip;
  // Hero clips carry their own clouds, so the generated layers are skipped
  // while either shows, to avoid stacking two sets.
  const showClouds = heroClip === null;
  const lightSky = isLightSky(phase);

  const config = cloudKind === "clear" ? null : CLOUD_FILTER[cloudKind];
  // Keep a floor so a "clear but hazy" sky still shows something.
  const coverage = Math.max(0.2, Math.min(1, cloudCover / 100));
  const tintRgb = rgbUnit(cloudColor(phase, cloudKind));
  // Coverage thickens the cloud through the alpha bias rather than through
  // layer opacity — fading a full-sky overcast just makes it look washed out.
  const alphaBias = config
    ? (config.bias + coverage * config.biasRange).toFixed(3)
    : "0";

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundImage: skyGradientFor(phase, heroClip) }}
    >
      {config && showClouds && (
        <>
          <svg
            className="absolute h-0 w-0"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              {LAYERS.map((layer) => (
                <filter
                  key={layer.seed}
                  id={`cloud-${uid}-${layer.seed}`}
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                  // Default linearRGB would shift the tint away from the value
                  // cloudColor picked.
                  colorInterpolationFilters="sRGB"
                >
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency={config.baseFrequency}
                    numOctaves={config.numOctaves}
                    seed={layer.seed}
                    result="noise"
                  />
                  {/* Flat tint in the constant column; alpha from the red
                      channel, negated so peaks of noise become gaps of sky. */}
                  <feColorMatrix
                    in="noise"
                    type="matrix"
                    values={`0 0 0 0 ${tintRgb[0]} 0 0 0 0 ${tintRgb[1]} 0 0 0 0 ${tintRgb[2]} ${-config.contrast} 0 0 0 ${alphaBias}`}
                    result="tinted"
                  />
                  {/* Feathers the alpha edges so it reads as vapour rather than
                      torn paper. After the matrix, not before — blurring the
                      raw noise first flattens it back into smooth bands. */}
                  <feGaussianBlur in="tinted" stdDeviation={config.soften} />
                </filter>
              ))}
            </defs>
          </svg>

          {LAYERS.map((layer) => (
            <div
              key={layer.seed}
              className="animate-cloud-drift absolute"
              style={{
                // Overflow has to exceed the drift, or the far edge swings into
                // view: cloudDrift translates +/-9% of this element's width.
                inset: "-16%",
                opacity: layer.opacity,
                filter: `url(#cloud-${uid}-${layer.seed})`,
                animationDuration: layer.duration,
                // Thins toward the top of the header, where the text sits.
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, #000 38%, #000 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, #000 38%, #000 100%)",
              }}
            />
          ))}
        </>
      )}

      {/* One asset, three phases: `multiply` drops the clip's white background
          and retints the sun with whatever sky is behind it — a low warm glow at
          dawn and dusk, a bright disc at midday. */}
      {heroClip === "sun" && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            mixBlendMode: "multiply",
            objectPosition: sunClipPosition(phase),
          }}
          src="/video/sunny.mp4"
          autoPlay={!reduceMotion}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      )}

      {/* The moon clip is the same artwork-on-white, but it has to sit on a dark
          sky — where the moon must read brighter than its surroundings rather
          than darker. Greyscale-on-white gives no separate alpha, so it was
          inverted at encode time (white → black, moon → bright) and is
          composited with `screen`, same as the rain. */}
      {heroClip === "moon" && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          style={{ mixBlendMode: "screen" }}
          src="/video/night.mp4"
          autoPlay={!reduceMotion}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      )}

      {/* Rain is a luma matte — white streaks on black — composited with
          `screen`, which drops the black entirely. That avoids transparent
          video (VP9 alpha is unreliable and iOS Safari can't play it at all)
          and plays as plain H.264 everywhere. Sits under the scrim so the
          header text keeps its contrast. */}
      {raining && !reduceMotion && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          style={{ mixBlendMode: "screen", opacity: 0.6 }}
          src="/video/rain.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      )}

      {/* Lightning needs no asset: a white wash held at zero for most of the
          cycle, with two quick strikes. Long gaps keep it from reading as a
          broken flicker. */}
      {thunder && !reduceMotion && (
        <div className="animate-lightning pointer-events-none absolute inset-0 bg-white" />
      )}

      {/* Scrim only exists to protect header text contrast, so it follows the
          text colour: a dark wash under white text on the dark skies, and a
          light one under dark text on the bright ones. */}
      <div
        className={`absolute inset-0 bg-linear-to-b to-transparent ${
          lightSky ? "from-white/25 via-white/10" : "from-black/25 via-black/10"
        }`}
      />
    </div>
  );
}
