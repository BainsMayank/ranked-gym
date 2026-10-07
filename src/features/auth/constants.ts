/**
 * Digits in the emailed sign-in code. Must match Supabase Auth → Email → "Email OTP length"
 * (`otp_length` in supabase/config.toml for local).
 */
export const OTP_LENGTH = 6;

/** Wait before another code can be requested (Supabase also rate-limits per email). */
export const RESEND_COOLDOWN_SEC = 60;
