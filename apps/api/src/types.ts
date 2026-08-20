import type { User } from "@supabase/supabase-js";

export type ApiBindings = Cloudflare.Env & {
  SUPABASE_SERVICE_ROLE_KEY: string;
  QWEN_API_KEY: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
};

export type ApiVariables = {
  requestId: string;
  user: User;
};

export type ApiEnv = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};
