/* ------------------------------------------------------------------
   AppContextProvider.tsx – provider único, robusto y optimizado
   ------------------------------------------------------------------ */
   "use client"

   import React, {
     createContext,
     useContext,
     useRef,
     ReactNode,
     type Dispatch,
     type SetStateAction,
   } from "react"
   import {
     QueryClient,
     QueryClientProvider,
     QueryCache,
     MutationCache,
     setLogger,
     type DefaultOptions,
     type UseMutationOptions,
     useMutation,
     useQueryClient,
   } from "@tanstack/react-query"
   import { toast } from "sonner"
   
   /* ───────────────────────────────
      1.  Tipos públicos del contexto
      ─────────────────────────────── */
   export interface AppContextType {
     /* Ejemplo de estado local */
     testState: string
     setTestState: Dispatch<SetStateAction<string>>
   
     /* Helper para mutaciones con optimismo */
     useApiMutation: typeof useApiMutation
   }
   
   /* ───────────────────────────────
      2.  Contexto
      ─────────────────────────────── */
   const AppContext = createContext<AppContextType | undefined>(undefined)
   
   /* ───────────────────────────────
      3.  Config global de React-Query
      ─────────────────────────────── */
   const defaultRQOptions: DefaultOptions = {
     queries: {
       /* 5 min frescos, 10 min en caché */
       staleTime: 1000 * 60 * 5,
       cacheTime: 1000 * 60 * 10,
       retry: 1, // Menor latencia ante error
       refetchOnWindowFocus: false,
     },
   }
   
   /* En producción silenciamos logs ruidosos */
   if (process.env.NODE_ENV === "production") {
     setLogger({
       log: () => {},
       warn: () => {},
       error: () => {},
     })
   }
   
   /* ───────────────────────────────
      4.  Provider principal
      ─────────────────────────────── */
   interface Props {
     children: ReactNode
   }
   
   export const AppContextProvider = ({ children }: Props) => {
     /* QueryClient estable incluso en StrictMode */
     const queryClientRef = useRef<QueryClient>()
   
     if (!queryClientRef.current) {
       queryClientRef.current = new QueryClient({
         defaultOptions: defaultRQOptions,
         queryCache: new QueryCache({
           onError: (error) =>
             toast.error("Error de consulta", {
               description:
                 error instanceof Error ? error.message : "Error inesperado",
             }),
         }),
         mutationCache: new MutationCache({
           onError: (error) =>
             toast.error("Error al guardar", {
               description:
                 error instanceof Error ? error.message : "Error inesperado",
             }),
           onSuccess: () => toast.success("Cambios guardados"),
         }),
       })
     }
     const queryClient = queryClientRef.current
   
     /* Estado global de ejemplo */
     const [testState, setTestState] = React.useState("Initial Test State")
   
     /* Valor de contexto */
     const value: AppContextType = {
       testState,
       setTestState,
       useApiMutation, // helper expuesto
     }
   
     return (
       <QueryClientProvider client={queryClient}>
         <AppContext.Provider value={value}>{children}</AppContext.Provider>
       </QueryClientProvider>
     )
   }
   
   /* ───────────────────────────────
      5.  Hook consumidor
      ─────────────────────────────── */
   export const useAppContext = (): AppContextType => {
     const ctx = useContext(AppContext)
     if (!ctx)
       throw new Error(
         "useAppContext debe usarse dentro de <AppContextProvider>",
       )
     return ctx
   }
   
   /* ───────────────────────────────
      6.  Helper: mutaciones optimistas
      ─────────────────────────────── */
   type InvalidateKeys = Parameters<ReturnType<typeof useQueryClient>["invalidateQueries"]>[0]
   
   interface ApiMutationOpts<TVars, TRes, TContext>
     extends UseMutationOptions<TRes, Error, TVars, TContext> {
     /** Claves de consulta que deben invalidarse al finalizar */
     invalidate: InvalidateKeys | InvalidateKeys[]
     /** Actualización optimista opcional */
     optimisticUpdate?: (
       qc: ReturnType<typeof useQueryClient>,
       vars: TVars,
     ) => () => void // devuelve rollback
   }
   
   function useApiMutation<TVars = unknown, TRes = unknown, TContext = unknown>({
     invalidate,
     optimisticUpdate,
     ...opts
   }: ApiMutationOpts<TVars, TRes, TContext>) {
     const qc = useQueryClient()
   
     return useMutation<TRes, Error, TVars, { rollback?: () => void }>({
       ...opts,
       onMutate: async (vars) => {
         await qc.cancelQueries(invalidate)
         let rollback: (() => void) | undefined
         if (optimisticUpdate) rollback = optimisticUpdate(qc, vars)
         return { rollback }
       },
       onError: (err, vars, ctx) => {
         ctx?.rollback?.()
         opts.onError?.(err, vars, ctx as unknown as TContext)
       },
       onSuccess: (data, vars, ctx) => {
         opts.onSuccess?.(data, vars, ctx as unknown as TContext)
       },
       onSettled: async () => {
         await qc.invalidateQueries(invalidate)
         opts.onSettled?.()
       },
     })
   }
   