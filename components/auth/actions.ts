// app/auth/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

// Esquema de validación con Zod - más estricto
const LoginSchema = z.object({
  email: z
    .string()
    .email({ message: "Por favor, ingrese un correo electrónico válido." })
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
    .max(128, { message: "La contraseña es demasiado larga." }),
})

export async function login(formData: FormData) {
  try {
    const rawFormData = {
      email: formData.get('email')?.toString().trim().toLowerCase(),
      password: formData.get('password')?.toString(),
    }

    // Validar los datos con el esquema de Zod
    const validatedFields = LoginSchema.safeParse(rawFormData)

    if (!validatedFields.success) {
      const firstError = validatedFields.error.errors[0]?.message
      return redirect(`/login?message=${encodeURIComponent(firstError || 'Datos inválidos.')}`)
    }

    const { email, password } = validatedFields.data

    // Validación adicional de seguridad
    if (!isValidEmailDomain(email)) {
      return redirect(`/login?message=${encodeURIComponent("Dominio de correo no permitido.")}`)
    }

    // Proceder con la autenticación de Supabase
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Autenticación fallida:', {
        email: maskEmail(email),
        error: error.message,
        timestamp: new Date().toISOString()
      })
      
      // Mensajes de error genéricos para evitar enumeración
      const safeErrorMessage = getSafeErrorMessage(error.message)
      return redirect(`/login?message=${encodeURIComponent(safeErrorMessage)}`)
    }

    // Verificar que el usuario esté confirmado
    if (!data.user?.email_confirmed_at) {
      return redirect(`/login?message=${encodeURIComponent("Por favor, confirme su correo electrónico antes de iniciar sesión.")}`)
    }

    // Opcional: Verificar roles o permisos específicos
    const userRole = await getUserRole(data.user.id)
    if (userRole && !isAllowedRole(userRole)) {
      return redirect(`/login?message=${encodeURIComponent("No tiene permisos para acceder a esta aplicación.")}`)
    }

    // Limpiar cache y redirigir
    revalidatePath('/', 'layout')
    revalidatePath('/admision', 'page')

    // Redirección usando redirect de Next.js
    redirect('/admision')

  } catch (error) {
    console.error('Error inesperado en login:', error)
    return redirect(`/login?message=${encodeURIComponent("Ocurrió un error inesperado. Por favor, inténtelo más tarde.")}`)
  }
}

export async function logout() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error al cerrar sesión:', error.message)
      return redirect(`/login?message=${encodeURIComponent("Error al cerrar sesión. Por favor, inténtelo nuevamente.")}`)
    }

    revalidatePath('/', 'layout')
    revalidatePath('/login', 'page')

    redirect('/login')
    
  } catch (error) {
    console.error('Error inesperado en logout:', error)
    redirect(`/login?message=${encodeURIComponent("Ocurrió un error inesperado.")}`)
  }
}

// Funciones auxiliares de seguridad
function isValidEmailDomain(email: string): boolean {
  const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || []
  if (allowedDomains.length === 0) return true // Si no hay dominios configurados, permite todos
  
  return allowedDomains.some(domain => {
    const cleanDomain = domain.trim()
    return cleanDomain.startsWith('@') 
      ? email.endsWith(cleanDomain)
      : email.endsWith(`@${cleanDomain}`)
  })
}

function getSafeErrorMessage(errorMessage: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Credenciales inválidas.',
    'Email not confirmed': 'Por favor, confirme su correo electrónico.',
  }
  
  return errorMap[errorMessage] || 'Credenciales inválidas.'
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***@***'
  
  const maskedLocal = localPart.length > 2 
    ? localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1]
    : '*'.repeat(localPart.length)
    
  return `${maskedLocal}@${domain}`
}

// Funciones para manejo de roles (opcional)
async function getUserRole(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      // No es un error crítico, solo significa que no hay roles definidos
      return null
    }
    
    return data?.role || null
  } catch (error) {
    console.error('Error obteniendo rol:', error)
    return null
  }
}

function isAllowedRole(role: string): boolean {
  const allowedRoles = process.env.ALLOWED_ROLES?.split(',') || ['admin', 'doctor', 'nurse']
  return allowedRoles.includes(role.trim().toLowerCase())
}