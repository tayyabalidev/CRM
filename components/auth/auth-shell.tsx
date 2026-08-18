import Link from "next/link";
import type { ReactNode } from "react";

import { BrandWordmark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { appConfig } from "@/lib/config";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Link href="/login" className="mb-8 flex justify-center">
          <BrandWordmark />
        </Link>
        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <div className="mb-6 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {appConfig.name} ·{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
