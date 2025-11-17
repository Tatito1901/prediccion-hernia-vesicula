"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/http";
import { cn } from "@/lib/utils";

const AVATARS: { key: string; label: string; src: string }[] = [
  { key: "doctor-m", label: "Doctor", src: "/avatars/doctor-male.svg" },
  { key: "doctor-f", label: "Doctora", src: "/avatars/doctor-female.svg" },
  { key: "hospital", label: "Hospital", src: "/avatars/hospital.svg" },
  { key: "stethoscope", label: "Estetoscopio", src: "/avatars/stethoscope.svg" },
  { key: "scalpel", label: "Bisturí", src: "/avatars/scalpel.svg" },
  { key: "syringe", label: "Jeringa", src: "/avatars/syringe.svg" },
  { key: "heart", label: "Corazón", src: "/avatars/heart.svg" },
  { key: "clipboard", label: "Historia Clínica", src: "/avatars/clipboard.svg" },
];

export function AvatarPicker({ currentAvatar }: { currentAvatar?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState<string | null>(null);

  async function selectAvatar(avatarUrl: string | null) {
    try {
      setLoading(avatarUrl ?? "none");
      await fetchJson("/api/profile/avatar", {
        method: "PATCH",
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });
      toast.success("Avatar actualizado correctamente");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error("No se pudo actualizar el avatar. Intenta de nuevo.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Cambiar avatar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Elige un avatar</DialogTitle>
          <DialogDescription>Selecciona un avatar o usa tus iniciales.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {AVATARS.map((a) => (
            <button
              key={a.key}
              onClick={() => selectAvatar(a.src)}
              disabled={!!loading}
              className={cn(
                "group relative rounded-md border p-2 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm transition-all hover:border-medical-400 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-medical-500 ring-1 ring-transparent",
                currentAvatar === a.src
                  ? "border-medical-500 ring-2 ring-medical-500/60 shadow-medical-lg"
                  : "border-muted"
              )}
              aria-label={a.label}
            >
              <span
                className={cn(
                  "absolute right-1.5 top-1.5 inline-flex items-center justify-center rounded-full transition-opacity",
                  currentAvatar === a.src ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                aria-hidden="true"
              >
                <CheckCircle2 className="h-5 w-5 text-medical-600" />
              </span>
              <div className="relative mx-auto size-16">
                <Image src={a.src} alt={a.label} fill sizes="64px" className="object-contain" />
              </div>
              <div className="mt-1 text-center text-xs text-muted-foreground">{a.label}</div>
            </button>
          ))}
          {/* Opción para limpiar avatar (usar iniciales) */}
          <button
            onClick={() => selectAvatar(null)}
            disabled={!!loading}
            className={cn(
              "group relative rounded-md border p-2 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm transition-all hover:border-medical-400 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-medical-500 ring-1 ring-transparent",
              !currentAvatar
                ? "border-medical-500 ring-2 ring-medical-500/60 shadow-medical-lg"
                : "border-muted"
            )}
          >
            <span
              className={cn(
                "absolute right-1.5 top-1.5 inline-flex items-center justify-center rounded-full transition-opacity",
                !currentAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              aria-hidden="true"
            >
              <CheckCircle2 className="h-5 w-5 text-medical-600" />
            </span>
            <div className="mx-auto flex size-16 items-center justify-center rounded bg-medical-50 text-medical-700 text-2xl font-semibold">
              Aa
            </div>
            <div className="mt-1 text-center text-xs text-muted-foreground">Iniciales</div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AvatarPicker;
