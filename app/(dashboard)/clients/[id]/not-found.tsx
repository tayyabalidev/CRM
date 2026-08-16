import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ClientNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Client not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This client does not exist in your workspace, or you do not have access to it.
      </p>
      <Button asChild>
        <Link href="/clients">Back to clients</Link>
      </Button>
    </div>
  );
}
