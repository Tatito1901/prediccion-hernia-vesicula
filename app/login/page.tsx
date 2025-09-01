import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProfessionalLoginForm from "@/components/auth/login-page";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sp = await searchParams;
  const rawNext = typeof sp?.next === 'string' ? sp.next : undefined;
  const errorCode = typeof sp?.error === 'string' ? sp.error : undefined;
  const isInternal = !!rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://');
  const nextPath = isInternal ? rawNext : undefined;

  if (user && !['forbidden', 'access_denied'].includes((errorCode || '').toLowerCase())) {
    const target = nextPath === '/login' ? '/dashboard' : (nextPath || '/dashboard')
    return redirect(target);
  }

  return <ProfessionalLoginForm nextPath={nextPath} initialErrorCode={errorCode} />;
}
