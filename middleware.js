import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Refreshes the Supabase auth session and — when NEXT_PUBLIC_ENABLE_AUTH=true —
// gates the main app behind authentication, redirecting unauthenticated visitors
// to /login.
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Gate the main app: redirect unauthenticated users to /login.
  // Only active when NEXT_PUBLIC_ENABLE_AUTH=true (set in Vercel env vars).
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");
  const authEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTH === "true";

  // /formador always requires auth (regardless of the feature flag).
  const isFormadorRoute = pathname.startsWith("/formador");

  if ((!user && !isAuthRoute) && (authEnabled || isFormadorRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

// Run on the main app, formador, and all auth routes.
export const config = {
  matcher: ["/", "/formador", "/formador/:path*", "/login", "/login/:path*", "/auth/:path*"],
};
