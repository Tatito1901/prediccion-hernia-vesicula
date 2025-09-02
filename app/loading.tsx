import React from "react";
import { LoadingSpinner } from "@/components/ui/unified-skeletons";

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 p-6 rounded-lg">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    </div>
  );
}
