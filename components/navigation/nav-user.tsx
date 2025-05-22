"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { LogOutIcon } from "lucide-react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavUserProps extends React.HTMLAttributes<HTMLDivElement> {
  user: {
    name: string
    email: string
    avatar?: string
  }
  isActuallyCollapsed: boolean;
}

export function NavUser({ user, className, isActuallyCollapsed, ...props }: NavUserProps) {
  const [mounted, setMounted] = useState(false);
  
  // Comprobar si está montado para evitar errores de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <SidebarGroup className={className} {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="py-3 px-4 flex items-center justify-between w-full hover:bg-accent/50">
                  <div className="flex items-center w-full overflow-hidden gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0 border-2 border-background shadow-sm">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    {(!isActuallyCollapsed && mounted) && (
                      <div className="flex-grow min-w-0 overflow-hidden">
                        <p className="font-medium text-sm leading-tight truncate max-w-full">{user.name}</p>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate max-w-full">{user.email}</p>
                      </div>
                    )}
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil">Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/configuracion">Configuración</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/logout" className="text-destructive">
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
