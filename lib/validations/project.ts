import { z } from "zod";

import { isUuid } from "@/lib/utils/ids";
import { priorities, projectStatuses } from "@/types/index";

const dateValue = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date");

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a project name").max(120),
    clientId: z.string().refine(isUuid, "Choose a client"),
    description: z.string().trim().max(4000),
    budget: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
        "Enter a valid budget",
      ),
    currency: z.string().length(3, "Choose a currency"),
    startDate: dateValue,
    dueDate: dateValue,
    priority: z.enum(priorities),
    status: z.enum(projectStatuses),
    manualProgress: z.boolean(),
    progress: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.dueDate && value.dueDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date must be on or after the start date",
      });
    }

    if (value.manualProgress) {
      const progress = Number(value.progress);
      if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["progress"],
          message: "Enter progress from 0 to 100",
        });
      }
    }
  });

export type ProjectInput = z.infer<typeof projectSchema>;
