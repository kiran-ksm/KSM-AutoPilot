import apiClient from './apiClient';
import type { DashboardStats, LeadsByStatusItem, ActivityItem } from './types';

export const dashboardService = {
  /** Summary KPI cards for the dashboard. */
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/dashboard/summary');
    return response.data;
  },

  /** Lead counts grouped by status — used for bar/pie charts. */
  async getLeadsByStatus(): Promise<LeadsByStatusItem[]> {
    const response = await apiClient.get<LeadsByStatusItem[]>('/dashboard/leads-by-status');
    return response.data;
  },

  /** Recent activity feed shown on the dashboard. */
  async getRecentActivity(limit = 20): Promise<ActivityItem[]> {
    const response = await apiClient.get<ActivityItem[]>('/dashboard/activity', {
      params: { limit },
    });
    return response.data;
  },
};
