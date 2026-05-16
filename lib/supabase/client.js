import { createBrowserClient } from "@supabase/ssr";

// Browser client — safe to use in "use client" components and hooks.
// The anon key is public by design; security lives in RLS policies on the DB.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Feature flag: login is dark-launched until NEXT_PUBLIC_ENABLE_AUTH=true in Vercel.
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AUTH === "true";
