import { NextResponse, type NextRequest } from "next/server";

export function isStaleRefreshError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: string; message?: string };
  const code = record.code ?? "";
  const message = (record.message ?? "").toLowerCase();

  return (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "session_not_found" ||
    message.includes("refresh token")
  );
}

export function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

export function clearAuthCookies(request: NextRequest, response: NextResponse) {
  const names = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter(isSupabaseAuthCookie);

  for (const name of names) {
    request.cookies.delete(name);
    response.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    });
  }
}
