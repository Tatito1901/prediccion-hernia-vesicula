import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarProvider } from '@/components/ui/sidebar'
import { NavMain } from '@/components/navigation/nav-main'
import type { ElementType } from 'react'

// Mock next/link to a plain anchor for tests
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href as string} {...props}>
      {children}
    </a>
  ),
}))

// Provide matchMedia for useIsMobile used inside Sidebar components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

const DummyIcon: ElementType = (props: any) => <svg data-testid="icon" {...props} />

describe('NavMain', () => {
  it('forwards props to SidebarGroup and sets active link', async () => {
    const onNavigate = vi.fn()

    render(
      <SidebarProvider>
        <NavMain
          data-testid="group"
          className="custom-class"
          items={[
            { title: 'Dashboard', url: '/dashboard', icon: DummyIcon },
            { title: 'Pacientes', url: '/pacientes', icon: DummyIcon },
          ]}
          pathname="/dashboard"
          onNavigate={onNavigate}
        />
      </SidebarProvider>
    )

    const group = screen.getByTestId('group')
    expect(group).toBeInTheDocument()
    expect(group).toHaveClass('custom-class')

    const activeLink = screen.getByRole('link', { name: 'Dashboard' })
    expect(activeLink).toHaveAttribute('aria-current', 'page')

    const inactiveLink = screen.getByRole('link', { name: 'Pacientes' })
    expect(inactiveLink).not.toHaveAttribute('aria-current')

    await userEvent.click(activeLink)
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
