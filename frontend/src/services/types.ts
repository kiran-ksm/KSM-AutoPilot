// ─── Shared API types ────────────────────────────────────────────────────────

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'APPOINTMENT_REQUESTED'
  | 'APPOINTMENT_CONFIRMED'
  | 'TEST_DRIVE_COMPLETED'
  | 'PROPOSAL'
  | 'WON'
  | 'LOST'
  | 'NURTURE';

export type LeadSource = 'WEBSITE' | 'WALK_IN' | 'REFERRAL' | 'SOCIAL' | 'OTHER';

export type LeadPriority = 'HOT' | 'WARM' | 'COLD' | 'UNCLASSIFIED';

export type InquiryType =
  | 'VEHICLE_INFORMATION'
  | 'TEST_DRIVE'
  | 'AVAILABILITY'
  | 'TRADE_IN'
  | 'FINANCING'
  | 'GENERAL_QUESTION';

export type ContactMethod = 'EMAIL' | 'PHONE' | 'SMS' | 'ANY';

export interface ChannelConsent {
  email: boolean;
  sms: boolean;
  phone: boolean;
}

export interface VehicleInterest {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  stockNumber?: string;
  vehicleDetailUrl?: string;
  vehicleType?: string;  // free text fallback
}

export interface LeadAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPageUrl?: string;
  referrerUrl?: string;
}

export interface Lead {
  leadId: string;
  tenantId: string;
  dealershipId?: string;
  dealershipName?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  inquiryType?: InquiryType;
  vehicleInterest?: VehicleInterest;
  status: LeadStatus;
  source: LeadSource;
  priority?: LeadPriority;
  aiScore?: number;
  aiReasoning?: string;
  aiNextAction?: string;
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  message?: string;              // customer's original message
  preferredContactMethod?: ContactMethod;
  preferredContactTime?: string;
  consent?: ChannelConsent;
  attribution?: LeadAttribution;
  lastActivity?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  inquiryType?: InquiryType;
  vehicleInterest?: VehicleInterest;
  message?: string;
  preferredContactMethod?: ContactMethod;
  preferredContactTime?: string;
  consent?: ChannelConsent;
  dealershipId?: string;
  source?: LeadSource;
  attribution?: LeadAttribution;
  notes?: string;
}

export interface UpdateLeadRequest {
  status?: LeadStatus;
  assignedTo?: string;
  notes?: string;
  vehicleInterest?: VehicleInterest;
  priority?: LeadPriority;
  nextFollowUp?: string;
}

export interface AssignLeadRequest {
  assignedTo: string;
}

export interface AddNoteRequest {
  note: string;
}

export interface LeadListResponse {
  items: Lead[];
  nextToken?: string;
  total: number;
}

export interface LeadListParams {
  status?: LeadStatus;
  assignedTo?: string;
  dealershipId?: string;
  inquiryType?: InquiryType;
  nextToken?: string;
  limit?: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  hotLeads: number;
  warmLeads: number;
  awaitingResponse: number;
  followUpsDueToday: number;
  followUpsOverdue: number;
  appointmentsRequested: number;
  appointmentsConfirmed: number;
  conversionRate: number;
  avgResponseMinutes: number;
  wonThisMonth: number;
}

export interface LeadsByStatusItem {
  status: LeadStatus;
  count: number;
}

export interface LeadsBySourceItem {
  source: LeadSource;
  count: number;
}

export interface ActivityItem {
  activityId: string;
  leadId: string;
  leadName: string;
  type: 'NOTE' | 'SMS' | 'EMAIL' | 'STATUS_CHANGE' | 'SCORE' | 'ASSIGNMENT' | 'APPOINTMENT';
  description: string;
  createdAt: string;
}

export interface FollowUpItem {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  priority: LeadPriority;
  nextFollowUp: string;
  overdue: boolean;
}

export interface SalespersonPerformance {
  salesperson: string;
  totalLeads: number;
  contacted: number;
  qualified: number;
  won: number;
  conversionRate: number;
}

// ─── Inventory ──────────────────────────────────────────────────────────────────

export interface InventoryVehicle {
  vehicleId: string;
  tenantId: string;
  dealershipId: string;
  dealershipName: string;
  vin: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  condition: 'NEW' | 'USED' | 'CERTIFIED';
  mileage?: number;
  price: number;
  currency: string;
  exteriorColor?: string;
  interiorColor?: string;
  imageUrl?: string;
  vehicleDetailUrl?: string;
  availabilityStatus: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'IN_TRANSIT';
  sourceSystem: string;
  sourceUpdatedAt: string;
  lastSyncedAt: string;
}

// ─── Appointments ──────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'REQUESTED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type AppointmentType = 'TEST_DRIVE' | 'VEHICLE_VIEWING' | 'NEGOTIATION' | 'DELIVERY';

export interface Appointment {
  appointmentId: string;
  leadId: string;
  tenantId: string;
  dealershipId?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  requestedDate: string;
  timezone: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface CreateAppointmentRequest {
  leadId: string;
  type: AppointmentType;
  requestedDate: string;
  timezone: string;
  location?: string;
  notes?: string;
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface SendSmsRequest {
  leadId: string;
  message: string;
}

export interface SendEmailRequest {
  leadId: string;
  subject: string;
  body: string;
}

export interface MessageResponse {
  messageId: string;
  status: 'SENT' | 'QUEUED' | 'DEMO_LOGGED';
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface ScoreLeadResponse {
  leadId: string;
  score: number;
  reasoning: string;
  nextAction?: string;
}

// ─── Dealerships ──────────────────────────────────────────────────────────────

export interface Dealership {
  dealershipId: string;
  tenantId: string;
  name: string;
  brand?: string;
  location: string;
  phone?: string;
}

// ─── Generic ───────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
}
