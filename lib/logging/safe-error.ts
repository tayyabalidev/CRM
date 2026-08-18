import { captureException } from "@/lib/logging/sentry";

type SafeErrorPayload = {
  context: string;
  name?: string;
  message?: string;
  code?: string | number;
  digest?: string;
};

function serializeUnknown(error: unknown): Omit<SafeErrorPayload, "context"> {
  if (error instanceof Error) {
    const withExtras = error as Error & { code?: string | number; digest?: string };
    return {
      name: error.name,
      message: error.message.slice(0, 300),
      code: withExtras.code,
      digest: withExtras.digest,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : undefined,
      message: typeof record.message === "string" ? record.message.slice(0, 300) : undefined,
      code:
        typeof record.code === "string" || typeof record.code === "number" ? record.code : undefined,
    };
  }

  return { message: String(error).slice(0, 300) };
}

/** Server-side logging only. Never return this payload to the browser. */
export function logServerError(context: string, error: unknown) {
  const payload: SafeErrorPayload = { context, ...serializeUnknown(error) };
  console.error("[workflow]", payload);
  captureException(error, { context });
}

/** Log a DB/service failure, then throw a user-facing message (no raw DB text). */
export function throwUserError(context: string, error: unknown, userMessage: string): never {
  logServerError(context, error);
  throw new Error(userMessage);
}
