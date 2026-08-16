import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center gap-1.5 px-3 py-6 text-center"
          : "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center"
      }
    >
      {icon ? (
        <div className="mb-1 flex size-9 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
