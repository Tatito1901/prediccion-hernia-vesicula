// hooks/use-debounce.ts
import { useState, useEffect } from 'react';

/**
 * Hook personalizado para debouncear un valor.
 * @param value El valor a debouncear.
 * @param delay El tiempo de retraso en milisegundos.
 * @returns El valor debounceado.
 */
export function useDebounce<T>(value: T, delay: number): T {
  // Estado para almacenar el valor debounceado
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configurar un temporizador para actualizar el valor debounceado
    // después de que haya transcurrido el 'delay'
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Función de limpieza: se ejecuta si 'value' o 'delay' cambian
    // antes de que el temporizador expire, o si el componente se desmonta.
    // Esto cancela el temporizador anterior y evita actualizaciones innecesarias.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // El efecto se re-ejecuta solo si 'value' o 'delay' cambian

  return debouncedValue;
}