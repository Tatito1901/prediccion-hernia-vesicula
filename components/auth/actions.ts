// app/auth/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

// Esquema de validación con Zod
const LoginSchema = z.object({
  email: z.string().email({ message: "Por favor, ingrese un correo electrónico válido." }),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
});

export async function login(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());

  // 1. Validar los datos con el esquema de Zod
  const validatedFields = LoginSchema.safeParse(rawFormData);

  // 2. Si la validación falla, redirigir con el primer error
  if (!validatedFields.success) {
    const firstError = validatedFields.error.errors[0]?.message;
    return redirect(`/login?message=${encodeURIComponent(firstError || 'Datos inválidos.')}`);
  }

  const { email, password } = validatedFields.data;

  // 3. Proceder con la autenticación de Supabase
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Autenticación fallida:', error.message);
    return redirect(`/login?message=${encodeURIComponent(error.message)}`);
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
