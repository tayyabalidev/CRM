import type { ReactNode } from "react";
import { CircleDollarSign, Clock3, Mail, MapPin, Phone, Globe } from "lucide-react";

import { ClientFormSheet } from "@/components/clients/client-form-sheet";
import { ClientRelated } from "@/components/clients/client-related";
import { ClientRowActions } from "@/components/clients/client-row-actions";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientDetail } from "@/lib/services/clients";
import { formatMoney } from "@/lib/utils/money";
import type { WorkspaceRole } from "@/types/index";

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
  href?: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} className="break-all text-sm hover:underline" target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            {value}
          </a>
        ) : (
          <p className="text-sm">{value}</p>
        )}
      </div>
    </div>
  );
}

export function ClientOverview({
  detail,
  currency,
  timeZone,
  canManage,
  role,
  userId,
  portalAccess,
}: {
  detail: ClientDetail;
  currency: string;
  timeZone: string;
  canManage: boolean;
  role: WorkspaceRole;
  userId: string;
  portalAccess?: ReactNode;
}) {
  const { client } = detail;
  const websiteHref = client.website
    ? client.website.startsWith("http")
      ? client.website
      : `https://${client.website}`
    : undefined;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <ClientStatusBadge value={client.status} />
          </div>
          <p className="text-sm text-muted-foreground">{client.company || "No company"}</p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <ClientFormSheet
              client={client}
              trigger={<Button variant="outline">Edit</Button>}
            />
            <ClientRowActions client={client} />
          </div>
        ) : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardDescription>Total revenue</CardDescription>
              <CardTitle className="text-2xl">{formatMoney(detail.totalRevenue, currency)}</CardTitle>
            </div>
            <CircleDollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardDescription>Outstanding</CardDescription>
              <CardTitle className="text-2xl">{formatMoney(detail.outstanding, currency)}</CardTitle>
            </div>
            <Clock3 className="size-4 text-muted-foreground" />
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Client information</CardTitle>
            <CardDescription>Contact details and notes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoRow icon={Mail} label="Email" value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
            <InfoRow icon={Phone} label="Phone" value={client.phone} href={client.phone ? `tel:${client.phone}` : undefined} />
            <InfoRow icon={Globe} label="Website" value={client.website} href={websiteHref} />
            <InfoRow icon={MapPin} label="Country" value={client.country} />
            <div className="sm:col-span-2">
              <InfoRow icon={MapPin} label="Address" value={client.address} />
            </div>
            {client.notes ? (
              <div className="sm:col-span-2 space-y-1">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
              </div>
            ) : null}
            {!client.email && !client.phone && !client.website && !client.country && !client.address && !client.notes ? (
              <p className="sm:col-span-2 text-sm text-muted-foreground">No extra contact details yet.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Current workload for this client.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Projects</span>
              <span className="font-medium">{detail.projectCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tasks</span>
              <span className="font-medium">{detail.taskCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Invoices</span>
              <span className="font-medium">{detail.invoiceCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payments</span>
              <span className="font-medium">{detail.paymentCount}</span>
            </div>
          </CardContent>
        </Card>
        {portalAccess ? <div className="xl:col-span-3">{portalAccess}</div> : null}
      </section>

      <ClientRelated
        detail={detail}
        timeZone={timeZone}
        currency={currency}
        canManage={canManage}
        role={role}
        userId={userId}
      />
    </div>
  );
}
