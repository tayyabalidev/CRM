import { Construction } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{phase}</Badge>
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-lg border bg-muted/50">
            <Construction className="size-4 text-muted-foreground" />
          </div>
          <CardTitle>This module is not built yet</CardTitle>
          <CardDescription>
            The application shell is ready. Business features will be added phase by phase so each
            part can be tested before the next one starts.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
