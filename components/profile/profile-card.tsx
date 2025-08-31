import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Mail, ShieldCheck, Stethoscope, UserCog } from "lucide-react";
import AvatarPicker from "@/components/profile/avatar-picker";

import { getInitials, formatRole } from "@/lib/profile-helpers";
export { getInitials, formatRole };

async function fetchProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url, created_at, is_active")
    .eq("id", userId)
    .single();

  if (error) {
    // Not fatal; return minimal profile
    return {
      full_name: null as string | null,
      role: null as string | null,
      avatar_url: null as string | null,
      created_at: null as string | null,
      is_active: null as boolean | null,
    };
  }

  return {
    full_name: data?.full_name ?? null,
    role: (data?.role as string | null) ?? null,
    avatar_url: data?.avatar_url ?? null,
    created_at: data?.created_at ?? null,
    is_active: (data?.is_active as boolean | null) ?? null,
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
  let userCreatedAt: string | null = null;
  if (!email) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      email = user?.email ?? null;
      userCreatedAt = user?.created_at ?? null;
    } catch {
      email = null;
    }
  }

  const name = profile.full_name ?? "Usuario";
  const roleLabel = formatRole(role);
  const initials = getInitials(profile.full_name);
  const roleKey = (role ?? "").toLowerCase();
  const RoleIcon = roleKey === "admin" ? ShieldCheck : roleKey === "doctor" ? Stethoscope : UserCog;
  const memberSinceSource = profile.created_at ?? userCreatedAt;
  const memberSince = memberSinceSource && !Number.isNaN(new Date(memberSinceSource).getTime())
    ? new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(new Date(memberSinceSource))
    : null;

  return (
    <Card className="w-full sm:max-w-md md:max-w-xl mx-auto overflow-hidden shadow-medical-lg animate-in fade-in-50">
      <CardHeader className="relative pb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-medical-600/5 via-medical-500/10 to-medical-400/5 pointer-events-none" aria-hidden="true" />
        <div className="relative flex flex-col items-start sm:flex-row sm:items-center gap-4">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 ring-2 ring-medical-500/20 shadow-md">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={name} />
            ) : (
              <AvatarFallback className="text-lg font-semibold bg-medical-50 text-medical-700">
                {initials}
              </AvatarFallback>
            )}
            {typeof profile.is_active === "boolean" && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-white dark:ring-neutral-900 ${
                  profile.is_active ? "bg-clinical-active" : "bg-clinical-cancelled"
                }`}
                aria-label={profile.is_active ? "Activo" : "Inactivo"}
              />
            )}
          </Avatar>
          <div className="flex flex-col">
            <CardTitle className="text-2xl md:text-3xl font-semibold tracking-tight">{name}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge className="bg-medical-50 text-medical-700 border border-medical-200 flex items-center gap-1">
                <RoleIcon className="h-3.5 w-3.5" />
                <span className="capitalize">{roleLabel}</span>
              </Badge>
              {typeof profile.is_active === "boolean" && (
                <Badge className={
                  profile.is_active
                    ? "bg-clinical-active/10 text-clinical-active border border-clinical-active/20"
                    : "bg-clinical-cancelled/10 text-clinical-cancelled border border-clinical-cancelled/20"
                }>
                  {profile.is_active ? "Activo" : "Inactivo"}
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground break-all">
              <Mail className="h-4 w-4 text-medical-600" />
              <span>{email ?? "Sin correo"}</span>
            </div>
            <div className="mt-2">
              {/* Client component to pick medical-themed avatars */}
              <AvatarPicker currentAvatar={profile.avatar_url} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-medical-600" />
            <div>
              <div className="text-muted-foreground">Miembro desde</div>
              <div className="font-medium">{memberSince ?? "—"}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
