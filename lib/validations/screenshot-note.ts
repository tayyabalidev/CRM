import { z } from "zod";

import { isUuid } from "@/lib/utils/ids";

const optionalId = z
  .string()
  .trim()
  .refine((value) => value === "" || isUuid(value), "Choose a valid option");

export const screenshotNoteSchema = z
  .object({
    message: z.string().trim().min(1, "Add a short note for this screenshot.").max(2000),
    fileId: z.string().refine(isUuid, "File id is invalid"),
    fileName: z.string().trim().min(1).max(180),
    filePath: z.string().trim().min(1).max(400),
    fileSize: z.number().int().positive(),
    mimeType: z.string().trim().min(1).max(160),
    clientId: optionalId,
    projectId: optionalId,
    taskId: optionalId,
  })
  .superRefine((value, ctx) => {
    if (!value.projectId && !value.taskId) {
      ctx.addIssue({
        code: "custom",
        message: "Attach this screenshot to a project or task.",
        path: ["projectId"],
      });
    }
  });

export type ScreenshotNoteInput = z.infer<typeof screenshotNoteSchema>;
