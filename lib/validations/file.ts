import { z } from "zod";

import { isUuid } from "@/lib/utils/ids";

const optionalId = z
  .string()
  .trim()
  .refine((value) => value === "" || isUuid(value), "Choose a valid option");

export const fileRecordSchema = z.object({
  id: z.string().refine(isUuid, "File id is invalid"),
  fileName: z.string().trim().min(1, "Enter a file name").max(180),
  filePath: z.string().trim().min(1).max(400),
  fileSize: z.number().int().positive(),
  mimeType: z.string().trim().max(160),
  clientId: optionalId,
  projectId: optionalId,
  taskId: optionalId,
  invoiceId: optionalId,
});

export type FileRecordInput = z.infer<typeof fileRecordSchema>;
