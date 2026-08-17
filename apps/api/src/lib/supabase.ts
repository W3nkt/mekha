import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mekha/types";

import type { ApiBindings } from "../types";

export const createSupabaseClient = (env: ApiBindings) =>
  createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
