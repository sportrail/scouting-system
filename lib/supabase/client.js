import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True only when both env vars are present. When false the app runs in
// localStorage-only mode instead of crashing on a missing Supabase config.
export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Browser client — safe to use in "use client" components and hooks.
// The anon key is public by design; security lives in RLS policies on the DB.
// Returns null when Supabase isn't configured so callers can degrade
// gracefully rather than throwing an opaque @supabase/ssr error.
export function createClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Feature flag: login is dark-launched until NEXT_PUBLIC_ENABLE_AUTH=true in Vercel.
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AUTH === "true";
