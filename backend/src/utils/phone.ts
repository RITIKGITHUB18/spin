import { AppError } from './AppError';

/**
 * One canonical representation everywhere: +91XXXXXXXXXX. MSG91, Supabase and
 * our own tables all store this exact string, so a number can never match in
 * one system and miss in another.
 *
 * Accepts 9876543210, 919876543210, +919876543210 and common separators.
 */
export function normalizeIndianPhone(input: string): string {
  const digits = String(input ?? '').replace(/\D/g, '');

  let local: string;
  if (digits.length === 10) local = digits;
  else if (digits.length === 12 && digits.startsWith('91')) local = digits.slice(2);
  else if (digits.length === 13 && digits.startsWith('091')) local = digits.slice(3);
  else throw new AppError(400, 'INVALID_PHONE', 'Enter a valid 10-digit Indian mobile number');

  // Indian mobile numbers start 6-9; anything else is a landline or malformed.
  if (!/^[6-9]\d{9}$/.test(local)) {
    throw new AppError(400, 'INVALID_PHONE', 'Enter a valid 10-digit Indian mobile number');
  }

  return `+91${local}`;
}

/** MSG91's widget identifier omits the leading `+`. */
export function toMsg91Identifier(e164: string): string {
  return e164.replace(/^\+/, '');
}

/** +919876543210 -> +9198*****10. Used for logs; never log the full number. */
export function maskPhone(e164: string): string {
  if (e164.length < 8) return '+91*****';
  return `${e164.slice(0, 5)}*****${e164.slice(-2)}`;
}
