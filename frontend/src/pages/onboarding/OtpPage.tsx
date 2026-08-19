import { useRef, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { verifyAccessToken } from '../../services/api/auth';
import { verifyOtp } from '../../services/msg91Widget';
import { weatherQueryOptions } from '../../hooks/useWeather';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { authErrorMessage } from '../../services/api/client';
import { FormError } from '../../components/common/FormError';
import { Spinner } from '../../components/common/Spinner';

// Must match the OTP length configured on the MSG91 widget (dashboard →
// your OTP widget → OTP Length).
const OTP_LENGTH = 4;

export function OtpPage() {
  const navigate = useNavigate();
  const phone = useOnboardingStore((s) => s.phone);
  // verifyOtp needs the reqId that sendOtp returned.
  const requestId = useOnboardingStore((s) => s.requestId);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const [digits, setDigits] = useState(() => Array<string>(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      // MSG91 decides whether the code is right; we never check it ourselves.
      const accessToken = await verifyOtp(requestId!, digits.join(''));
      // Then the backend validates that token with MSG91 and issues a session.
      const result = await verifyAccessToken(accessToken);

      // Resolve the weather before entering the app so Home paints the right
      // sky on its first frame instead of showing a bare gradient and popping
      // the sun or moon in a moment later. Capped so a slow network — or a
      // geolocation prompt the user ignores — cannot hold up the sign-in;
      // Home's own useWeather picks up whatever is still in flight.
      // Budget: geolocation gives up after 1.5s and the forecast call runs
      // ~0.7s, so 3s clears the worst case with room to spare. The old 1.5s cap
      // was lost the moment a permission prompt appeared — exactly the
      // first-run case this prefetch exists for.
      await Promise.race([
        queryClient.prefetchQuery(weatherQueryOptions),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);

      return result;
    },
    onSuccess: (result) => {
      if (result.isNewUser || !result.profile) {
        navigate('/name');
      } else {
        setUser(result.profile);
        navigate('/app');
      }
    },
    onError: (err) => setError(authErrorMessage(err, 'Incorrect code')),
  });

  // Without a reqId there is no OTP attempt to verify against.
  if (!phone || !requestId) return <Navigate to="/phone" replace />;

  function handleChange(i: number, raw: string) {
    const v = raw.replace(/\D/g, '').slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = v;
      return next;
    });
    if (v && i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  const complete = digits.join('').length === OTP_LENGTH;
  const maskedPhone = `+91 ••••• ${phone.slice(-5)}`;

  return (
    <div className="flex min-h-svh flex-col px-7.5 pb-7.5 pt-5">
      <Link to="/phone" className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-cream-200 bg-white text-cream-700">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="M11 18l-6-6 6-6" />
        </svg>
      </Link>
      <div className="mt-6.5">
        <div className="font-serif font-semibold text-[34px] text-cream-900">Enter the code</div>
        <div className="mt-2 text-[14.5px] text-cream-500">
          Sent to <span className="font-semibold text-cream-800">{maskedPhone}</span>
        </div>
      </div>
      <div className="mt-7.5 flex gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            className="h-17.5 w-15 rounded-2xl border-[1.5px] border-cream-200 bg-white text-center tracking-[0.06em] text-[28px] font-bold text-cream-900 outline-none focus:border-brand-500"
          />
        ))}
      </div>
      <div className="flex-1" />
      <FormError message={error} />
      <button
        type="button"
        disabled={!complete || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15.5px] font-semibold tracking-[1px] text-white disabled:bg-cream-150 disabled:text-cream-400 bg-gradient-to-b from-brand-500 to-brand-600 shadow-lg disabled:shadow-none"
      >
        {mutation.isPending ? (
          <>
            Verifying
            <Spinner size={18} />
          </>
        ) : (
          <>
            Verify &amp; continue
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
