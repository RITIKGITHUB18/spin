/**
 * Structured event log for the OTP flow.
 *
 * Deliberately narrow: only the fields listed in `SafeFields` can be passed, so
 * an OTP, authkey, access token or service-role key cannot be logged by
 * accident. Phone numbers must already be masked by the caller.
 */
export type OtpEvent =
  | 'OTP_SEND_REQUEST'
  | 'OTP_SEND_SUCCESS'
  | 'OTP_SEND_FAILURE'
  | 'OTP_VERIFY_REQUEST'
  | 'OTP_VERIFY_SUCCESS'
  | 'OTP_VERIFY_FAILURE'
  | 'OTP_RESEND_REQUEST'
  | 'OTP_RESEND_SUCCESS'
  | 'OTP_RESEND_FAILURE'
  | 'OTP_PHONE_MISMATCH'
  | 'SUPABASE_USER_CREATED'
  | 'SUPABASE_USER_FOUND';

interface SafeFields {
  /** Already masked — use maskPhone(). */
  phone?: string;
  /** Our transaction id, never MSG91's reqId. */
  transactionId?: string;
  attempts?: number;
  resends?: number;
  reason?: string;
  userId?: string;
}

export function logOtp(event: OtpEvent, fields: SafeFields = {}): void {
  console.log(JSON.stringify({ event, ...fields }));
}
