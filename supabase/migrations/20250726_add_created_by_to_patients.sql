-- Añadir la columna creado_por a la tabla patients para registrar quién creó al paciente.

-- 1. Añadir la columna 'creado_por' que acepta valores UUID
ALTER TABLE public.patients
ADD COLUMN creado_por UUID;

-- 2. Añadir una clave foránea que referencia a la tabla 'profiles' (auth.users)
-- Esto asegura que el UUID corresponda a un usuario existente.
ALTER TABLE public.patients
ADD CONSTRAINT fk_creado_por
FOREIGN KEY (creado_por)
REFERENCES auth.users(id)
ON DELETE SET NULL; -- Si el usuario es eliminado, el campo se pone a NULL
