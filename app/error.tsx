"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";
import { captureException } from "@/lib/logging/sentry";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[workflow]", {
      context: "app/error",
      name: error.name,
      digest: error.digest,
      message: error.message.slice(0, 300),
    });
    captureException(error, { context: "app/error", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{appConfig.name}</p>
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We hit an unexpected error. Try again, or go back to the dashboard.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
