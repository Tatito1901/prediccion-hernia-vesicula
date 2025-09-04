import { Suspense } from "react";
import LoginPage from "@/components/auth/login-page";
import { LoadingSpinner } from "@/components/ui/unified-skeletons";
import { login } from "@/components/auth/actions";

export default function Home() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-10">
                    <LoadingSpinner size="lg" />
                </div>
            }
        >
            <LoginPage loginAction={login} />
        </Suspense>
    )
}