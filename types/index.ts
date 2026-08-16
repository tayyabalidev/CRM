export const workspaceRoles = ["owner", "admin", "member", "client"] as const;
export const clientStatuses = ["active", "inactive", "archived"] as const;
export const projectStatuses = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export const priorities = ["low", "medium", "high", "urgent"] as const;
export const taskStatuses = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "completed",
] as const;
export const paymentMethods = [
  "cash",
  "bank_transfer",
  "paypal",
  "stripe",
  "wise",
  "other",
] as const;
export const invoiceStatuses = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
] as const;
export const noteVisibilities = ["private", "team", "client"] as const;

export type WorkspaceRole = (typeof workspaceRoles)[number];
export type ClientStatus = (typeof clientStatuses)[number];
export type ProjectStatus = (typeof projectStatuses)[number];
export type Priority = (typeof priorities)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type NoteVisibility = (typeof noteVisibilities)[number];

export const staffRoles: WorkspaceRole[] = ["owner", "admin", "member"];

export function isStaffRole(role: WorkspaceRole): boolean {
  return role !== "client";
}

export function canManageWorkspace(role: WorkspaceRole) {
  return role === "owner" || role === "admin";
}

export const staffInviteRoles = ["admin", "member"] as const;
export type StaffInviteRole = (typeof staffInviteRoles)[number];
