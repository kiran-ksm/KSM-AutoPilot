import apiClient from './apiClient';
import { env } from '@/config/env';
import type {
  Appointment,
  CreateAppointmentRequest,
  AppointmentStatus,
} from './types';

/**
 * Appointment service.
 *
 * In DEMO_MODE, returns synthetic data from an in-memory store.
 * When backend appointment endpoints are deployed, this falls through to
 * real API Gateway calls.
 */

const DEMO_APPOINTMENTS: Appointment[] = [
  {
    appointmentId: 'appt-001',
    leadId: 'lead-demo-001',
    tenantId: 'tenant-dev-001',
    dealershipId: 'dealership-mercedes',
    type: 'TEST_DRIVE',
    status: 'CONFIRMED',
    requestedDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    timezone: 'America/New_York',
    location: 'Ray Catena Mercedes-Benz of Edison',
    notes: 'Customer interested in C-Class 4MATIC test drive',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 36000000).toISOString(),
    confirmedBy: 'admin@ksmautopilot.dev',
    confirmedAt: new Date(Date.now() - 36000000).toISOString(),
  },
  {
    appointmentId: 'appt-002',
    leadId: 'lead-demo-002',
    tenantId: 'tenant-dev-001',
    dealershipId: 'dealership-toyota',
    type: 'VEHICLE_VIEWING',
    status: 'REQUESTED',
    requestedDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    timezone: 'America/New_York',
    location: 'Tri-State Toyota',
    notes: 'Wants to see RAV4 Hybrid in Silver',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    appointmentId: 'appt-003',
    leadId: 'lead-demo-003',
    tenantId: 'tenant-dev-001',
    dealershipId: 'dealership-lexus',
    type: 'TEST_DRIVE',
    status: 'PENDING_CONFIRMATION',
    requestedDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    timezone: 'America/New_York',
    location: 'Premier Lexus',
    notes: 'LX 600 test drive — customer prefers afternoon',
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    appointmentId: 'appt-004',
    leadId: 'lead-demo-004',
    tenantId: 'tenant-dev-001',
    dealershipId: 'dealership-mercedes',
    type: 'NEGOTIATION',
    status: 'COMPLETED',
    requestedDate: new Date(Date.now() - 86400000).toISOString(),
    timezone: 'America/New_York',
    location: 'Ray Catena Mercedes-Benz of Edison',
    notes: 'Price negotiation on GLE 450 — customer accepted offer',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    confirmedBy: 'admin@ksmautopilot.dev',
    confirmedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    appointmentId: 'appt-005',
    leadId: 'lead-demo-005',
    tenantId: 'tenant-dev-001',
    dealershipId: 'dealership-toyota',
    type: 'VEHICLE_VIEWING',
    status: 'CANCELLED',
    requestedDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    timezone: 'America/New_York',
    location: 'Tri-State Toyota',
    notes: 'Customer cancelled — purchased elsewhere',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const appointmentService = {
  async list(filters?: { status?: AppointmentStatus; dealershipId?: string }): Promise<Appointment[]> {
    if (env.demoMode) {
      await new Promise((r) => setTimeout(r, 300));
      let result = DEMO_APPOINTMENTS;
      if (filters?.status) result = result.filter((a) => a.status === filters.status);
      if (filters?.dealershipId) result = result.filter((a) => a.dealershipId === filters.dealershipId);
      return result.sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());
    }
    const response = await apiClient.get<Appointment[]>('/appointments', { params: filters });
    return response.data;
  },

  async create(data: CreateAppointmentRequest): Promise<Appointment> {
    if (env.demoMode) {
      await new Promise((r) => setTimeout(r, 400));
      return {
        appointmentId: `appt-${Date.now()}`,
        leadId: data.leadId,
        tenantId: 'tenant-dev-001',
        type: data.type,
        status: 'REQUESTED',
        requestedDate: data.requestedDate,
        timezone: data.timezone,
        location: data.location,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    const response = await apiClient.post<Appointment>('/appointments', data);
    return response.data;
  },

  async updateStatus(appointmentId: string, status: AppointmentStatus): Promise<Appointment> {
    if (env.demoMode) {
      await new Promise((r) => setTimeout(r, 300));
      const appt = DEMO_APPOINTMENTS.find((a) => a.appointmentId === appointmentId);
      if (!appt) throw new Error('Appointment not found');
      appt.status = status;
      appt.updatedAt = new Date().toISOString();
      if (status === 'CONFIRMED') {
        appt.confirmedBy = 'admin@ksmautopilot.dev';
        appt.confirmedAt = new Date().toISOString();
      }
      return appt;
    }
    const response = await apiClient.patch<Appointment>(`/appointments/${appointmentId}`, { status });
    return response.data;
  },
};
