import { Resend } from "resend";

let resend: Resend | null = null;

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  if (!resend) {
    resend = new Resend(key);
  }

  return resend;
}
