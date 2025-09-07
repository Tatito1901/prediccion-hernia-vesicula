"use client"
import type React from "react";
import { useEffect } from "react";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
// ClinicDataProvider ya no es necesario con los nuevos hooks
import { useIsMobile } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";
import { useGlobalOverlay } from "@/components/providers";

export default function DashboardLayout({ 
  children,
  userName,
}: { 
  children: React.ReactNode,
  userName?: string,
}) {
  const isMobile = useIsMobile();
  const { setMessage, hide } = useGlobalOverlay();

  // Al llegar al dashboard, mostrar "Bienvenido" brevemente y luego cerrar el overlay
  useEffect(() => {
    const msg = userName ? `Bienvenido, ${userName}` : "Bienvenido";
    setMessage(msg);
    const t = setTimeout(() => hide(), 800);
    return () => clearTimeout(t);
  }, [userName, setMessage, hide]);

  return (
      <SidebarProvider 
        className={cn(
          "min-h-screen bg-background",
          isMobile && "flex-col"
        )}
      >
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <main className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 @container/main">
              <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                {children}
              </div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
  );
}