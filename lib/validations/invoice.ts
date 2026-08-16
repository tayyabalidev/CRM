import { z } from "zod";

import { isUuid } from "@/lib/utils/ids";

const optionalId = z
  .string()
  .trim()
  .refine((value) => value === "" || isUuid(value), "Choose a valid option");

const moneyValue = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
    "Enter a valid amount",
  );

const dateValue = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date");

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Enter a description").max(200),
  quantity: z
    .string()
    .trim()
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "Enter a quantity greater than 0"),
  unitPrice: z
    .string()
    .trim()
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "Enter a valid unit price"),
});

export const invoiceSchema = z
  .object({
    clientId: z.string().refine(isUuid, "Choose a client"),
    projectId: optionalId,
    issueDate: dateValue.refine((value) => value !== "", "Enter an issue date"),
    dueDate: dateValue,
    discount: moneyValue,
    tax: moneyValue,
    notes: z.string().trim().max(4000),
    items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
  })
  .superRefine((value, ctx) => {
    if (value.dueDate && value.issueDate && value.dueDate < value.issueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date must be on or after the issue date",
      });
    }
  });

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
