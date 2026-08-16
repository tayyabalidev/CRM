import Link from "next/link";

import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{appConfig.name}</p>
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        That URL does not exist, or you do not have access to it.
      </p>
      <Button asChild>
        <Link href="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}
