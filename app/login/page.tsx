import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProfessionalLoginForm from "@/components/auth/login-page";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return redirect("/admision");
  }

  return <ProfessionalLoginForm />;
}
