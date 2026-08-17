import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Unauthorized",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{appConfig.name}</p>
      <h1 className="text-xl font-semibold tracking-tight">You don’t have access</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        That page is only available to workspace staff. Ask an owner if you need access, or return to your
        dashboard.
      </p>
      <Button asChild>
        <Link href="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}
