export const AUTH_PATHS = {
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  onboarding: "/onboarding",
  callback: "/auth/callback",
} as const;

export function isPublicAuthPath(pathname: string) {
  return (
    pathname === AUTH_PATHS.login ||
    pathname === AUTH_PATHS.signup ||
    pathname === AUTH_PATHS.forgotPassword ||
    pathname === AUTH_PATHS.resetPassword ||
    pathname.startsWith("/auth/")
  )
}

export function isAnonymousOnlyPath(pathname: string) {
  return (
    pathname === AUTH_PATHS.login ||
    pathname === AUTH_PATHS.signup ||
    pathname === AUTH_PATHS.forgotPassword
  )
}

export function isPortalJoinPath(path: string) {
  return path === "/portal/join" || path.startsWith("/portal/join?")
}

export function isTeamJoinPath(path: string) {
  return path === "/invite/join" || path.startsWith("/invite/join?")
}

export function isInviteJoinPath(path: string) {
  return isPortalJoinPath(path) || isTeamJoinPath(path)
}

export function isStaffOnlyPath(pathname: string) {
  return (
    pathname === "/clients" ||
    pathname.startsWith("/clients/") ||
    pathname === "/time" ||
    pathname.startsWith("/time/") ||
    pathname === "/reports" ||
    pathname.startsWith("/reports/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  )
}

export function safeNextPath(value: string | null | undefined) {
  return safeAppPath(value) ?? "/";
}

/** Relative in-app paths only. Rejects protocol-relative and absolute URLs. */
export function safeAppPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return null;
  }

  return value;
}
