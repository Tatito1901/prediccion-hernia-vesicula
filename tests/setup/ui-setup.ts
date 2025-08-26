import '@testing-library/jest-dom/vitest'

// Simple matchMedia mock with width-based evaluation and change dispatching
(() => {
  type Listener = (e: MediaQueryListEvent) => void

  const registries = new Map<string, {
    mql: MediaQueryList
    listeners: Set<Listener>
  }>()

  const parseAndEval = (query: string, width: number): boolean => {
    // Normalize
    const q = query
      .toLowerCase()
      .replace(/[()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const parts = q.split(' and ').map(p => p.trim())

    // Evaluate all parts that we understand. Unknown parts => true (non-restrictive)
    return parts.every(part => {
      let m: RegExpMatchArray | null
      if ((m = part.match(/max-width:\s*(\d+)px/))) {
        const lim = parseInt(m[1], 10)
        return width <= lim
      }
      if ((m = part.match(/min-width:\s*(\d+)px/))) {
        const lim = parseInt(m[1], 10)
        return width >= lim
      }
      // Ignore orientation / hover / pointer etc. unless needed
      return true
    })
  }

  const createMql = (query: string): MediaQueryList => {
    let matches = parseAndEval(query, window.innerWidth)
    const listeners = new Set<Listener>()

    const mql: MediaQueryList = {
      media: query,
      matches,
      onchange: null,
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type !== 'change') return
        const fn: Listener = (e: MediaQueryListEvent) => {
          if (typeof listener === 'function') listener(e as unknown as Event)
          else (listener as EventListenerObject).handleEvent(e as unknown as Event)
        }
        ;(listener as any).__wrapped = fn
        listeners.add(fn)
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type !== 'change') return
        const fn = (listener as any).__wrapped as Listener | undefined
        if (fn) listeners.delete(fn)
      },
      addListener: (listener: Listener) => {
        listeners.add(listener)
      },
      removeListener: (listener: Listener) => {
        listeners.delete(listener)
      },
      dispatchEvent: () => false,
    } as unknown as MediaQueryList

    registries.set(query, { mql, listeners })
    return mql
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const existing = registries.get(query)
      if (existing) return existing.mql
      return createMql(query)
    },
  })

  const notifyAll = () => {
    registries.forEach((entry, query) => {
      const next = parseAndEval(query, window.innerWidth)
      if (entry.mql.matches !== next) {
        ;(entry.mql as any).matches = next
        const evt = { matches: next, media: query } as unknown as MediaQueryListEvent
        entry.listeners.forEach(l => l(evt))
        if (typeof entry.mql.onchange === 'function') {
          entry.mql.onchange(evt)
        }
      }
    })
  }

  ;(globalThis as any).setViewportWidth = (w: number) => {
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
    window.dispatchEvent(new Event('resize'))
    notifyAll()
  }
})()
