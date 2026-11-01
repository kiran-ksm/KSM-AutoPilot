import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { env } from '@/config/env';

/**
 * Per spec §9.1, every simulated event must contain:
 *   - tenant/dealership
 *   - lead ID
 *   - channel
 *   - destination (masked for display)
 *   - template/type
 *   - message preview
 *   - consent decision
 *   - timestamp
 *   - status: SIMULATED
 *   - correlation ID
 */
export type DemoEventChannel = 'SMS' | 'EMAIL' | 'AI' | 'APPOINTMENT' | 'ASSIGNMENT' | 'SYSTEM';

export interface DemoEvent {
  id: string;                       // correlation ID (§9.1)
  timestamp: string;                // ISO UTC
  channel: DemoEventChannel;        // §9.1: channel
  type: string;                     // template/type
  tenantId?: string;                // §9.1: tenant/dealership
  dealershipId?: string;
  leadId?: string;                  // §9.1: lead ID
  destinationMasked: string;        // §9.1: masked destination e.g. "***4321" or "j***@g***.com"
  subject?: string;                 // for EMAIL
  messagePreview?: string;          // §9.1: message preview (first 120 chars)
  consentDecision: 'GRANTED' | 'UNKNOWN' | 'NOT_REQUIRED';  // §9.1: consent decision
  status: 'SIMULATED';              // §9.1: always SIMULATED in demo mode
  payload: Record<string, unknown>; // full (unmasked) payload for developer inspection
}

export interface LogEventInput {
  channel: DemoEventChannel;
  type: string;
  tenantId?: string;
  dealershipId?: string;
  leadId?: string;
  destination: string;              // raw — will be masked before storage
  subject?: string;
  message?: string;
  consentDecision?: DemoEvent['consentDecision'];
  payload?: Record<string, unknown>;
}

interface DemoModeContextValue {
  isDemoMode: boolean;
  events: DemoEvent[];
  logEvent: (input: LogEventInput) => void;
  clearEvents: () => void;
}

// ── Masking helpers ──────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `(***) ***-${digits.slice(-4)}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const [domName] = domain.split('.');
  const ext = domain.includes('.') ? domain.slice(domain.lastIndexOf('.')) : '';
  return `${local[0]}***@${domName[0]}***.${ext || 'com'}`;
}

function maskDestination(dest: string): string {
  if (!dest) return '***';
  if (dest.includes('@')) return maskEmail(dest);
  const digits = dest.replace(/\D/g, '');
  if (digits.length >= 7) return maskPhone(dest);
  return dest[0] + '***';
}

// ── Context ──────────────────────────────────────────────────────────────────

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

export const DemoModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<DemoEvent[]>([]);

  const logEvent = useCallback((input: LogEventInput) => {
    const event: DemoEvent = {
      id:               crypto.randomUUID(),
      timestamp:        new Date().toISOString(),
      channel:          input.channel,
      type:             input.type,
      tenantId:         input.tenantId ?? env.appEnv,
      dealershipId:     input.dealershipId,
      leadId:           input.leadId,
      destinationMasked: maskDestination(input.destination),
      subject:          input.subject,
      messagePreview:   input.message?.slice(0, 120),
      consentDecision:  input.consentDecision ?? 'UNKNOWN',
      status:           'SIMULATED',
      payload:          input.payload ?? {},
    };
    setEvents((prev) => [event, ...prev]);
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  return (
    <DemoModeContext.Provider value={{ isDemoMode: env.demoMode, events, logEvent, clearEvents }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = (): DemoModeContextValue => {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error('useDemoMode must be used within DemoModeProvider');
  return ctx;
};
