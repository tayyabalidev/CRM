import { isStaffRole, type WorkspaceRole } from "@/types/index";

export function canCreateNote(role: WorkspaceRole) {
  return isStaffRole(role);
}

export function canEditNote(role: WorkspaceRole, userId: string, createdBy: string | null) {
  if (!isStaffRole(role)) {
    return false;
  }

  if (createdBy === userId) {
    return true;
  }

  return role === "owner" || role === "admin";
}
