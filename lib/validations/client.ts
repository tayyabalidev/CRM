import { z } from "zod";

import { clientStatuses } from "@/types/index";

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Enter a client name").max(120),
  company: z.string().trim().max(120),
  email: z
    .string()
    .trim()
    .max(160)
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email"),
  phone: z.string().trim().max(40),
  website: z.string().trim().max(200),
  address: z.string().trim().max(500),
  country: z.string().trim().max(80),
  notes: z.string().trim().max(2000),
  status: z.enum(clientStatuses),
});

export type ClientInput = z.infer<typeof clientSchema>;
