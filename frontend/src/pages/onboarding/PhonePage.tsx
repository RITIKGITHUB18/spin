import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { sendOtp, toMsg91Identifier } from '../../services/msg91Widget';
import { useOnboardingStore } from '../../store/onboardingStore';
import { authErrorMessage } from '../../services/api/client';
import { FormError } from '../../components/common/FormError';
import { Spinner } from '../../components/common/Spinner';

export function PhonePage() {
  const navigate = useNavigate();
  const setPhone = useOnboardingStore((s) => s.setPhone);
  const setRequestId = useOnboardingStore((s) => s.setRequestId);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    // Goes straight to MSG91 from the browser — the backend is not involved
    // until the code has been verified.
    mutationFn: () => sendOtp(toMsg91Identifier(value)),
    onSuccess: (reqId) => {
      setPhone(value);
      setRequestId(reqId);
      navigate('/otp');
    },
    onError: (err) => setError(authErrorMessage(err, 'Could not send code')),
  });

  const valid = value.length === 10;

  return (
    <div className="flex min-h-svh flex-col px-7.5 pb-7.5 pt-5">
      <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-cream-200 bg-white text-cream-700">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="M11 18l-6-6 6-6" />
        </svg>
      </Link>
      <div className="mt-6.5">
        <div className="font-serif text-[34px] text-cream-900">What's your number?</div>
        <div className="mt-2 max-w-[290px] text-[14.5px] text-cream-500">We'll text a one-time code to verify it's you.</div>
      </div>
      <div className="mt-7.5 flex items-stretch gap-2.5">
        <div className="flex items-center rounded-[14px] border-[1.5px] border-cream-200 bg-white px-4 text-base font-bold text-cream-700">+91</div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
          inputMode="numeric"
          placeholder="98765 43210"
          className="flex-1 rounded-[14px] border-[1.5px] border-cream-200 bg-white px-4 py-3.5 font-mono text-lg tracking-wide text-cream-900 outline-none focus:border-brand-500"
        />
      </div>
      <div className="flex-1" />
      <FormError message={error} />
      <button
        type="button"
        disabled={!valid || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15.5px] font-bold text-white disabled:bg-cream-150 disabled:from-cream-150 disabled:to-cream-150 disabled:text-cream-400 bg-gradient-to-b from-brand-500 to-brand-600 shadow-lg disabled:shadow-none"
      >
        {mutation.isPending ? (
          <>
            Sending code
            <Spinner size={18} />
          </>
        ) : (
          <>
            Continue
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
        Used only to sign in. Neighbours never see your number.
      </div>
    </div>
  );
}
