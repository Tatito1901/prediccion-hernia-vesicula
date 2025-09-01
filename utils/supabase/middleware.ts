 import { createServerClient } from "@supabase/ssr";
 import { type NextRequest, NextResponse } from "next/server";

 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DEBUG_AUTH = [process.env.DEBUG_AUTH, process.env.NEXT_PUBLIC_DEBUG_AUTH]
  .some((v) => typeof v === "string" && ["1", "true", "on", "yes"].includes(v.toLowerCase()));

export const createMiddlewareClient = (request: NextRequest) => {
  // Base response (clone headers to preserve request context)
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  if (!supabaseUrl || !supabaseKey) {
    if (DEBUG_AUTH) {
      console.error("[auth] Missing Supabase envs in middleware", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
    }
    // Fail fast in development to surface misconfiguration
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or ANON/PUBLISHABLE key for middleware client");
  }

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          const all = request.cookies.getAll();
          if (DEBUG_AUTH) console.debug("[auth] middleware.getAll cookies", { count: all.length });
          return all;
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          // Update both the incoming request (for Server Components) and the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) => {
            try { request.cookies.set(name, value) } catch {}
            supabaseResponse.cookies.set(name, value, options);
          });
          if (DEBUG_AUTH) console.debug("[auth] middleware.setAll cookies", { names: cookiesToSet.map(c => c.name) });
        },
      },
    },
  );

  return { supabase, response: supabaseResponse } as const;
};
