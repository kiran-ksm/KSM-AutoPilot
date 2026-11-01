import { useState, useEffect, useCallback } from 'react';
import { leadsService } from '@/services/leadsService';
import type { Lead, LeadListParams, LeadListResponse } from '@/services/types';

interface UseLeadsResult {
  leads: Lead[];
  total: number;
  nextToken?: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
}

/**
 * Hook to fetch and paginate leads.
 * Components should use this instead of calling leadsService directly.
 */
export function useLeads(params?: LeadListParams): UseLeadsResult {
  const [data, setData] = useState<LeadListResponse>({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setPage] = useState<string | undefined>(undefined);

  const fetch = useCallback(
    async (nextToken?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await leadsService.list({ ...params, nextToken });
        setData((prev) =>
          nextToken
            ? { ...result, items: [...prev.items, ...result.items] }
            : result
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load leads');
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params?.status, params?.assignedTo, params?.limit]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refetch = () => {
    setPage(undefined);
    fetch();
  };

  const loadMore = () => {
    if (data.nextToken) {
      setPage(data.nextToken);
      fetch(data.nextToken);
    }
  };

  return {
    leads: data.items,
    total: data.total,
    nextToken: data.nextToken,
    isLoading,
    error,
    refetch,
    loadMore,
  };
}
