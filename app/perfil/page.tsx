import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProfileCard from "@/components/profile/profile-card";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-4xl py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-medical-700 to-medical-500 bg-clip-text text-transparent">
          Mi Perfil
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gestiona tu información personal</p>
      </div>
      {/* Server component fetches profile by userId */}
      <ProfileCard userId={user.id} email={user.email} />
    </div>
  );
}
