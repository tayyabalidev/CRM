import * as Sentry from "@sentry/nextjs";

function isEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!isEnabled()) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}
