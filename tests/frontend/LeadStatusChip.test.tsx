/**
 * Tests for LeadStatusChip component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { LeadStatusChip } from '@/components/leads/LeadStatusChip';
import { theme } from '@/theme';
import type { LeadStatus } from '@/services/types';

const renderChip = (status: LeadStatus) =>
  render(
    <ThemeProvider theme={theme}>
      <LeadStatusChip status={status} />
    </ThemeProvider>
  );

describe('LeadStatusChip', () => {
  const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST', 'NURTURE'];

  it.each(statuses)('renders "%s" status without crashing', (status) => {
    renderChip(status);
    expect(screen.getByText(new RegExp(status.charAt(0) + status.slice(1).toLowerCase(), 'i'))).toBeInTheDocument();
  });
});
