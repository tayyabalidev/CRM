import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { formatInvoiceMoney } from "@/lib/invoices/totals";
import type { InvoiceDetail } from "@/lib/services/invoices";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

function formatQty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function TotalRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <tr>
      <td colSpan={3} className={cn("pt-1.5 pr-6 text-right text-neutral-500", className)}>
        {label}
      </td>
      <td className={cn("pt-1.5 text-right tabular-nums", className)}>{value}</td>
    </tr>
  );
}

export function InvoiceDocument({
  detail,
  issuerName,
  issuerEmail,
  issuerPhone,
  currency,
  timeZone,
}: {
  detail: InvoiceDetail;
  issuerName: string;
  issuerEmail?: string | null;
  issuerPhone?: string | null;
  currency: string;
  timeZone: string;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl bg-white text-neutral-900">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
        <div className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight">{issuerName}</p>
          {issuerEmail ? <p className="text-sm text-neutral-600">{issuerEmail}</p> : null}
          {issuerPhone ? <p className="text-sm text-neutral-600">{issuerPhone}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-xs font-medium tracking-[0.2em] text-neutral-500">INVOICE</p>
          <p className="mt-1 text-xl font-semibold">{detail.invoiceNumber}</p>
          <div className="mt-2 flex justify-end">
            <InvoiceStatusBadge value={detail.status} />
          </div>
        </div>
      </header>

      <section className="grid gap-8 py-6 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-neutral-500">Bill to</p>
          <p className="font-medium">{detail.client.name}</p>
          {detail.client.company ? <p className="text-sm text-neutral-600">{detail.client.company}</p> : null}
          {detail.client.address ? (
            <p className="text-sm text-neutral-600 whitespace-pre-wrap">{detail.client.address}</p>
          ) : null}
          {detail.client.country ? <p className="text-sm text-neutral-600">{detail.client.country}</p> : null}
          {detail.client.email ? <p className="text-sm text-neutral-600">{detail.client.email}</p> : null}
          {detail.client.phone ? <p className="text-sm text-neutral-600">{detail.client.phone}</p> : null}
        </div>
        <dl className="grid w-fit grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm sm:justify-self-end">
          <dt className="text-neutral-500">Issue date</dt>
          <dd>{formatDate(detail.issueDate, timeZone)}</dd>
          <dt className="text-neutral-500">Due date</dt>
          <dd>{detail.dueDate ? formatDate(detail.dueDate, timeZone) : "—"}</dd>
          <dt className="text-neutral-500">Project</dt>
          <dd>{detail.projectName ?? "—"}</dd>
        </dl>
      </section>

      <table className="w-full min-w-[28rem] table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-16" />
          <col className="w-28" />
          <col className="w-32" />
        </colgroup>
        <thead>
          <tr className="border-y text-xs tracking-wide text-neutral-500">
            <th className="py-2 text-left font-medium">Description</th>
            <th className="w-16 py-2 text-right font-medium">Qty</th>
            <th className="w-28 py-2 text-right font-medium">Price</th>
            <th className="w-32 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {detail.items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-200">
              <td className="py-2.5 pr-4">{item.description}</td>
              <td className="py-2.5 text-right tabular-nums">{formatQty(item.quantity)}</td>
              <td className="py-2.5 text-right tabular-nums">{formatInvoiceMoney(item.unitPrice, currency)}</td>
              <td className="py-2.5 text-right tabular-nums">{formatInvoiceMoney(item.total, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <TotalRow label="Subtotal" value={formatInvoiceMoney(detail.subtotal, currency)} className="pt-6" />
          {detail.discount > 0 ? (
            <TotalRow label="Discount" value={`−${formatInvoiceMoney(detail.discount, currency)}`} />
          ) : null}
          {detail.tax > 0 ? <TotalRow label="Tax" value={formatInvoiceMoney(detail.tax, currency)} /> : null}
          <TotalRow
            label="Total"
            value={formatInvoiceMoney(detail.total, currency)}
            className="border-t pt-2 font-medium text-neutral-900"
          />
          <TotalRow label="Amount paid" value={formatInvoiceMoney(detail.amountPaid, currency)} />
          <TotalRow
            label="Remaining"
            value={formatInvoiceMoney(detail.remaining, currency)}
            className="border-t pt-2 text-base font-semibold text-neutral-900"
          />
        </tfoot>
      </table>

      {detail.notes ? (
        <section className="mt-8 space-y-1">
          <p className="text-xs font-medium tracking-wide text-neutral-500">Notes</p>
          <p className="whitespace-pre-wrap text-sm text-neutral-700">{detail.notes}</p>
        </section>
      ) : null}
    </article>
  );
}
