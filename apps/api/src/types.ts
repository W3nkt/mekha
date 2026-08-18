import type { User } from "@supabase/supabase-js";

export type ApiBindings = Cloudflare.Env & {
  SUPABASE_SERVICE_ROLE_KEY: string;
  QWEN_API_KEY: string;
  FB_APP_SECRET?: string;
  FB_VERIFY_TOKEN?: string;
};

export type ApiVariables = {
  requestId: string;
  user: User;
};

export type ApiEnv = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};
