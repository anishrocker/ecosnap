import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Completes the magic-link / OAuth PKCE flow: exchanges `?code=` for a session and sets auth cookies.
 */
export async function GET(request: Request) {
  type CookieToSet = {
    name: string;
    value: string;
    options?: CookieOptions;
  };

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("missing_code")}`, request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            /* Server Component context — ignored when middleware refreshes session */
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(safeNext, request.url));
}
