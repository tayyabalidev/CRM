import type { ReactNode } from "react";

import { requireWorkspace } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export default async function PrintLayout({ children }: { children: ReactNode }) {
  await requireWorkspace();
  return <div className="min-h-svh bg-white text-neutral-900">{children}</div>;
}
