import type { User } from "@supabase/supabase-js";

export type ApiBindings = Cloudflare.Env & {
  SUPABASE_SERVICE_ROLE_KEY: string;
  QWEN_API_KEY: string;
};

export type ApiVariables = {
  requestId: string;
  user: User;
};

export type ApiEnv = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};
