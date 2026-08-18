/**
 * Sits directly above the primary action, where the eye already is when a tap
 * fails. `role="alert"` makes screen readers announce it on appearance, which a
 * plain styled div would not.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-3.5 flex items-start gap-2.5 rounded-2xl border border-error-bd bg-error-bg px-4 py-3 text-[13.5px] font-semibold leading-snug text-error-tx"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-px flex-none"
        aria-hidden="true"
      >
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
