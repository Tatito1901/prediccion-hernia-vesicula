import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock tooltip to make assertions on hidden prop without Radix complexity
vi.mock('@/components/ui/tooltip', async () => {
  const React = await import('react')
  return {
    TooltipProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="tooltip-provider">{children}</div>
    ),
    Tooltip: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="tooltip-root">{children}</div>
    ),
    TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="tooltip-trigger">{children}</div>
    ),
    TooltipContent: (props: any) => <div data-testid="tooltip-content" {...props} />,
  }
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenuButton,
} from '@/components/ui/sidebar'

// declare helper from setup
declare global {
  // provided by tests/setup/ui-setup.ts
  // eslint-disable-next-line no-var
  var setViewportWidth: (w: number) => void
}

const setWidth = (w: number) => {
  // jsdom doesn't compute CSS, but our matchMedia mock uses innerWidth
  act(() => {
    globalThis.setViewportWidth(w)
  })
}

describe('Sidebar responsive interactions', () => {
  beforeEach(() => setWidth(1024))

  it('Mobile: SidebarTrigger toggles Sheet open', async () => {
    setWidth(375)
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>Header</SidebarHeader>
          <SidebarContent>Body</SidebarContent>
        </Sidebar>
        <SidebarTrigger aria-label="Toggle mobile" />
      </SidebarProvider>
    )

    // Closed by default
    expect(document.querySelector('[data-mobile="true"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: /toggle mobile/i }))

    // Opens Sheet on mobile (SheetContent rendered with data-mobile="true")
    expect(document.querySelector('[data-mobile="true"]')).toBeInTheDocument()
  })

  it('Desktop: SidebarTrigger toggles collapsed state', async () => {
    setWidth(1024)
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>Header</SidebarHeader>
          <SidebarContent>Body</SidebarContent>
        </Sidebar>
        <SidebarTrigger aria-label="Toggle desktop" />
      </SidebarProvider>
    )

    const wrapper = document.querySelector('div[data-variant]') as HTMLElement
    expect(wrapper).toBeTruthy()
    expect(wrapper.getAttribute('data-state')).toBe('expanded')

    await user.click(screen.getByRole('button', { name: /toggle desktop/i }))

    expect(wrapper.getAttribute('data-state')).toBe('collapsed')
  })

  it('Tooltip: visible only when collapsed on desktop, hidden otherwise and on mobile', async () => {
    const user = userEvent.setup()

    // Desktop expanded: hidden
    setWidth(1024)
    const { rerender } = render(
      <SidebarProvider>
        <SidebarMenuButton tooltip="Tip">Label</SidebarMenuButton>
        <SidebarTrigger aria-label="Trigger" />
      </SidebarProvider>
    )

    let tooltip = screen.getByTestId('tooltip-content')
    expect(tooltip).toHaveAttribute('hidden')

    // Collapse via trigger => tooltip should be visible (no hidden attribute)
    await user.click(screen.getByRole('button', { name: /trigger/i }))
    tooltip = screen.getByTestId('tooltip-content')
    expect(tooltip).not.toHaveAttribute('hidden')

    // Mobile: always hidden even if collapsed/expanded
    setWidth(375)
    rerender(
      <SidebarProvider>
        <SidebarMenuButton tooltip="Tip">Label</SidebarMenuButton>
      </SidebarProvider>
    )
    tooltip = screen.getByTestId('tooltip-content')
    expect(tooltip).toHaveAttribute('hidden')
  })

  it('Keyboard shortcut (Cmd/Ctrl+B) toggles sidebar on desktop', async () => {
    setWidth(1280)
    render(
      <SidebarProvider>
        <Sidebar collapsible="icon" />
      </SidebarProvider>
    )

    const wrapper = document.querySelector('div[data-variant]') as HTMLElement
    expect(wrapper.getAttribute('data-state')).toBe('expanded')

    // macOS style (Meta)
    fireEvent.keyDown(window, { key: 'b', metaKey: true })
    await waitFor(() => expect(wrapper.getAttribute('data-state')).toBe('collapsed'))

    // Windows style (Ctrl)
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    await waitFor(() => expect(wrapper.getAttribute('data-state')).toBe('expanded'))
  })

  it('Breakpoint 767px: treated as mobile overlay', async () => {
    setWidth(767)
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>Header</SidebarHeader>
          <SidebarContent>Body</SidebarContent>
        </Sidebar>
        <SidebarTrigger aria-label="Toggle" />
      </SidebarProvider>
    )

    expect(document.querySelector('[data-mobile="true"]')).toBeNull()
    await user.click(screen.getByRole('button', { name: /toggle/i }))
    await waitFor(() =>
      expect(document.querySelector('[data-mobile="true"]')).toBeInTheDocument()
    )
  })

  it('Breakpoint 768px: treated as desktop (collapsible icon)', async () => {
    setWidth(768)
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>Header</SidebarHeader>
          <SidebarContent>Body</SidebarContent>
        </Sidebar>
        <SidebarTrigger aria-label="Toggle" />
      </SidebarProvider>
    )

    const wrapper = document.querySelector('div[data-variant]') as HTMLElement
    expect(wrapper).toBeTruthy()
    expect(wrapper.getAttribute('data-state')).toBe('expanded')

    await user.click(screen.getByRole('button', { name: /toggle/i }))
    await waitFor(() => expect(wrapper.getAttribute('data-state')).toBe('collapsed'))

    // Ensure no mobile Sheet exists
    expect(document.querySelector('[data-mobile="true"]')).toBeNull()
  })
})
