import { Badge } from "@/components/ui/badge";
import { invoiceStatusLabels } from "@/components/invoices/labels";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types/index";

export function InvoiceStatusBadge({ value }: { value: InvoiceStatus }) {
  const tone =
    value === "paid"
      ? "default"
      : value === "overdue"
        ? "destructive"
        : value === "cancelled" || value === "draft"
          ? "outline"
          : "secondary";

  return (
    <Badge variant={tone} className={cn(value === "draft" && "text-muted-foreground")}>
      {invoiceStatusLabels[value]}
    </Badge>
  );
}
