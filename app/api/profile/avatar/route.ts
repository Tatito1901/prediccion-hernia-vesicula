import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createApiError, createApiResponse } from "@/lib/api-response-types";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    // Use SSR client for auth context
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return Response.json(
        createApiError("AUTH_ERROR", {
          message: "No se pudo obtener el usuario actual",
          details: authError.message,
          code: "AUTH_ERROR",
        }),
        { status: 401 }
      );
    }

    if (!user) {
      return Response.json(
        createApiError("UNAUTHORIZED", { message: "Usuario no autenticado", code: "UNAUTHORIZED" }),
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const avatar_url: string | null = body?.avatar_url ?? null;

    // Validaciones simples: permitir null (usar iniciales) o un asset permitido bajo /avatars/
    if (avatar_url !== null && typeof avatar_url !== "string") {
      return Response.json(
        createApiError("VALIDATION_ERROR", {
          message: "avatar_url inválido",
          code: "INVALID_AVATAR_URL",
        }),
        { status: 400 }
      );
    }

    if (avatar_url && !avatar_url.startsWith("/avatars/")) {
      return Response.json(
        createApiError("VALIDATION_ERROR", {
          message: "Solo se permiten avatares del catálogo",
          code: "AVATAR_NOT_ALLOWED",
        }),
        { status: 400 }
      );
    }

    // Prefer admin client for DB mutation if available to avoid RLS pitfalls
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    let { data, error } = await db
      .from("profiles")
      .update({ avatar_url: avatar_url ?? null })
      .eq("id", user.id)
      .select("id, avatar_url")
      .single();

    // If no existing row, create one (first-login scenario)
    const isNoRow = !!error && (
      (error as any)?.code === "PGRST116" ||
      /no rows|0 rows|not found/i.test((error as any)?.message || "")
    );

    if (isNoRow) {
      const insertRes = await db
        .from("profiles")
        .insert({ id: user.id, avatar_url: avatar_url ?? null })
        .select("id, avatar_url")
        .single();
      data = insertRes.data as any;
      error = insertRes.error as any;
    }

    if (error) {
      // Map RLS/permission errors to 403 for clarity
      const code = (error as any)?.code || (error as any)?.hint || undefined;
      const isRls = (error as any)?.code === "42501" || /row-level security/i.test((error as any)?.message || "");
      return Response.json(
        createApiError(isRls ? "PERMISSION_DENIED" : "DB_UPDATE_FAILED", {
          message: isRls ? "Política de seguridad impidió la actualización" : "No se pudo actualizar el avatar",
          details: error.message,
          code: isRls ? "RLS_FORBIDDEN" : "DB_UPDATE_FAILED",
        }),
        { status: isRls ? 403 : 500 }
      );
    }

    if (!data) {
      return Response.json(
        createApiError("DB_UPDATE_FAILED", {
          message: "La actualización no devolvió datos",
          code: "NO_DATA",
        }),
        { status: 500 }
      );
    }

    return Response.json(
      createApiResponse(
        { id: data.id, avatar_url: data.avatar_url },
        { message: "Avatar actualizado" }
      )
    );
  } catch (e: any) {
    return Response.json(
      createApiError("UNEXPECTED_ERROR", {
        message: "Ocurrió un error inesperado",
        details: e?.message ?? String(e),
        code: "UNEXPECTED_ERROR",
      }),
      { status: 500 }
    );
  }
}
