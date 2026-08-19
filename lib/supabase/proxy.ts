import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_PATHS, isAnonymousOnlyPath, isPublicAuthPath, safeNextPath } from "@/lib/auth/paths";
import { getPublicEnv } from "@/lib/env";
import { clearAuthCookies, isStaleRefreshError } from "@/lib/supabase/stale-session";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  const env = getPublicEnv();

  if (!env) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      return new NextResponse("Application misconfigured: missing Supabase environment variables.", {
        status: 503,
      });
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          if (value) {
            request.cookies.set(name, value);
          } else {
            request.cookies.delete(name);
          }
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  let isAuthenticated = false;

  try {
    const { data, error } = await supabase.auth.getClaims();

    if (error && isStaleRefreshError(error)) {
      await supabase.auth.signOut({ scope: "local" });
      response = NextResponse.next({ request });
      clearAuthCookies(request, response);
    } else {
      isAuthenticated = Boolean(data?.claims?.sub);
    }
  } catch (error) {
    if (isStaleRefreshError(error)) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Local sign-out can fail when the refresh token is already invalid.
      }
      response = NextResponse.next({ request });
      clearAuthCookies(request, response);
    }
  }

  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated && !isPublicAuthPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = AUTH_PATHS.login;
    loginUrl.search = "";
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", safeNextPath(`${pathname}${request.nextUrl.search}`));
    }
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(response, redirectResponse);
    clearAuthCookies(request, redirectResponse);
    return redirectResponse;
  }

  if (isAuthenticated && isAnonymousOnlyPath(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/";
    destination.search = "";
    const redirectResponse = NextResponse.redirect(destination);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}
