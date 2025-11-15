import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

// Use layout effect on client, effect on server to avoid SSR warnings
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Auto-calculates a height for a scrollable list area based on the element's
 * position in the viewport. It clamps the result between `min` and `max`, and
 * leaves a `bottomGap` at the bottom for breathing room.
 *
 * This is a lightweight alternative to react-virtualized AutoSizer tailored for
 * our layout. It listens to window resize/orientation changes and uses a
 * ResizeObserver (when available) to respond to layout shifts.
 */
export function useAutoListHeight(options?: { min?: number; max?: number; bottomGap?: number }) {
  const { min = 320, max = 720, bottomGap = 24 } = options || {}
  const ref = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState<number>(0)

  const measure = useCallback(() => {
    if (typeof window === "undefined") return
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const viewport = window.innerHeight || 0
    const next = Math.max(min, Math.min(max, viewport - rect.top - bottomGap))
    setHeight(Math.floor(next))
  }, [min, max, bottomGap])

  useIsomorphicLayoutEffect(() => {
    // Initial measure
    measure()

    if (typeof window === "undefined") return

    const handle = () => measure()
    window.addEventListener("resize", handle)
    window.addEventListener("orientationchange", handle)

    // Observe layout changes to re-measure when needed
    let ro: ResizeObserver | undefined
    try {
      if ("ResizeObserver" in window && typeof ResizeObserver !== 'undefined') {
        const observer: ResizeObserver = new ResizeObserver(handle)
        observer.observe(document.body)
        ro = observer
      }
    } catch {
      // noop - ResizeObserver not available
    }

    return () => {
      window.removeEventListener("resize", handle)
      window.removeEventListener("orientationchange", handle)
      ro?.disconnect()
    }
  }, [measure])

  return { ref, height }
}
