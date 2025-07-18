import React, { memo, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Lazy-load heavy icon components to reduce initial bundle
const CircleUser = dynamic(() => import("lucide-react").then(mod => mod.CircleUser), { ssr: false });
const UserIcon = dynamic(() => import("lucide-react").then(mod => mod.UserIcon), { ssr: false });
const SettingsIcon = dynamic(() => import("lucide-react").then(mod => mod.SettingsIcon), { ssr: false });
const LogOutIcon = dynamic(() => import("lucide-react").then(mod => mod.LogOutIcon), { ssr: false });
const ChevronRight = dynamic(() => import("lucide-react").then(mod => mod.ChevronRight), { ssr: false });

interface NavUserProps extends React.HTMLAttributes<HTMLDivElement> {
  user: { name: string; email: string };
  collapsed?: boolean;
}

const NavUser = memo(({ user, className, collapsed = false, ...props }: NavUserProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only recalc initials when name changes
  const initials = useMemo(
    () => user.name.split(" ").map(n => n[0]).join("").toUpperCase(),
    [user.name]
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return (
    <SidebarGroup className={className} {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className={cn(
                    "group relative rounded-xl p-3",
                    "focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                    isOpen
                      ? "bg-gradient-to-r from-slate-100/80 to-slate-200/60 dark:from-slate-700/50 dark:to-slate-600/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full border-2 overflow-hidden",
                        "border-emerald-200 dark:border-emerald-700",
                        collapsed ? "h-8 w-8" : "h-10 w-10",
                        "bg-slate-100 dark:bg-slate-800"
                      )}
                    >
                      <CircleUser className={cn(
                        collapsed ? "h-6 w-6" : "h-8 w-8",
                        "text-emerald-600 dark:text-emerald-400"
                      )} />
                      {/* Screen-readers: show initials fallback */}
                      <span className="sr-only">{initials}</span>
                    </div>

                    {/* Hide text on mobile */}
                    {!collapsed && (
                      <div className="flex-1 min-w-0 hidden sm:flex flex-col truncate">
                        <span className="font-semibold text-sm truncate">
                          {user.name}
                        </span>
                        <span className="text-xs truncate text-slate-500 dark:text-slate-400">
                          {user.email}
                        </span>
                      </div>
                    )}

                    {!collapsed && (
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-transform",
                          isOpen && "rotate-90 text-emerald-600"
                        )}
                      />
                    )}
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className={cn(
                  "w-64 rounded-xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md",
                  "border-slate-200/50 dark:border-slate-700/50 shadow-lg"
                )}
              >
                <DropdownMenuLabel className="px-4 py-3 flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 border-2 rounded-full bg-slate-100 dark:bg-slate-800 border-emerald-200 dark:border-emerald-700">
                    <CircleUser className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {user.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>

                <div className="p-2">
                  {[
                    { href: "/perfil", Icon: UserIcon, label: "Mi Perfil" },
                    { href: "/configuracion", Icon: SettingsIcon, label: "Configuración" },
                  ].map(({ href, Icon, label }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium truncate">{label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>

                <DropdownMenuSeparator className="my-2 bg-slate-200 dark:bg-slate-700" />

                <div className="p-2">
                  <DropdownMenuItem asChild>
                    <Link href="/logout" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900">
                      <LogOutIcon className="h-4 w-4" />
                      <span className="font-medium">Cerrar Sesión</span>
                    </Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});

NavUser.displayName = 'NavUser';

export default NavUser;
