# Sistema de Gestión Clínica y Predicción de Hernia Vesicular

Este es un sistema de gestión clínica integral diseñado para administrar pacientes, citas y encuestas médicas. La aplicación está construida con un stack moderno y robusto, enfocado en la escalabilidad y la experiencia de usuario. Adicionalmente, integra un modelo de machine learning para predecir la probabilidad de cirugía en pacientes con hernia vesicular.

## Stack Tecnológico

*   **Framework:** [Next.js](https://nextjs.org/) (React)
*   **Backend y Base de Datos:** [Supabase](https://supabase.io/) (PostgreSQL)
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
*   **Componentes UI:** [Shadcn/UI](https://ui.shadcn.com/)
*   **Gestión de Estado:** [React Query](https://tanstack.com/query/latest)
*   **Validación de Formularios:** [React Hook Form](https://react-hook-form.com/) y [Zod](https://zod.dev/)

## Puesta en Marcha

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno de desarrollo local.

### Prerrequisitos

- Node.js (v18 o superior)
- npm o yarn
- Docker Desktop (debe estar en ejecución para el desarrollo local con Supabase)

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd prediccion-hernia-vesicula
```

### 2. Instalar Dependencias

```bash
npm install
# O si usas yarn
yarn install
```

### 3. Configurar Supabase

El proyecto utiliza la CLI de Supabase para gestionar la base de datos local.

1.  **Iniciar Supabase:** (Asegúrate de que Docker Desktop esté corriendo)
    ```bash
    npx supabase start
    ```

2.  **Aplicar Migraciones:** Para crear la estructura de la base de datos y las funciones RPC.
    ```bash
    npx supabase db reset
    ```

### 4. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto. Puedes copiar el contenido de `.env.example` si existe, o usar la salida del comando `npx supabase status` para obtener las credenciales locales.

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

**Nota:** Las claves anteriores son las predeterminadas para el entorno local de Supabase. No las uses en producción.

### 5. Ejecutar la Aplicación

Una vez completados los pasos anteriores, puedes iniciar el servidor de desarrollo.

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila la aplicación para producción.
- `npm run start`: Inicia un servidor de producción.
- `npm run lint`: Ejecuta el linter para revisar la calidad del código.
