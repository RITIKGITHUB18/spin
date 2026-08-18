import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { completeProfile } from '../../services/api/auth';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { apiErrorMessage } from '../../services/api/client';
import { FormError } from '../../components/common/FormError';
import { Spinner } from '../../components/common/Spinner';

export function NamePage() {
  const navigate = useNavigate();
  const phone = useOnboardingStore((s) => s.phone);
  // Reaching this page means the OTP was already verified, so a Supabase
  // session exists; the profile is what is still missing.
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState('');
  const [flat, setFlat] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => completeProfile(fullName.trim(), flat.trim()),
    onSuccess: (data) => {
      setUser(data.user);
      navigate('/app');
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not create account')),
  });

  // Captured once at mount so a token refresh mid-submit cannot bounce the new
  // user back to /phone while they are navigating to /app.
  const [hadSession] = useState(() => !!token);
  if (!hadSession) return <Navigate to="/phone" replace />;

  const valid = fullName.trim().length > 0 && flat.trim().length > 0;
  const maskedPhone = `+91 ••••• ${phone.slice(-5)}`;

  return (
    <div className="flex min-h-svh flex-col px-7.5 pb-7.5 pt-4.5">
      <div>
        <div className="font-serif text-[34px] text-cream-900">Nice to meet you</div>
        <div className="mt-2 text-[14.5px] text-cream-500">Just so your washes link to the right flat.</div>
      </div>
      <div className="mt-7 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-cream-500">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Aanya Sharma"
            className="rounded-[14px] border-[1.5px] border-cream-200 bg-white px-4 py-3.5 text-[15px] text-cream-900 outline-none focus:border-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-cream-500">Flat number</span>
          <input
            value={flat}
            onChange={(e) => setFlat(e.target.value)}
            placeholder="e.g. B-204"
            className="rounded-[14px] border-[1.5px] border-cream-200 bg-white px-4 py-3.5 text-[15px] text-cream-900 outline-none focus:border-brand-500"
          />
        </label>
        <div className="flex items-center justify-between rounded-[14px] bg-cream-100 px-4 py-3.5 text-cream-500">
          <span className="font-mono text-sm">{maskedPhone}</span>
          <span className="rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-bold text-success-ic">verified</span>
        </div>
      </div>
      <div className="flex-1" />
      <FormError message={error} />
      <button
        type="button"
        disabled={!valid || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15.5px] font-bold text-white disabled:bg-cream-150 disabled:text-cream-400 bg-gradient-to-b from-brand-500 to-brand-600 shadow-lg disabled:shadow-none"
      >
        {mutation.isPending ? (
          <>
            Creating account
            <Spinner size={18} />
          </>
        ) : (
          <>
            Create account
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </>
        )}
      </button>
      <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-cream-400">
        <svg width="14" height="14" className="mt-0.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 11h12v9H6z" />
          <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
        </svg>
        Your name &amp; flat stay private — used only to ping you about your own wash.
      </div>
    </div>
  );
}
