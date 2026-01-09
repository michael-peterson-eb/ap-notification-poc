import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export type CommConfirmationStatus = {
  totalCount: number;
  confirmedCount: number;
  pendingConfirmedCount: number;
  unreachableCount: number;
  confirmedLateCount: number;
};

type Options = {
  enabled?: boolean;
  token: any; // same token shape you pass everywhere else
};

async function fetchCommConfirmationStatus(params: { commId: string; tokenResponse: any }): Promise<CommConfirmationStatus> {
  const { commId, tokenResponse } = params;
  const idToken = tokenResponse?.data?.id_token;

  if (!idToken) throw new Error('Missing auth token');

  const res = await fetch(`https://api.everbridge.net/managerapps/communications/v1/${encodeURIComponent(commId)}/summary/confirmation-status`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${idToken}`,
      'x-requested-with': 'XMLHttpRequest',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err: any = new Error(`Confirmation status request failed (${res.status})`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  return res.json();
}

export function useCommConfirmationStatus(commId: string | null, opts: Options) {
  const enabled = !!commId && (opts.enabled ?? true);

  const query = useQuery({
    queryKey: ['comm', commId, 'summary', 'confirmation-status'],
    enabled,
    queryFn: () => fetchCommConfirmationStatus({ commId: commId!, tokenResponse: opts.token }),
    staleTime: 15_000,
    retry: 0,
  });

  // Chart-friendly data (pie/donut): labels + values
  const pieData = useMemo(() => {
    const d = query.data;
    if (!d) return [];

    return [
      { name: 'Confirmed', value: 3, fill: '#16a34a' }, // green
      { name: 'Not Confirmed', value: 8, fill: '#f59e0b' }, // amber
      { name: 'Unreachable', value: 2, fill: '#ef4444' }, // red
      { name: 'Confirmed Late', value: 1, fill: '#3b82f6' }, // blue
    ].filter((x) => x.value > 0 || d.totalCount === 0);
  }, [query.data]);
  return {
    query,
    data: query.data ?? null,
    pieData,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
  };
}
