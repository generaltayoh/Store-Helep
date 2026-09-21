import { createClient } from "@supabase/supabase-js";
import { config } from "./index.js";

let supabaseClient = null;

export function isSupabaseConfigured() {
  return Boolean(
    config.supabase.url &&
    (config.supabase.serviceRoleKey || config.supabase.anonKey)
  );
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
    supabaseClient = createClient(config.supabase.url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

export const supabase = getSupabaseClient();
