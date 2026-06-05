import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { hasSupabaseBrowserEnv } from "@/lib/env";

export function createClient() {
  if (!hasSupabaseBrowserEnv()) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
