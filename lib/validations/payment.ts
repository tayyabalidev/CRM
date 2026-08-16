import { z } from "zod";

import { isUuid } from "@/lib/utils/ids";
import { paymentMethods } from "@/types/index";

const optionalId = z
  .string()
  .trim()
  .refine((value) => value === "" || isUuid(value), "Choose a valid option");

export const paymentSchema = z.object({
  clientId: z.string().refine(isUuid, "Choose a client"),
  projectId: optionalId,
  invoiceId: optionalId,
  amount: z
    .string()
    .trim()
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "Enter an amount greater than 0"),
  currency: z
    .string()
    .trim()
    .refine((value) => /^[A-Za-z]{3}$/.test(value), "Use a 3-letter currency code"),
  paymentMethod: z.enum(paymentMethods),
  paymentDate: z
    .string()
    .trim()
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a payment date"),
  reference: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
