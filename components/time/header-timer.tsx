"use client";

import { Play, Square, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { StartTimerForm } from "@/components/time/start-timer-form";
import { useTimer } from "@/components/time/timer-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatTimer } from "@/lib/utils/duration";

export function HeaderTimer() {
  const { running, elapsed, canTrack, stop, discard } = useTimer();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!canTrack) {
    return null;
  }

  if (running) {
    return (
      <div className="flex items-center gap-0.5 sm:gap-1">
        <div className="flex max-w-[9.5rem] items-center gap-1.5 rounded-lg border bg-muted/40 px-1.5 py-1 sm:max-w-none sm:gap-2 sm:px-2">
          <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
          <span className="hidden max-w-28 truncate text-xs text-muted-foreground md:inline">
            {running.projectName}
          </span>
          <span className="font-mono text-[11px] font-medium tabular-nums sm:text-xs">
            {formatTimer(elapsed)}
          </span>
        </div>
        <Button
          size="icon-sm"
          variant="outline"
          className="sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
          disabled={pending}
          aria-label="Stop timer"
          onClick={() => {
            startTransition(async () => {
              await stop();
            });
          }}
        >
          <Square className="size-3 fill-current" />
          <span className="hidden sm:inline">Stop</span>
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="sm:h-8 sm:w-auto sm:px-2.5"
          disabled={pending}
          aria-label="Discard timer"
          onClick={() => {
            startTransition(async () => {
              await discard();
            });
          }}
        >
          <Trash2 className="size-3.5 sm:hidden" />
          <span className="hidden sm:inline">Discard</span>
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon-sm" variant="outline" className="sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5" aria-label="Start timer">
          <Play className="size-3 fill-current" />
          <span className="hidden sm:inline">Start timer</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] p-3">
        <PopoverHeader className="mb-2">
          <PopoverTitle>Start timer</PopoverTitle>
          <PopoverDescription>
            Track time against a project. The timer stays running as you move around.
          </PopoverDescription>
        </PopoverHeader>
        <StartTimerForm onStarted={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
