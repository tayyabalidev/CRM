import Link from "next/link";
import {
  Activity,
  Bug,
  FolderKanban,
  ListTodo,
  Paperclip,
  Receipt,
  StickyNote,
  Wallet,
} from "lucide-react";

import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { RelatedSection } from "@/components/clients/related-section";
import { FileAttachmentList } from "@/components/files/file-attachment-list";
import { FileUploadSheet } from "@/components/files/file-upload-sheet";
import { NoteFormSheet } from "@/components/notes/note-form-sheet";
import { NoteRelatedList } from "@/components/notes/note-related-list";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canCreateNote } from "@/lib/notes/access";
import type { ClientDetail } from "@/lib/services/clients";
import { formatDate } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import type { WorkspaceRole } from "@/types/index";

export function ClientRelated({
  detail,
  timeZone,
  currency,
  canManage,
  role,
  userId,
}: {
  detail: ClientDetail;
  timeZone: string;
  currency: string;
  canManage: boolean;
  role: WorkspaceRole;
  userId: string;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <RelatedSection
        title="Projects"
        description="Work attached to this client."
        emptyTitle="No projects"
        emptyDescription="Projects for this client will appear here."
        icon={<FolderKanban className="size-4" />}
        isEmpty={detail.projects.length === 0}
      >
        <ul className="divide-y">
          {detail.projects.map((project) => (
            <li key={project.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium">{project.name}</p>
                <StatusBadge value={project.status} />
              </div>
              <ProgressBar value={project.progress} />
              <p className="text-xs text-muted-foreground">
                {project.dueDate ? `Due ${formatDate(project.dueDate, timeZone)}` : "No due date"}
              </p>
            </li>
          ))}
        </ul>
      </RelatedSection>

      <RelatedSection
        title="Tasks"
        description="Open and recent work items."
        emptyTitle="No tasks"
        emptyDescription="Tasks linked to this client or their projects will appear here."
        icon={<ListTodo className="size-4" />}
        isEmpty={detail.tasks.length === 0}
      >
        <ul className="divide-y">
          {detail.tasks.map((task) => (
            <li key={task.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <Link href={`/tasks/${task.id}`} className="truncate text-sm font-medium hover:underline">
                  {task.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{task.projectName ?? "No project"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge value={task.priority} />
                <StatusBadge value={task.status} />
              </div>
            </li>
          ))}
        </ul>
      </RelatedSection>

      <RelatedSection
        title="Bugs"
        description="Issues reported for this client."
        emptyTitle="No bugs"
        emptyDescription="Bug reports for this client or their projects will appear here."
        icon={<Bug className="size-4" />}
        isEmpty={detail.bugs.length === 0}
      >
        <ul className="divide-y">
          {detail.bugs.map((task) => (
            <li key={task.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <Link href={`/tasks/${task.id}`} className="truncate text-sm font-medium hover:underline">
                  {task.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{task.projectName ?? "No project"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge value={task.priority} />
                <StatusBadge value={task.status} />
              </div>
            </li>
          ))}
        </ul>
      </RelatedSection>

      <RelatedSection
        title="Invoices"
        description="Billed work for this client."
        emptyTitle="No invoices"
        emptyDescription="Create an invoice from the Invoices page."
        icon={<Receipt className="size-4" />}
        isEmpty={detail.invoices.length === 0}
      >
        <ul className="divide-y">
          {detail.invoices.map((invoice) => (
            <li key={invoice.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">
                  {invoice.dueDate ? `Due ${formatDate(invoice.dueDate, timeZone)}` : "No due date"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {invoice.status.replaceAll("_", " ")}
                </Badge>
                <span className="text-sm font-medium">{formatMoney(invoice.total, currency)}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="pt-3">
          <Link href={`/invoices?client=${detail.client.id}`} className="text-xs text-muted-foreground hover:underline">
            View all invoices
          </Link>
        </p>
      </RelatedSection>

      <RelatedSection
        title="Payments"
        description="Recorded payments from this client."
        emptyTitle="No payments"
        emptyDescription="Record a payment from the Payments page."
        icon={<Wallet className="size-4" />}
        isEmpty={detail.payments.length === 0}
      >
        <ul className="divide-y">
          {detail.payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{formatMoney(payment.amount, payment.currency)}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {payment.method.replaceAll("_", " ")} · {formatDate(payment.paymentDate, timeZone)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="pt-3">
          <Link href={`/payments?client=${detail.client.id}`} className="text-xs text-muted-foreground hover:underline">
            View all payments
          </Link>
        </p>
      </RelatedSection>

      <RelatedSection
        title="Files"
        description="Documents attached to this client."
        emptyTitle="No files"
        emptyDescription="Upload a private file for this client."
        icon={<Paperclip className="size-4" />}
        isEmpty={detail.files.length === 0}
        action={
          canManage ? (
            <FileUploadSheet
              workspaceId={detail.client.workspace_id}
              defaultClientId={detail.client.id}
              lockTargets
              trigger={<Button size="sm">Upload</Button>}
            />
          ) : null
        }
      >
        <FileAttachmentList files={detail.files} canManage={canManage} />
        <p className="pt-3">
          <Link href={`/files?client=${detail.client.id}`} className="text-xs text-muted-foreground hover:underline">
            View all files
          </Link>
        </p>
      </RelatedSection>

      <RelatedSection
        title="Notes"
        description="Private, team, and client-visible notes."
        emptyTitle="No notes"
        emptyDescription="Add a note for this client. Private notes stay internal."
        icon={<StickyNote className="size-4" />}
        isEmpty={detail.notes.length === 0}
        action={
          canCreateNote(role) ? (
            <NoteFormSheet
              defaultClientId={detail.client.id}
              lockTargets
              trigger={<Button size="sm">Add note</Button>}
            />
          ) : null
        }
      >
        <NoteRelatedList
          notes={detail.notes}
          timeZone={timeZone}
          role={role}
          userId={userId}
          defaultClientId={detail.client.id}
          lockTargets
        />
        <p className="pt-3">
          <Link href={`/notes?client=${detail.client.id}`} className="text-xs text-muted-foreground hover:underline">
            View all notes
          </Link>
        </p>
      </RelatedSection>

      <div className="lg:col-span-2">
        <RelatedSection
          title="Activity"
          description="Changes recorded for this client."
          emptyTitle="No activity yet"
          emptyDescription="Creates, edits, and status changes will appear in this timeline."
          icon={<Activity className="size-4" />}
          isEmpty={detail.activity.length === 0}
        >
          <ActivityTimeline items={detail.activity} timeZone={timeZone} />
        </RelatedSection>
      </div>
    </div>
  );
}
