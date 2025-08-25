import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Simple helpers exported for testing
export function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

export function formatRole(role?: string | null) {
  if (!role) return "Sin rol";
  const r = role.toLowerCase();
  if (r === "admin") return "Administrador";
  if (r === "doctor") return "Doctor";
  if (r === "asistente") return "Asistente";
  return role;
}

async function fetchProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url")
    .eq("id", userId)
    .single();

  if (error) {
    // Not fatal; return minimal profile
    return { full_name: null as string | null, role: null as string | null, avatar_url: null as string | null };
  }

  return {
    full_name: data?.full_name ?? null,
    role: (data?.role as string | null) ?? null,
    avatar_url: data?.avatar_url ?? null,
  };
}

async function fetchUserRole(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  if (error) return null as string | null;
  return (data?.role as string | null) ?? null;
}

export default async function ProfileCard({ userId, email: emailProp }: { userId: string; email?: string | null }) {
  // Fetch profile (name, avatar, optional role)
  const profile = await fetchProfile(userId);
  // Prefer role from user_roles; fallback to profiles.role if not set
  const role = (await fetchUserRole(userId)) ?? profile.role;

  // Email: prefer provided from caller; otherwise retrieve from auth
  let email = emailProp ?? null;
  if (!email) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      email = user?.email ?? null;
    } catch {
      email = null;
    }
  }

  const name = profile.full_name ?? "Usuario";
  const roleLabel = formatRole(role);
  const initials = getInitials(profile.full_name);

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={name} />
            ) : (
              <AvatarFallback className="text-lg font-semibold">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col">
            <CardTitle className="text-xl font-semibold">{name}</CardTitle>
            <CardDescription className="capitalize">{roleLabel}</CardDescription>
            <span className="text-sm text-muted-foreground break-all">{email ?? "Sin correo"}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Placeholder for future profile fields */}
        <div className="text-sm text-muted-foreground">
          Información de perfil básica obtenida desde Supabase.
        </div>
      </CardContent>
    </Card>
  );
}
