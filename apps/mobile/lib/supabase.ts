import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string; supabasePublishableKey?: string }
  | undefined;

const url = extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const publishableKey =
  extra?.supabasePublishableKey ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  extra?.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
