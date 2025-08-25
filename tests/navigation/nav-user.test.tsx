import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarProvider } from '@/components/ui/sidebar'
import { NavUser } from '@/components/navigation/nav-user'
import type { ElementType } from 'react'

// Mock next/link to a plain anchor for tests
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href as string} {...props}>
      {children}
    </a>
  ),
}))

const DummyIcon: ElementType = (props: any) => <svg data-testid="icon" {...props} />


describe('NavUser', () => {
  it('forwards props to SidebarGroup and sets active link, calls onNavigate', async () => {
    const onNavigate = vi.fn()

    render(
      <SidebarProvider>
        <NavUser
          data-testid="nav-user-group"
          className="custom-class"
          items={[
            { title: 'Perfil', url: '/perfil', icon: DummyIcon },
            { title: 'Ajustes', url: '/ajustes', icon: DummyIcon },
          ]}
          pathname="/perfil"
          onNavigate={onNavigate}
        />
      </SidebarProvider>
    )

    const group = screen.getByTestId('nav-user-group')
    expect(group).toBeInTheDocument()
    expect(group).toHaveClass('custom-class')

    const activeLink = screen.getByRole('link', { name: 'Perfil' })
    expect(activeLink).toHaveAttribute('aria-current', 'page')

    const inactiveLink = screen.getByRole('link', { name: 'Ajustes' })
    expect(inactiveLink).not.toHaveAttribute('aria-current')

    await userEvent.click(activeLink)
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
