"use client"

import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import dynamic from "next/dynamic"

// Devtools solo en desarrollo o modo debug y solo en cliente
const ReactQueryDevtools = dynamic(
  () => import("@tanstack/react-query-devtools").then((m) => m.ReactQueryDevtools),
  { ssr: false }
)

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
        staleTime: 60 * 1000,
        // v5: emulate keepPreviousData behavior
        placeholderData: (previousData: unknown) => previousData,
        gcTime: 5 * 60 * 1000,
      },
      mutations: { retry: 0 },
    },
  })
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => createClient())

  const showDevtools =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEBUG === "true" ||
    process.env.DEBUG === "true"

  return (
    <QueryClientProvider client={client}>
      {children}
      {showDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
