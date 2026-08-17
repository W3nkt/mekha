import type { User } from "@supabase/supabase-js";

import { createSupabaseClient } from "./supabase";
import type { ApiBindings } from "../types";

export const getUserForToken = async (
  env: ApiBindings,
  token: string,
): Promise<User | null> => {
  const supabase = createSupabaseClient(env);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return error ? null : user;
};
