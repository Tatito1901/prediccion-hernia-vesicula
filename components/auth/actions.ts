// app/auth/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server';

export async function login(formData: FormData) {
    const supabase = await createClient();

  const email = formData.get('email')?.toString() ?? ''
  const password = formData.get('password')?.toString() ?? ''

  if (!email || !password) {
    throw new Error('Correo y contraseña son requeridos.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Autenticación fallida:', error.message)
    // Podrías usar cookies/flash messages en lugar de query params
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  // Limpia el cache del layout o ruta que dependa de la sesión
  revalidatePath('/')           // Revalida la página raíz
  revalidatePath('/admision')   // Si la ruta admision carga data SSR

  // Finalmente, redirige al área protegida
  redirect('/admision')
}

export async function logout() {
  const supabase = await createClient()

  await supabase.auth.signOut()

  // Si tienes un layout que muestra el nav de usuario, revalídalo
  revalidatePath('/')

  redirect('/login')
}
