import { z } from "zod";

import { isUuid } from "@/lib/utils/ids";
import { noteVisibilities } from "@/types/index";

const optionalId = z
  .string()
  .trim()
  .refine((value) => value === "" || isUuid(value), "Choose a valid option");

export const noteSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title").max(160),
    content: z.string().trim().max(20000),
    visibility: z.enum(noteVisibilities),
    clientId: optionalId,
    projectId: optionalId,
  })
  .superRefine((value, ctx) => {
    if (!value.clientId && !value.projectId) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a client or a project.",
        path: ["clientId"],
      });
    }
  });

export type NoteInput = z.infer<typeof noteSchema>;
