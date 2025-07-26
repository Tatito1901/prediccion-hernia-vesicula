// components/theme/theme-script.tsx
'use client';

import { useEffect } from 'react';

// Este componente no renderiza nada, sólo ejecuta un script para prevenir el flash
export const ThemeScript = () => {
  useEffect(() => {
    // No hacemos nada en el cliente, todo el trabajo se hace en el script inline
  }, []);

  return null;
};

// Este script se ejecuta en el lado del cliente antes del hidratado de React
export function ThemeScriptInit() {
  // Este script se inserta en la etiqueta <head> para ejecutarse lo antes posible
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            // Intentamos recuperar el tema de localStorage
            const theme = localStorage.getItem('theme');
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            
            // Si el usuario ha elegido un tema específico, lo usamos
            // Si eligió 'system', o no hay preferencia, usamos el tema del sistema
            const resolvedTheme = theme === 'system' || !theme ? systemTheme : theme;
            
            // Aplicamos la clase dark al HTML si corresponde
            if (resolvedTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          })();
        `,
      }}
    />
  );
}
