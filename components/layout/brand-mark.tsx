import { appConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-lg bg-foreground text-background shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 20 20" className="size-3.5" fill="none">
        <path
          d="M4 6.5h7.5L8.2 13.5H4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 6.5H16L12.7 13.5H9.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.72"
        />
      </svg>
    </span>
  );
}

export function BrandWordmark({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return <BrandMark />;
  }

  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-sm font-semibold tracking-tight">{appConfig.shortName}</span>
        <span className="truncate text-[11px] text-muted-foreground">CRM</span>
      </span>
    </span>
  );
}
