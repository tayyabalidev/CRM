import { cn } from "@/lib/utils";

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-foreground transition-[width]")}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-muted-foreground">{clamped}%</span>
    </div>
  );
}
