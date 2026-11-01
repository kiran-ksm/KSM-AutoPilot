/**
 * Tests for DemoConsolePage — event console shown in DEMO_MODE.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { DemoConsolePage } from '@/pages/DemoConsolePage';
import { DemoModeContext, DemoEvent } from '@/contexts/DemoModeContext';
import { theme } from '@/theme';

const renderWithContext = (
  isDemoMode: boolean,
  events: DemoEvent[] = [],
  clearEvents = vi.fn()
) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <DemoModeContext.Provider value={{ isDemoMode, events, logEvent: vi.fn(), clearEvents }}>
          <DemoConsolePage />
        </DemoModeContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  );

describe('DemoConsolePage', () => {
  it('shows info alert when demo mode is off', () => {
    renderWithContext(false);
    expect(screen.getByText(/VITE_DEMO_MODE/i)).toBeInTheDocument();
  });

  it('shows demo warning when demo mode is on', () => {
    renderWithContext(true);
    expect(screen.getByText(/DEMO MODE active/i)).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    renderWithContext(true, []);
    expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
  });

  it('renders event rows in the table', () => {
    const events: DemoEvent[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'SMS',
        recipient: 'lead-001',
        payload: { message: 'Hello!' },
      },
    ];
    renderWithContext(true, events);
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('lead-001')).toBeInTheDocument();
  });

  it('calls clearEvents when Clear button is clicked', () => {
    const clear = vi.fn();
    const events: DemoEvent[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'EMAIL',
        recipient: 'x',
        payload: {},
      },
    ];
    renderWithContext(true, events, clear);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(clear).toHaveBeenCalledOnce();
  });
});
