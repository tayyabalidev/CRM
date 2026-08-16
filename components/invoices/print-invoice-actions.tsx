"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export function PrintInvoiceActions() {
  useEffect(() => {
    const timeout = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl justify-end gap-2 print:hidden">
      <Button type="button" variant="outline" onClick={() => window.history.back()}>
        Back
      </Button>
      <Button type="button" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}
