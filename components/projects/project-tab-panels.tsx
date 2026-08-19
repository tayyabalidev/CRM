import Link from "next/link";
import {
  Activity,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  ListTodo,
  Paperclip,
  Receipt,
  StickyNote,
  Images,
  Bug,
  Wallet,
} from "lucide-react";

import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { RelatedSection } from "@/components/clients/related-section";
import { FileAttachmentList } from "@/components/files/file-attachment-list";
import { FileUploadSheet } from "@/components/files/file-upload-sheet";
import { NoteFormSheet } from "@/components/notes/note-form-sheet";
import { NoteRelatedList } from "@/components/notes/note-related-list";
import { ScreenshotNotesPanel } from "@/components/screenshots/screenshot-notes-panel";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/status-badge";
import type { ProjectTab } from "@/components/projects/project-tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canCreateNote } from "@/lib/notes/access";
import type { ProjectDetail } from "@/lib/services/projects";
import { formatDate } from "@/lib/utils/dates";
import { formatDuration } from "@/lib/utils/duration";
import { formatMoney } from "@/lib/utils/money";
import type { WorkspaceRole } from "@/types/index";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProjectTabPanels({
  detail,
  tab,
  timeZone,
  canManage,
  role,
  userId,
}: {
  detail: ProjectDetail;
  tab: ProjectTab;
  timeZone: string;
  canManage: boolean;
  role: WorkspaceRole;
  userId: string;
}) {
  const { project } = detail;
  const budget = project.budget == null ? null : Number(project.budget);

  if (tab === "overview") {
    return (
      <div className="grid gap-3">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Progress</CardDescription>
              <CardTitle className="text-2xl">{detail.progress}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ProgressBar value={detail.progress} />
              <p className="text-xs text-muted-foreground">
                {detail.progressSource === "manual"
                  ? "Set manually"
                  : `${detail.taskCompleted} of ${detail.taskTotal} tasks complete`}
              </p>
            </CardContent>
          </Card>
          {canManage ? (
            <Card size="sm">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardDescription>Budget</CardDescription>
                  <CardTitle className="text-2xl">
                    {budget == null ? "—" : formatMoney(budget, project.currency)}
                  </CardTitle>
                </div>
                <CircleDollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
          ) : null}
          <Card size="sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardDescription>Paid</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(detail.paid, project.currency)}</CardTitle>
              </div>
              <Wallet className="size-4 text-muted-foreground" />
            </CardHeader>
          </Card>
          {canManage ? (
            <Card size="sm">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardDescription>Remaining</CardDescription>
                  <CardTitle className="text-2xl">
                    {detail.remaining == null ? "—" : formatMoney(detail.remaining, project.currency)}
                  </CardTitle>
                </div>
                <Clock3 className="size-4 text-muted-foreground" />
              </CardHeader>
            </Card>
          ) : null}
        </section>

        <section className="grid gap-3 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Project information</CardTitle>
              <CardDescription>Client, dates, and scope.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                {canManage ? (
                  <Link href={`/clients/${project.client_id}`} className="text-sm font-medium hover:underline">
                    {detail.clientName}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{detail.clientName}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="text-sm">
                  {project.due_date ? formatDate(project.due_date, timeZone) : "No due date"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Start date</p>
                <p className="text-sm">
                  {project.start_date ? formatDate(project.start_date, timeZone) : "—"}
                </p>
              </div>
              {canManage ? (
                <div>
                  <p className="text-xs text-muted-foreground">Tracked time</p>
                  <p className="text-sm">{formatDuration(detail.trackedSeconds)}</p>
                </div>
              ) : null}
              {project.description ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap text-sm">{project.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
          {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
              <CardDescription>Workspace members. Assigned people are marked.</CardDescription>
            </CardHeader>
            <CardContent>
              {detail.team.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members yet.</p>
              ) : (
                <ul className="space-y-3">
                  {detail.team.map((member) => (
                    <li key={member.id} className="flex items-center gap-3">
                      <Avatar size="sm">
                        {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                        <AvatarFallback>{initials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                      {member.assigned ? <Badge variant="secondary">Assigned</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          ) : null}
        </section>

        <RelatedSection
          title="Recent activity"
          description="Changes recorded for this project."
          emptyTitle="No activity yet"
          emptyDescription="Creates, edits, and status changes will appear here."
          icon={<Activity className="size-4" />}
          isEmpty={detail.activity.length === 0}
        >
          <ActivityTimeline items={detail.activity} timeZone={timeZone} hideStaffLinks={!canManage} />
        </RelatedSection>
      </div>
    );
  }

  if (tab === "tasks") {
    return (
      <RelatedSection
        title="Tasks"
        description="Work items on this project."
        emptyTitle="No tasks"
        emptyDescription="Add a task from the Tasks page to start tracking work here."
        icon={<ListTodo className="size-4" />}
        isEmpty={detail.tasks.length === 0}
      >
        <ul className="divide-y">
          {detail.tasks.map((task) => (
            <li key={task.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                {task.title}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge value={task.priority} />
                <StatusBadge value={task.status} />
              </div>
            </li>
          ))}
        </ul>
        <div className="pt-3">
          <Link
            href={`/tasks?project=${detail.project.id}`}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            View all tasks
          </Link>
        </div>
      </RelatedSection>
    );
  }

  if (tab === "bugs") {
    return (
      <RelatedSection
        title="Bugs"
        description="Issues reported by clients or staff."
        emptyTitle="No bugs"
        emptyDescription="Reported bugs for this project will appear here."
        icon={<Bug className="size-4" />}
        isEmpty={detail.bugs.length === 0}
      >
        <ul className="divide-y">
          {detail.bugs.map((task) => (
            <li key={task.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                {task.title}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge value={task.priority} />
                <StatusBadge value={task.status} />
              </div>
            </li>
          ))}
        </ul>
        <div className="pt-3">
          <Link
            href={`/bugs?project=${detail.project.id}`}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            View all bugs
          </Link>
        </div>
      </RelatedSection>
    );
  }

  if (tab === "time") {
    return (
      <RelatedSection
        title="Time"
        description="Tracked work on this project."
        emptyTitle="No time tracked"
        emptyDescription="Time entries will appear here after you start the timer."
        icon={<CalendarClock className="size-4" />}
        isEmpty={detail.timeEntries.length === 0}
      >
        <ul className="divide-y">
          {detail.timeEntries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{entry.description || "Time entry"}</p>
                <p className="text-xs text-muted-foreground">{formatDate(entry.startedAt, timeZone)}</p>
              </div>
              <div className="flex items-center gap-2">
                {entry.billable ? <Badge variant="outline">Billable</Badge> : null}
                <span className="text-sm font-medium">{entry.durationLabel}</span>
              </div>
            </li>
          ))}
        </ul>
      </RelatedSection>
    );
  }

  if (tab === "payments") {
    return (
      <RelatedSection
        title="Payments"
        description="Money recorded against this project."
        emptyTitle="No payments"
        emptyDescription="Record a payment from the Payments page."
        icon={<Wallet className="size-4" />}
        isEmpty={detail.payments.length === 0}
      >
        <ul className="divide-y">
          {detail.payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-medium">{formatMoney(payment.amount, payment.currency)}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {payment.method.replaceAll("_", " ")} · {formatDate(payment.paymentDate, timeZone)}
              </p>
            </li>
          ))}
        </ul>
        <p className="pt-3">
          <Link href={`/payments?project=${project.id}`} className="text-xs text-muted-foreground hover:underline">
            View all payments
          </Link>
        </p>
      </RelatedSection>
    );
  }

  if (tab === "invoices") {
    return (
      <RelatedSection
        title="Invoices"
        description="Invoices billed on this project."
        emptyTitle="No invoices"
        emptyDescription="Create an invoice from the Invoices page."
        icon={<Receipt className="size-4" />}
        isEmpty={detail.invoices.length === 0}
      >
        <ul className="divide-y">
          {detail.invoices.map((invoice) => (
            <li key={invoice.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">
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
                <span className="text-sm font-medium">{formatMoney(invoice.total, project.currency)}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="pt-3">
          <Link href={`/invoices?project=${project.id}`} className="text-xs text-muted-foreground hover:underline">
            View all invoices
          </Link>
        </p>
      </RelatedSection>
    );
  }

  if (tab === "files") {
    return (
      <RelatedSection
        title="Files"
        description="Documents attached to this project."
        emptyTitle="No files"
        emptyDescription="Upload a private file for this project."
        icon={<Paperclip className="size-4" />}
        isEmpty={detail.files.length === 0}
        action={
          canManage ? (
            <FileUploadSheet
              workspaceId={project.workspace_id}
              defaultClientId={project.client_id}
              defaultProjectId={project.id}
              lockTargets
              trigger={<Button size="sm">Upload</Button>}
            />
          ) : null
        }
      >
        <FileAttachmentList files={detail.files} canManage={canManage} />
        <p className="pt-3">
          <Link href={`/files?project=${project.id}`} className="text-xs text-muted-foreground hover:underline">
            View all files
          </Link>
        </p>
      </RelatedSection>
    );
  }

  if (tab === "screenshots") {
    return (
      <RelatedSection
        title="Screenshots"
        description="A list of notes with screenshots attached — add one picture and a short message at a time."
        emptyTitle="No screenshots"
        emptyDescription="Add a short note and attach a screenshot of the issue or change."
        icon={<Images className="size-4" />}
        isEmpty={false}
      >
        <ScreenshotNotesPanel
          workspaceId={project.workspace_id}
          userId={userId}
          timeZone={timeZone}
          items={detail.screenshotNotes}
          clientId={project.client_id}
          projectId={project.id}
          canManage={canManage}
        />
      </RelatedSection>
    );
  }

  if (tab === "notes") {
    return (
      <RelatedSection
        title="Notes"
        description="Private, team, and client-visible notes on this project."
        emptyTitle="No notes"
        emptyDescription="Add a note for this project. Private notes stay internal."
        icon={<StickyNote className="size-4" />}
        isEmpty={detail.notes.length === 0}
        action={
          canCreateNote(role) ? (
            <NoteFormSheet
              defaultClientId={project.client_id}
              defaultProjectId={project.id}
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
          defaultClientId={project.client_id}
          defaultProjectId={project.id}
          lockTargets
        />
        <p className="pt-3">
          <Link href={`/notes?project=${project.id}`} className="text-xs text-muted-foreground hover:underline">
            View all notes
          </Link>
        </p>
      </RelatedSection>
    );
  }

  return (
    <RelatedSection
      title="Activity"
      description="Changes recorded for this project."
      emptyTitle="No activity yet"
      emptyDescription="Creates, edits, and status changes will appear here."
      icon={<Activity className="size-4" />}
      isEmpty={detail.activity.length === 0}
    >
      <ActivityTimeline items={detail.activity} timeZone={timeZone} hideStaffLinks={!canManage} />
    </RelatedSection>
  );
}
