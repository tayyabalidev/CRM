/** Prefix on demo entity names/titles so seed data is easy to find and remove. */
export const DEMO_PREFIX = "[Demo] ";

export function demoLabel(name: string) {
  return `${DEMO_PREFIX}${name}`;
}

export function isDemoLabel(value: string | null | undefined) {
  return Boolean(value?.startsWith(DEMO_PREFIX));
}

/**
 * Demo tools are for local/dev by default.
 * Set ALLOW_DEMO_DATA=true to enable on a deployed environment (e.g. Vercel preview).
 * Set ALLOW_DEMO_DATA=false to force off even in development.
 */
export function isDemoDataEnabled() {
  if (process.env.ALLOW_DEMO_DATA === "true") {
    return true;
  }

  if (process.env.ALLOW_DEMO_DATA === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}
