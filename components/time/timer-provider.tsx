"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { discardTimerAction, startTimerAction, stopTimerAction } from "@/lib/actions/time";
import type { RunningTimer } from "@/lib/services/time";
import type { StartTimerInput } from "@/lib/validations/time";

type TimerContextValue = {
  running: RunningTimer | null;
  elapsed: number;
  canTrack: boolean;
  start: (input: StartTimerInput) => Promise<string | null>;
  stop: () => Promise<string | null>;
  discard: () => Promise<string | null>;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({
  initialRunning,
  canTrack,
  children,
}: {
  initialRunning: RunningTimer | null;
  canTrack: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<{
    fromId: string | null;
    running: RunningTimer | null;
  } | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const serverId = initialRunning?.id ?? null;
  const running =
    optimistic && optimistic.fromId === serverId ? optimistic.running : initialRunning;
  const runningId = running?.id ?? null;
  const startedAt = running?.startedAt ?? null;

  useEffect(() => {
    if (!runningId || !startedAt) {
      return;
    }

    const timeout = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [runningId, startedAt]);

  const start = useCallback(
    async (input: StartTimerInput) => {
      const result = await startTimerAction(input);

      if ("error" in result) {
        return result.error;
      }

      setOptimistic({ fromId: serverId, running: result.running });
      router.refresh();
      toast.success("Timer started");
      return null;
    },
    [router, serverId],
  );

  const stop = useCallback(async () => {
    const result = await stopTimerAction();

    if (result.error) {
      return result.error;
    }

    setOptimistic({ fromId: serverId, running: null });
    router.refresh();
    toast.success("Timer stopped");
    return null;
  }, [router, serverId]);

  const discard = useCallback(async () => {
    const result = await discardTimerAction();

    if (result.error) {
      return result.error;
    }

    setOptimistic({ fromId: serverId, running: null });
    router.refresh();
    toast.success("Timer discarded");
    return null;
  }, [router, serverId]);

  const elapsed =
    running && now != null ? Math.max(0, Math.floor((now - Date.parse(running.startedAt)) / 1000)) : 0;

  const value = useMemo(
    () => ({ running, elapsed, canTrack, start, stop, discard }),
    [running, elapsed, canTrack, start, stop, discard],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const value = useContext(TimerContext);

  if (!value) {
    throw new Error("useTimer must be used within TimerProvider");
  }

  return value;
}
