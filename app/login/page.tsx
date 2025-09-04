import { redirect } from "next/navigation";
import ProfessionalLoginForm from "@/components/auth/login-page";
import { login } from "@/components/auth/actions";
import { createClient } from "@/utils/supabase/server";

function sanitizeNext(path?: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/")) return null;
  if (path.includes("//") || path.includes("@")) return null;
  return path;
}

export default async function LoginAliasPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const sp = searchParams ?? {};
  const nextRaw = typeof sp.next === "string" ? sp.next : Array.isArray(sp.next) ? sp.next[0] : undefined;
  const errorCode = typeof sp.error === "string" ? sp.error : Array.isArray(sp.error) ? sp.error[0] : undefined;
  const nextPath = sanitizeNext(nextRaw) || undefined;

  // Si ya está autenticado, redirigir al destino seguro o al dashboard
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    redirect(nextPath ?? "/dashboard");
  }

  // Renderizar el formulario de login con props adecuadas
  return (
    <ProfessionalLoginForm
      nextPath={nextPath}
      initialErrorCode={errorCode}
      loginAction={login}
    />
  );
}
