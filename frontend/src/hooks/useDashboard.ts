import { useState, useEffect } from 'react';
import { dashboardService } from '@/services/dashboardService';
import { leadsService } from '@/services/leadsService';
import type {
  DashboardStats,
  LeadsByStatusItem,
  LeadsBySourceItem,
  ActivityItem,
  FollowUpItem,
  SalespersonPerformance,
  Lead,
} from '@/services/types';

interface UseDashboardResult {
  stats: DashboardStats | null;
  leadsByStatus: LeadsByStatusItem[];
  leadsBySource: LeadsBySourceItem[];
  recentActivity: ActivityItem[];
  followUpQueue: FollowUpItem[];
  salespersonPerformance: SalespersonPerformance[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function _formatVehicle(vi?: string | { year?: number; make?: string; model?: string; trim?: string }): string {
  if (!vi) return 'Not specified';
  if (typeof vi === 'string') return vi;
  return [vi.year, vi.make, vi.model, vi.trim].filter(Boolean).join(' ') || 'Not specified';
}

function computePriority(lead: Lead): 'HOT' | 'WARM' | 'COLD' {
  if (lead.aiScore && lead.aiScore >= 80) return 'HOT';
  if (lead.aiScore && lead.aiScore >= 60) return 'WARM';
  if (lead.status === 'NEW' && lead.vehicleInterest) return 'WARM';
  return 'COLD';
}

export function useDashboard(): UseDashboardResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leadsByStatus, setLeadsByStatus] = useState<LeadsByStatusItem[]>([]);
  const [leadsBySource, setLeadsBySource] = useState<LeadsBySourceItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [followUpQueue, setFollowUpQueue] = useState<FollowUpItem[]>([]);
  const [salespersonPerformance, setSalespersonPerformance] = useState<SalespersonPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [statsData, statusData, activityData, leadsData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getLeadsByStatus(),
          dashboardService.getRecentActivity(30),
          leadsService.list({ limit: 100 }),
        ]);

        if (cancelled) return;

        setStats(statsData);
        setLeadsByStatus(statusData);
        setRecentActivity(activityData);

        // Compute leads by source from lead list
        const sourceMap = new Map<string, number>();
        for (const lead of leadsData.items) {
          const src = lead.source || 'OTHER';
          sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
        }
        setLeadsBySource(
          Array.from(sourceMap.entries()).map(([source, count]) => ({
            source: source as LeadsBySourceItem['source'],
            count,
          }))
        );

        // Compute follow-up queue: leads in NEW/CONTACTED/QUALIFIED with next follow-up
        const now = new Date();
        const queue: FollowUpItem[] = leadsData.items
          .filter((l) => ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NURTURE'].includes(l.status))
          .map((l) => {
            const next = l.nextFollowUp || l.updatedAt;
            const nextDate = new Date(next);
            return {
              leadId: l.leadId,
              leadName: `${l.firstName} ${l.lastName}`,
              vehicleInterest: _formatVehicle(l.vehicleInterest),
              priority: computePriority(l),
              nextFollowUp: next,
              overdue: nextDate < now && l.status !== 'NEW',
            };
          })
          .sort((a, b) => {
            // Overdue first, then by priority (HOT > WARM > COLD), then by date
            if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
            const priOrder = { HOT: 0, WARM: 1, COLD: 2 };
            if (priOrder[a.priority] !== priOrder[b.priority])
              return priOrder[a.priority] - priOrder[b.priority];
            return new Date(a.nextFollowUp).getTime() - new Date(b.nextFollowUp).getTime();
          })
          .slice(0, 10);
        setFollowUpQueue(queue);

        // Compute salesperson performance
        const perfMap = new Map<string, { total: number; contacted: number; qualified: number; won: number }>();
        for (const lead of leadsData.items) {
          const sp = lead.assignedTo || 'Unassigned';
          const entry = perfMap.get(sp) ?? { total: 0, contacted: 0, qualified: 0, won: 0 };
          entry.total++;
          if (['CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'NURTURE'].includes(lead.status)) entry.contacted++;
          if (['QUALIFIED', 'PROPOSAL', 'WON'].includes(lead.status)) entry.qualified++;
          if (lead.status === 'WON') entry.won++;
          perfMap.set(sp, entry);
        }
        setSalespersonPerformance(
          Array.from(perfMap.entries())
            .map(([salesperson, counts]) => ({
              salesperson,
              totalLeads: counts.total,
              contacted: counts.contacted,
              qualified: counts.qualified,
              won: counts.won,
              conversionRate: counts.total > 0 ? Math.round((counts.won / counts.total) * 1000) / 10 : 0,
            }))
            .sort((a, b) => b.totalLeads - a.totalLeads)
            .slice(0, 5)
        );

        // Enhance stats with hot leads, warm leads, awaiting response, follow-ups
        const hotLeads = leadsData.items.filter(
          (l) => l.aiScore !== undefined && l.aiScore >= 80
        ).length;
        const warmLeads = leadsData.items.filter(
          (l) => l.aiScore !== undefined && l.aiScore >= 60 && l.aiScore < 80
        ).length;
        const newLeads = leadsData.items.filter(
          (l) => l.status === 'NEW'
        ).length;
        const awaitingResponse = leadsData.items.filter(
          (l) => ['NEW', 'CONTACTED'].includes(l.status)
        ).length;

        // Follow-ups due today / overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const followUpsDueToday = leadsData.items.filter((l) => {
          if (!l.nextFollowUp) return false;
          const d = new Date(l.nextFollowUp);
          return d >= today && d <= endOfToday;
        }).length;

        const followUpsOverdue = leadsData.items.filter((l) => {
          if (!l.nextFollowUp) return false;
          return new Date(l.nextFollowUp) < today && ['NEW', 'CONTACTED', 'QUALIFIED', 'NURTURE'].includes(l.status);
        }).length;

        setStats((prev) =>
          prev
            ? {
                ...prev,
                hotLeads,
                warmLeads,
                newLeads,
                awaitingResponse,
                followUpsDueToday,
                followUpsOverdue,
                appointmentsRequested: 0,
                appointmentsConfirmed: 0,
              }
            : prev
        );
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tick]);

  return {
    stats,
    leadsByStatus,
    leadsBySource,
    recentActivity,
    followUpQueue,
    salespersonPerformance,
    isLoading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
