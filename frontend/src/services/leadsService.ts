import apiClient from './apiClient';
import type {
  Lead,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadListResponse,
  LeadListParams,
} from './types';

/**
 * Lead API service.
 * All methods talk to API Gateway REST endpoints.
 * No AWS credentials or backend secrets are used here.
 */
export const leadsService = {
  /**
   * Fetch a paginated list of leads for the authenticated tenant.
   * Tenant authorisation is enforced server-side — filtering here is display-only.
   */
  async list(params?: LeadListParams): Promise<LeadListResponse> {
    const response = await apiClient.get<LeadListResponse>('/leads', { params });
    return response.data;
  },

  /** Fetch a single lead by ID. */
  async get(leadId: string): Promise<Lead> {
    const response = await apiClient.get<Lead>(`/leads/${leadId}`);
    return response.data;
  },

  /**
   * Submit a new lead (public endpoint — no auth token required).
   * Used by the public lead-capture form.
   */
  async create(data: CreateLeadRequest): Promise<Lead> {
    const response = await apiClient.post<Lead>('/public/leads', data);
    return response.data;
  },

  /** Update status, assignment, or notes on an existing lead. */
  async update(leadId: string, data: UpdateLeadRequest): Promise<Lead> {
    const response = await apiClient.patch<Lead>(`/leads/${leadId}`, data);
    return response.data;
  },

  /** Soft-delete a lead (sets status to a deleted marker server-side). */
  async remove(leadId: string): Promise<void> {
    await apiClient.delete(`/leads/${leadId}`);
  },
};
