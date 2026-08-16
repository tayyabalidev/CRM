"use client";

import { useTransition } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { useTimer } from "@/components/time/timer-provider";
import { Button } from "@/components/ui/button";

export function StartTimerButton({
  projectId,
  taskId,
}: {
  projectId: string | null;
  taskId: string;
}) {
  const { running, canTrack, start } = useTimer();
  const [pending, startTransition] = useTransition();

  if (!canTrack || !projectId) {
    return null;
  }

  if (running) {
    return null;
  }

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const error = await start({
            projectId,
            taskId,
            description: "",
            billable: true,
            hourlyRate: "",
          });

          if (error) {
            toast.error(error);
          }
        });
      }}
    >
      <Play className="size-3 fill-current" />
      {pending ? "Starting..." : "Start timer"}
    </Button>
  );
}
