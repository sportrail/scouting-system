import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

// Handles the magic link redirect from Supabase.
// URL shape: /auth/callback?code=XXXX&course=SCOUT2026-A
//
// 1. Exchange the one-time code for a session (sets auth cookies).
// 2. If a course code was passed, we stash it for Parte 2 (enrollment).
//    For now, we just redirect to a confirmation page.
// 3. Redirect the user to /login/success (no access to main app yet — dark launch).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const courseCode = searchParams.get("course");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Supabase returns ?error=... if the magic link failed (expired, already used, etc.)
  if (errorParam) {
    const msg = encodeURIComponent(errorDescription || errorParam);
    return NextResponse.redirect(`${origin}/login?err=${msg}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?err=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback exchange error:", error);
    const msg = encodeURIComponent(error.message || "Erro ao processar link");
    return NextResponse.redirect(`${origin}/login?err=${msg}`);
  }

  // Success — redirect to a welcome/pending page. Course enrollment happens in Parte 2.
  const successUrl = new URL(`${origin}/login/success`);
  if (courseCode) successUrl.searchParams.set("course", courseCode);
  return NextResponse.redirect(successUrl);
}
