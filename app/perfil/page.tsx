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
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>
      {/* Server component fetches profile by userId */}
      <ProfileCard userId={user.id} email={user.email} />
    </div>
  );
}
