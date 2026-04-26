import { createClient } from "@supabase/supabase-js";
import { mustGetEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  return createClient(
    mustGetEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

