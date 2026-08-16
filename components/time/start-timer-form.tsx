"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FieldError } from "@/components/auth/field-error";
import { useTimer } from "@/components/time/timer-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { listProjectOptionsAction, listTaskOptionsAction } from "@/lib/actions/time";
import { startTimerSchema, type StartTimerInput } from "@/lib/validations/time";

type ProjectOption = { id: string; name: string };
type TaskOption = { id: string; title: string };

export function StartTimerForm({
  defaultProjectId = "",
  defaultTaskId = "",
  onStarted,
}: {
  defaultProjectId?: string;
  defaultTaskId?: string;
  onStarted?: () => void;
}) {
  const { start } = useTimer();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [taskState, setTaskState] = useState<{ projectId: string; tasks: TaskOption[] }>({
    projectId: "",
    tasks: [],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const tasks = taskState.projectId === projectId ? taskState.tasks : [];
  const form = useForm<StartTimerInput>({
    resolver: zodResolver(startTimerSchema),
    defaultValues: {
      projectId: defaultProjectId,
      taskId: defaultTaskId,
      description: "",
      billable: true,
      hourlyRate: "",
    },
  });

  useEffect(() => {
    let active = true;

    listProjectOptionsAction().then((rows) => {
      if (active) {
        setProjects(rows.map((row) => ({ id: row.id, name: row.name })));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let active = true;

    listTaskOptionsAction(projectId, defaultTaskId || undefined).then((rows) => {
      if (active) {
        setTaskState({
          projectId,
          tasks: rows.map((row) => ({ id: row.id, title: row.title })),
        });
      }
    });

    return () => {
      active = false;
    };
  }, [defaultTaskId, projectId]);

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        setFormError(null);
        setPending(true);
        const error = await start(values);
        setPending(false);

        if (error) {
          setFormError(error);
          return;
        }

        onStarted?.();
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="timer-project">Project</Label>
        <Select
          id="timer-project"
          {...form.register("projectId", {
            onChange: (event) => {
              setProjectId(event.target.value);
              form.setValue("taskId", "");
            },
          })}
        >
          <option value="">Choose a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <FieldError message={form.formState.errors.projectId?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="timer-task">Task</Label>
        <Select id="timer-task" disabled={!projectId} {...form.register("taskId")}>
          <option value="">No task</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </Select>
        <FieldError message={form.formState.errors.taskId?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="timer-description">Description</Label>
        <Input id="timer-description" placeholder="What are you working on?" {...form.register("description")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="timer-rate">Hourly rate</Label>
        <Input id="timer-rate" inputMode="decimal" placeholder="Optional" {...form.register("hourlyRate")} />
        <FieldError message={form.formState.errors.hourlyRate?.message} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 rounded border" {...form.register("billable")} />
        Billable
      </label>
      {formError ? <FieldError message={formError} /> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Starting..." : "Start timer"}
      </Button>
    </form>
  );
}
