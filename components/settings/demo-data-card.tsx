"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { clearDemoDataAction, seedDemoDataAction } from "@/lib/actions/demo";
import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DemoDataCard({ hasDemoData }: { hasDemoData: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(hasDemoData);
  const [pending, startTransition] = useTransition();

  return (
    <Card id="demo-data">
      <CardHeader>
        <CardTitle>Demo data</CardTitle>
        <CardDescription>
          Load sample clients, projects, tasks, invoices, payments, time entries, and notes into{" "}
          <span className="font-medium text-foreground">this workspace only</span>. Rows are tagged with{" "}
          <code className="text-xs">[Demo]</code> so you can remove them later. Not available in production unless{" "}
          <code className="text-xs">ALLOW_DEMO_DATA=true</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {seeded
            ? "Demo data is present in this workspace."
            : "No demo data in this workspace yet."}
        </p>
        <FieldError message={error ?? undefined} />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending || seeded}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await seedDemoDataAction();
              if ("error" in result && result.error) {
                setError(result.error);
                return;
              }
              setSeeded(true);
              toast("Demo data added");
            });
          }}
        >
          {pending && !seeded ? "Seeding…" : "Seed demo data"}
        </Button>
        <ConfirmDialog
          title="Clear demo data?"
          description="Deletes every [Demo]-tagged client in this workspace and related projects, tasks, invoices, payments, notes, and time entries. Real (non-demo) data is left alone."
          confirmLabel="Clear demo data"
          pendingLabel="Clearing…"
          trigger={
            <Button type="button" variant="outline" disabled={pending || !seeded}>
              Clear demo data
            </Button>
          }
          onConfirm={async () => {
            setError(null);
            const result = await clearDemoDataAction();
            if ("error" in result && result.error) {
              return result.error;
            }
            setSeeded(false);
            toast("Demo data cleared");
          }}
        />
      </CardFooter>
    </Card>
  );
}
