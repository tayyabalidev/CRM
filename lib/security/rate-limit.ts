type RateLimitRule = {
  max: number;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitState>();

function nowMs() {
  return Date.now();
}

function cleanupExpired(current: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= current) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  rule: RateLimitRule,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const current = nowMs();
  cleanupExpired(current);
  const currentState = store.get(key);

  if (!currentState || currentState.resetAt <= current) {
    store.set(key, { count: 1, resetAt: current + rule.windowMs });
    return { ok: true };
  }

  if (currentState.count >= rule.max) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((currentState.resetAt - current) / 1000)),
    };
  }

  currentState.count += 1;
  store.set(key, currentState);
  return { ok: true };
}
