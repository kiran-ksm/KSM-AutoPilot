import apiClient from './apiClient';
import { env } from '@/config/env';
import { useDemoMode } from '@/contexts/DemoModeContext';
import type { SendSmsRequest, SendEmailRequest, MessageResponse } from './types';

/**
 * Messaging service.
 *
 * SMS: when DEMO_MODE=true, intercepted in the frontend and logged to Demo Console.
 *
 * Email: ALWAYS calls the API regardless of DEMO_MODE. The backend decides whether to
 * send via SES (EMAIL_DEMO_MODE=false) or simulate (EMAIL_DEMO_MODE=true). This allows
 * email to be enabled per-environment without a frontend rebuild.
 *
 * Usage:
 *   const messaging = useMessagingService();
 *   await messaging.sendEmail({ leadId, subject, body });
 */
export function useMessagingService() {
  const { isDemoMode, logEvent } = useDemoMode();

  const sendSms = async (data: SendSmsRequest): Promise<MessageResponse> => {
    if (isDemoMode) {
      logEvent({
        channel: 'SMS',
        type: 'OUTBOUND_SMS',
        leadId: data.leadId,
        destination: data.leadId,
        message: data.message,
        consentDecision: 'UNKNOWN',
        payload: { leadId: data.leadId, message: data.message },
      });
      return { messageId: crypto.randomUUID(), status: 'DEMO_LOGGED' };
    }
    const response = await apiClient.post<MessageResponse>('/messaging/sms', data);
    return response.data;
  };

  /**
   * Always calls the backend API — never short-circuits on DEMO_MODE.
   * The Lambda uses EMAIL_DEMO_MODE to decide real vs simulated send.
   */
  const sendEmail = async (data: SendEmailRequest): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/messaging/email', data);
    return response.data;
  };

  return { sendSms, sendEmail, isDemoMode };
}

// Non-hook variant for cases where context isn't available (e.g., service workers)
export const messagingServiceDirect = {
  async sendSms(data: SendSmsRequest): Promise<MessageResponse> {
    if (env.demoMode) {
      console.info('[DEMO_MODE] SMS payload:', data);
      return { messageId: crypto.randomUUID(), status: 'DEMO_LOGGED' };
    }
    const response = await apiClient.post<MessageResponse>('/messaging/sms', data);
    return response.data;
  },

  async sendEmail(data: SendEmailRequest): Promise<MessageResponse> {
    if (env.demoMode) {
      console.info('[DEMO_MODE] Email payload:', data);
      return { messageId: crypto.randomUUID(), status: 'DEMO_LOGGED' };
    }
    const response = await apiClient.post<MessageResponse>('/messaging/email', data);
    return response.data;
  },
};
