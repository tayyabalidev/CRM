import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_PATHS, isAnonymousOnlyPath, isPublicAuthPath, safeNextPath } from "@/lib/auth/paths";
import { getPublicEnv } from "@/lib/env";
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
          request.cookies.set(name, value);
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

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated && !isPublicAuthPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = AUTH_PATHS.login;
    loginUrl.search = "";
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", safeNextPath(`${pathname}${request.nextUrl.search}`));
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isAnonymousOnlyPath(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/";
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  return response;
}
