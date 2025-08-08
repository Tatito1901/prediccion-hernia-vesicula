import { Suspense } from "react";
import LoginPage from "@/components/auth/login-page";

export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginPage />
        </Suspense>
    )
}               