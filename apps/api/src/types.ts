import type { User } from "@supabase/supabase-js";

export type ApiBindings = Cloudflare.Env & {
  SUPABASE_SERVICE_ROLE_KEY: string;
  QWEN_API_KEY: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_VERIFY_TOKEN?: string;
  META_TOKEN_ENCRYPTION_KEY?: string;
  META_REDIRECT_URI?: string;
};

export type ApiVariables = {
  requestId: string;
  user: User;
};

export type ApiEnv = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};
