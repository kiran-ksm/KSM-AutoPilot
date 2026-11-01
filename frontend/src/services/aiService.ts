import apiClient from './apiClient';
import { env } from '@/config/env';
import type { ScoreLeadResponse } from './types';

/**
 * AI service — wraps Bedrock-backed Lambda endpoints.
 * Guardrails are enforced server-side; the frontend never calls Bedrock directly.
 */
export const aiService = {
  /**
   * Trigger AI lead scoring for a given lead.
   * Returns a 0–100 score and reasoning text from Bedrock (via API Gateway → Lambda).
   */
  async scoreLead(leadId: string): Promise<ScoreLeadResponse> {
    if (env.demoMode) {
      // Return synthetic score in demo mode — no Bedrock call
      await new Promise((r) => setTimeout(r, 800)); // simulate latency
      return {
        leadId,
        score: Math.floor(Math.random() * 40) + 60, // 60–100 for demo
        reasoning:
          'DEMO MODE: This score is simulated. ' +
          'In production, Amazon Bedrock evaluates vehicle interest, ' +
          'engagement history, and demographic signals.',
      };
    }
    const response = await apiClient.post<ScoreLeadResponse>(`/ai/score-lead/${leadId}`);
    return response.data;
  },
};
