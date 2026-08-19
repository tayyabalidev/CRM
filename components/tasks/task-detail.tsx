import Link from "next/link";
import { Activity, Paperclip } from "lucide-react";

import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { RelatedSection } from "@/components/clients/related-section";
import { FileAttachmentList } from "@/components/files/file-attachment-list";
import { FileUploadSheet } from "@/components/files/file-upload-sheet";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { ScreenshotNotesPanel } from "@/components/screenshots/screenshot-notes-panel";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskFormSheet, type TaskFormAssignee, type TaskFormProject } from "@/components/tasks/task-form-sheet";
import { TaskRowActions } from "@/components/tasks/task-row-actions";
import { StartTimerButton } from "@/components/time/start-timer-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskDetail } from "@/lib/services/tasks";
import { formatDate, formatTime } from "@/lib/utils/dates";
import { formatDuration, formatMinutes } from "@/lib/utils/duration";

export function TaskDetailView({
  detail,
  timeZone,
  canManage,
  projects,
  assignees,
  userId,
}: {
  detail: TaskDetail;
  timeZone: string;
  canManage: boolean;
  projects: TaskFormProject[];
  assignees: TaskFormAssignee[];
  userId: string;
}) {
  const { task } = detail;
  const formTask = {
    id: task.id,
    title: task.title,
    description: task.description,
    projectId: task.project_id,
    assigneeId: task.assigned_to,
    dueDate: task.due_date,
    priority: task.priority,
    status: task.status,
    estimatedMinutes: task.estimated_minutes,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
            <StatusBadge value={task.status} />
            <PriorityBadge value={task.priority} />
          </div>
          <p className="text-sm text-muted-foreground">
            {detail.projectName ? (
              <Link href={`/projects/${task.project_id}`} className="hover:underline">
                {detail.projectName}
              </Link>
            ) : (
              "No project"
            )}
            {detail.clientName ? ` · ${detail.clientName}` : ""}
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <StartTimerButton projectId={task.project_id} taskId={task.id} />
            <TaskFormSheet
              task={formTask}
              projects={projects}
              assignees={assignees}
              trigger={<Button variant="outline">Edit</Button>}
            />
            <TaskRowActions task={formTask} projects={projects} assignees={assignees} />
          </div>
        ) : null}
      </div>

      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Description, dates, and estimates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Assignee</p>
              <p className="text-sm">{canManage ? (detail.assigneeName ?? "Unassigned") : "Assigned to the team"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due</p>
              <p className="text-sm">
                {task.due_date
                  ? `${formatDate(task.due_date, timeZone)} ${formatTime(task.due_date, timeZone)}`
                  : "No due date"}
              </p>
            </div>
            {canManage ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Estimated time</p>
                  <p className="text-sm">{formatMinutes(task.estimated_minutes)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tracked time</p>
                  <p className="text-sm">{formatDuration(detail.trackedSeconds)}</p>
                </div>
              </>
            ) : null}
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap text-sm">
                {task.description || "No description yet."}
              </p>
            </div>
          </CardContent>
        </Card>

        {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Time</CardTitle>
            <CardDescription>Estimate vs actual tracked time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated</span>
              <span className="font-medium">{formatMinutes(task.estimated_minutes)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tracked</span>
              <span className="font-medium">{formatDuration(detail.trackedSeconds)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {task.project_id
                ? "Start the timer from this task or the header to record actual time."
                : "Link this task to a project to start the timer."}
            </p>
          </CardContent>
        </Card>
        ) : null}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Screenshots</CardTitle>
          <CardDescription>A list of notes with screenshots attached — add one picture and a short message at a time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScreenshotNotesPanel
            workspaceId={task.workspace_id}
            userId={userId}
            timeZone={timeZone}
            items={detail.screenshotNotes}
            clientId={task.client_id}
            projectId={task.project_id}
            taskId={task.id}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
          <CardDescription>Discussion on this task.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskComments
            taskId={task.id}
            comments={detail.comments}
            timeZone={timeZone}
            canComment
          />
        </CardContent>
      </Card>

      <section className="grid gap-3 lg:grid-cols-2">
        <RelatedSection
          title="Files"
          description="Attachments on this task."
          emptyTitle="No files"
          emptyDescription="Upload a private file for this task."
          icon={<Paperclip className="size-4" />}
          isEmpty={detail.files.length === 0}
          action={
            canManage ? (
              <FileUploadSheet
                workspaceId={task.workspace_id}
                defaultClientId={task.client_id ?? undefined}
                defaultProjectId={task.project_id ?? undefined}
                defaultTaskId={task.id}
                lockTargets
                trigger={<Button size="sm">Upload</Button>}
              />
            ) : null
          }
        >
          <FileAttachmentList files={detail.files} canManage={canManage} />
          <p className="pt-3">
            <Link href={`/files?task=${task.id}`} className="text-xs text-muted-foreground hover:underline">
              View all files
            </Link>
          </p>
        </RelatedSection>

        <RelatedSection
          title="Activity"
          description="Important changes on this task."
          emptyTitle="No activity yet"
          emptyDescription="Creates, edits, comments, and status changes will appear here."
          icon={<Activity className="size-4" />}
          isEmpty={detail.activity.length === 0}
        >
          <ActivityTimeline items={detail.activity} timeZone={timeZone} hideStaffLinks={!canManage} />
        </RelatedSection>
      </section>
    </div>
  );
}
