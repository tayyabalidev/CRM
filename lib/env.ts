import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function getPublicEnv(): PublicEnv | null {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  return parsed.success ? parsed.data : null;
}

export function requirePublicEnv(): PublicEnv {
  const env = getPublicEnv();

  if (!env) {
    throw new Error(
      "Missing Supabase environment variables. Copy .env.local.example to .env.local and add your project URL and anon key.",
    );
  }

  return env;
}

export function isSupabaseConfigured(): boolean {
  return getPublicEnv() !== null;
}
