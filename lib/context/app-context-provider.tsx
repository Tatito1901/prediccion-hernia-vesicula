'use client'

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useMemo,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
  setLogger,
  type DefaultOptions,
  type UseMutationOptions,
  type UseMutationResult,
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { toast } from 'sonner'

/* ───────────────────────────────────────────────────────────────────────────
   1.  Tipos públicos que expondrá el contexto
   ─────────────────────────────────────────────────────────────────────────── */
export interface AppContextType {
  /** Ejemplo de estado local */
  testState: string
  setTestState: Dispatch<SetStateAction<string>>

  /** Hook auxiliar para mutaciones con soporte de actualización optimista e invalidación */
  useApiMutation: <TVars = unknown, TRes = unknown, TContext = unknown>(
    opts: ApiMutationOpts<TVars, TRes, TContext>
  ) => UseMutationResult<TRes, Error, TVars, { rollback?: () => void }>
}

/* ───────────────────────────────────────────────────────────────────────────
   2.  Contexto en sí mismo
   ─────────────────────────────────────────────────────────────────────────── */
const AppContext = createContext<AppContextType | undefined>(undefined)

/* ───────────────────────────────────────────────────────────────────────────
   3.  Configuración global de React Query
   ─────────────────────────────────────────────────────────────────────────── */
const defaultRQOptions: DefaultOptions = {
  queries: {
    staleTime: 1000 * 60 * 5, // 5 minutos frescos
    cacheTime: 1000 * 60 * 10, // 10 minutos en caché
    retry: 1, // Un solo reintento en caso de error
    refetchOnWindowFocus: false, // No refetchear cuando la ventana recobra foco
  },
}

if (process.env.NODE_ENV === 'production') {
  // En producción, silenciamos los logs de React Query
  setLogger({
    log: () => {},
    warn: () => {},
    error: () => {},
  })
}

/* ───────────────────────────────────────────────────────────────────────────
   4.  Provider principal
   ─────────────────────────────────────────────────────────────────────────── */
interface Props {
  children: ReactNode
}

export const AppContextProvider: React.FC<Props> = ({ children }) => {
  // Creamos QueryClient una sola vez (incluso en StrictMode)
  const queryClientRef = useRef<QueryClient>()
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: defaultRQOptions,
      queryCache: new QueryCache({
        onError: (error) =>
          toast.error('Error de consulta', {
            description: error instanceof Error ? error.message : 'Error inesperado',
          }),
      }),
      mutationCache: new MutationCache({
        onError: (error) =>
          toast.error('Error al guardar', {
            description: error instanceof Error ? error.message : 'Error inesperado',
          }),
        onSuccess: () => {
          toast.success('Cambios guardados')
        },
      }),
    })
  }
  const queryClient = queryClientRef.current

  // Ejemplo de estado global
  const [testState, setTestState] = useState<string>('Initial Test State')

  // Memorizar el valor del contexto para evitar re-renders innecesarios
  const value: AppContextType = useMemo(
    () => ({
      testState,
      setTestState,
      useApiMutation,
    }),
    [testState]
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </QueryClientProvider>
  )
}

/* ───────────────────────────────────────────────────────────────────────────
   5.  Hook consumidor
   ─────────────────────────────────────────────────────────────────────────── */
export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext debe usarse dentro de <AppContextProvider>')
  }
  return ctx
}

/* ───────────────────────────────────────────────────────────────────────────
   6.  Definiciones para el helper de mutaciones optimistas
   ─────────────────────────────────────────────────────────────────────────── */
type InvalidateKeys = QueryKey | QueryKey[]

export interface ApiMutationOpts<TVars, TRes, TContext>
  extends Omit<UseMutationOptions<TRes, Error, TVars, { rollback?: () => void }>, 
    'onMutate' | 'onError' | 'onSuccess' | 'onSettled'
  > {
  /** Claves de consulta que deben invalidarse al finalizar */
  invalidate: InvalidateKeys
  /**
   * Función opcional para actualizar de manera optimista.
   * Retorna una función de rollback que se ejecutará en caso de error.
   */
  optimisticUpdate?: (qc: ReturnType<typeof useQueryClient>, vars: TVars) => () => void
}

/**
 * Hook auxiliar que encapsula una mutación con:
 *  - Cancelación previa de queries
 *  - Actualización optimista opcional
 *  - Invalidación de queries al terminar
 */
export function useApiMutation<TVars = unknown, TRes = unknown, TContext = unknown>(
  { invalidate, optimisticUpdate, ...opts }: ApiMutationOpts<TVars, TRes, TContext>
): UseMutationResult<TRes, Error, TVars, { rollback?: () => void }> {
  const qc = useQueryClient()

  return useMutation<TRes, Error, TVars, { rollback?: () => void }>({
    ...opts,
    // Antes de ejecutar la mutación, cancelamos queries y aplicamos actualización optimista si la hay
    onMutate: async (vars: TVars) => {
      await qc.cancelQueries(invalidate)
      let rollback: (() => void) | undefined
      if (optimisticUpdate) {
        rollback = optimisticUpdate(qc, vars)
      }
      return { rollback }
    },
    // Si hay error, revertimos con rollback y delegamos a onError del usuario
    onError: (err, vars, ctx) => {
      ctx?.rollback?.()
      if (opts.onError) {
        // Cast de contexto a TContext
        opts.onError(err, vars, ctx as unknown as TContext)
      }
    },
    // En éxito, simplemente delegamos a onSuccess del usuario
    onSuccess: (data, vars, ctx) => {
      if (opts.onSuccess) {
        opts.onSuccess(data, vars, ctx as unknown as TContext)
      }
    },
    // Al terminar (éxito o fallo), invalidamos las claves indicadas
    onSettled: async (data, error, vars, ctx) => {
      await qc.invalidateQueries(invalidate)
      if (opts.onSettled) {
        opts.onSettled(data, error, vars, ctx as unknown as TContext)
      }
    },
  })
}
