import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export type RecipientLogByPath = {
  pathCategory: string; // EMAIL | SMS | VOICE | etc
  awareId?: string;
  pathName?: string;
  pathValue?: string;
  status?: string;
  attemptTime?: string;
  callResult?: string;
};

export type ResponseLogByPath = {
  // leaving open-ended; add fields if you need them
  [key: string]: any;
};

export type CommRecipientLog = {
  recipientId: string;
  fullName?: string;
  externalId?: string;
  recipientSources?: Array<{ type: string }>;
  status: string; // Attempted | Confirmed | ConfirmedLate | Duplicate | Unreachable | etc
  firstAttemptDate?: string;
  recipientLogByPath?: RecipientLogByPath[];
  responseLogByPath?: ResponseLogByPath[];
};

export type CommRecipientLogsParams = {
  commId: string;
  statuses?: string[]; // e.g. ['Confirmed','ConfirmedLate','Attempted','Duplicate','Unreachable']
  pageSize?: number; // default 200
  pageNumber?: number; // default 1
};

type Options = {
  enabled?: boolean;
  token: any;
};

function buildStatusParam(statuses?: string[]) {
  if (!statuses || statuses.length === 0) return null;
  // API expects comma-separated, no spaces
  return statuses.join(',');
}

async function fetchCommRecipientLogs(params: { req: CommRecipientLogsParams; tokenResponse: any }): Promise<CommRecipientLog[]> {
  const { req, tokenResponse } = params;
  const idToken = tokenResponse?.data?.id_token;

  if (!idToken) throw new Error('Missing auth token');

  const statusParam = buildStatusParam(req.statuses);

  const url = new URL(`https://api.everbridge.net/managerapps/communications/v1/${encodeURIComponent(req.commId)}/recipient-logs`);

  if (statusParam) url.searchParams.set('status', statusParam);
  url.searchParams.set('pageSize', String(req.pageSize ?? 200));
  url.searchParams.set('pageNumber', String(req.pageNumber ?? 1));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${idToken}`,
      'x-requested-with': 'XMLHttpRequest',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err: any = new Error(`Recipient logs request failed (${res.status})`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  return res.json();
}

export function useCommRecipientLogs(req: CommRecipientLogsParams | null, opts: Options) {
  const enabled = !!req?.commId && (opts.enabled ?? true);

  const statusKey = (req?.statuses ?? []).slice().sort().join(','); // stable key
  const pageSize = req?.pageSize ?? 200;
  const pageNumber = req?.pageNumber ?? 1;

  const query = useQuery({
    queryKey: ['comm', req?.commId, 'recipient-logs', statusKey, pageSize, pageNumber],
    enabled,
    queryFn: () => fetchCommRecipientLogs({ req: req!, tokenResponse: opts.token }),
    staleTime: 15_000,
    retry: 0,
  });

  const rows = query.data ?? [];
  const hasPrevPage = pageNumber > 1;
  const hasNextPage = rows.length === pageSize;

  // Convenience: group recipients by status for UI sections
  const byStatus = useMemo(() => {
    const map: Record<string, CommRecipientLog[]> = {};
    for (const r of rows) {
      const key = r.status ?? 'Unknown';
      (map[key] ??= []).push(r);
    }
    // optional: sort names inside each group
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => String(a.fullName ?? '').localeCompare(String(b.fullName ?? '')));
    }
    return map;
  }, [rows]);

  return {
    query,
    rows,
    byStatus,
    pageNumber,
    pageSize,
    hasPrevPage,
    hasNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
  };
}
