import React from 'react';
import { render, screen } from '@testing-library/react';
import Loading from '@/app/loading';

describe('Global route loading UI (app/loading.tsx)', () => {
  it('renders an accessible spinner and message', () => {
    render(<Loading />);

    // Message
    expect(screen.getByText('Cargando…')).toBeInTheDocument();

    // Spinner with role=status and label
    const spinner = screen.getByRole('status', { name: 'Cargando' });
    expect(spinner).toBeInTheDocument();
  });
});
