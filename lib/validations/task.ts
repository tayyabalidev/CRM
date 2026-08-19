import { z } from "zod";

import { isUuid } from "@/lib/utils/ids";
import { priorities, taskKinds, taskStatuses } from "@/types/index";

const optionalId = z
  .string()
  .trim()
  .refine((value) => value === "" || isUuid(value), "Choose a valid option");

export const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title").max(160),
    description: z.string().trim().max(8000),
    kind: z.enum(taskKinds),
    projectId: optionalId,
    assigneeId: optionalId,
    dueDate: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value),
        "Enter a valid due date",
      ),
    priority: z.enum(priorities),
    status: z.enum(taskStatuses),
    estimatedHours: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
        "Enter estimated hours as a number",
      ),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "bug" && !data.projectId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["projectId"],
        message: "Choose a project for this bug",
      });
    }
  });

export const taskCommentSchema = z.object({
  content: z.string().trim().min(1, "Write a comment").max(4000),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskCommentInput = z.infer<typeof taskCommentSchema>;
