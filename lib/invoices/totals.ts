import { zonedDateKey } from "@/lib/utils/dates";
import { toNumber } from "@/lib/utils/money";
import type { InvoiceStatus } from "@/types/index";

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineTotal(quantity: number, unitPrice: number) {
  return roundMoney(Math.max(0, quantity) * Math.max(0, unitPrice));
}

export function invoiceTotals(input: {
  items: { quantity: number; unitPrice: number }[];
  discount: number;
  tax: number;
}) {
  const subtotal = roundMoney(input.items.reduce((sum, item) => sum + lineTotal(item.quantity, item.unitPrice), 0));
  const discount = roundMoney(Math.max(0, input.discount));
  const tax = roundMoney(Math.max(0, input.tax));
  const total = roundMoney(Math.max(0, subtotal - discount + tax));

  return { subtotal, discount, tax, total };
}

export function remainingBalance(total: number, amountPaid: number) {
  return roundMoney(Math.max(0, total - amountPaid));
}

export function formatInvoiceMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function displayInvoiceStatus(
  invoice: { status: InvoiceStatus; due_date?: string | null; dueDate?: string | null; total: number | string; amount_paid?: number | string; amountPaid?: number | string },
  timeZone: string,
  now = new Date(),
): InvoiceStatus {
  if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "draft") {
    return invoice.status;
  }

  const total = toNumber(invoice.total);
  const paid = toNumber(invoice.amountPaid ?? invoice.amount_paid);
  const remaining = remainingBalance(total, paid);
  const dueDate = invoice.dueDate ?? invoice.due_date ?? null;
  const today = zonedDateKey(now, timeZone);

  if (remaining <= 0) {
    return "paid";
  }

  if (dueDate && dueDate < today) {
    return "overdue";
  }

  return invoice.status;
}
