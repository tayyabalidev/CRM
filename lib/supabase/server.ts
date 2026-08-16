import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requirePublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createClient() {
  // Opt into dynamic rendering before env validation so missing build-time
  // secrets do not get misclassified as a static-export failure.
  const cookieStore = await cookies();
  const env = requirePublicEnv();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component. The proxy refreshes sessions instead.
        }
      },
    },
  });
}
