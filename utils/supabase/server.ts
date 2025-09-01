import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DEBUG_AUTH = [process.env.DEBUG_AUTH, process.env.NEXT_PUBLIC_DEBUG_AUTH]
  .some((v) => typeof v === "string" && ["1", "true", "on", "yes"].includes(v.toLowerCase()));

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export const createClient = async (
  cookieStoreParam?: CookieStore | Promise<CookieStore>
) => {
  const cookieStore: CookieStore = cookieStoreParam
    ? await cookieStoreParam
    : await cookies();

  if (!supabaseUrl || !supabaseKey) {
    if (DEBUG_AUTH) {
      console.error("[auth] Missing Supabase envs in server util", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
    }
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or ANON/PUBLISHABLE key for server client");
  }

  if (DEBUG_AUTH) {
    try {
      const all = cookieStore.getAll();
      console.debug("[auth] server.cookies.getAll", { count: all.length });
    } catch (e) {
      console.debug("[auth] server.cookies.getAll failed in this context");
    }
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          const all = cookieStore.getAll();
          if (DEBUG_AUTH) console.debug("[auth] SSR.getAll", { count: all.length });
          return all;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            if (DEBUG_AUTH) console.debug("[auth] SSR.setAll via cookieStore.set", { names: cookiesToSet.map(c => c.name) });
          } catch {
            // Called from a Server Component; ignore write and rely on middleware to refresh sessions
            if (DEBUG_AUTH) console.debug("[auth] SSR.setAll ignored in Server Component context");
          }
        },
      },
    },
  );
};
