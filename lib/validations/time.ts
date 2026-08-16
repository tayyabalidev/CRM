import { z } from "zod";

import { isUuid } from "@/lib/utils/ids";

const optionalId = z
  .string()
  .trim()
  .refine((value) => value === "" || isUuid(value), "Choose a valid option");

const dateTimeValue = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value), "Enter a valid date and time");

const rateValue = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
    "Enter a valid hourly rate",
  );

export const startTimerSchema = z.object({
  projectId: z.string().refine(isUuid, "Choose a project"),
  taskId: optionalId,
  description: z.string().trim().max(500),
  billable: z.boolean(),
  hourlyRate: rateValue,
});

export const timeEntrySchema = z
  .object({
    projectId: z.string().refine(isUuid, "Choose a project"),
    taskId: optionalId,
    description: z.string().trim().max(500),
    startedAt: dateTimeValue.refine((value) => value !== "", "Enter a start time"),
    endedAt: dateTimeValue.refine((value) => value !== "", "Enter an end time"),
    billable: z.boolean(),
    hourlyRate: rateValue,
  })
  .superRefine((value, ctx) => {
    if (value.startedAt && value.endedAt && value.endedAt < value.startedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "End time must be after the start time",
      });
    }
  });

export type StartTimerInput = z.infer<typeof startTimerSchema>;
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
