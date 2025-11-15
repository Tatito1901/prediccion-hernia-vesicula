import { createClient } from "@/utils/supabase/server";
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

    // Use SSR client so updates respect RLS (user can only update their own profile)
    const db = supabase;

    let { data, error } = await db
      .from("profiles")
      .update({ avatar_url: avatar_url ?? null })
      .eq("id", user.id)
      .select("id, avatar_url")
      .single();

    // If no existing row, create one (first-login scenario)
    const errObj = error as { code?: string; message?: string } | null;
    const isNoRow = !!error && (
      errObj?.code === "PGRST116" ||
      /no rows|0 rows|not found/i.test(errObj?.message || "")
    );

    if (isNoRow) {
      const insertRes = await db
        .from("profiles")
        .insert({ id: user.id, avatar_url: avatar_url ?? null })
        .select("id, avatar_url")
        .single();
      data = insertRes.data;
      error = insertRes.error;
    }

    if (error) {
      // Map RLS/permission errors to 403 for clarity
      const errDetails = error as { code?: string; hint?: string; message?: string };
      const code = errDetails?.code || errDetails?.hint || undefined;
      const isRls = errDetails?.code === "42501" || /row-level security/i.test(errDetails?.message || "");
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
  } catch (e: unknown) {
    const error = e as Error
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
