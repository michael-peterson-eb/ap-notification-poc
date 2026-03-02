import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';

export type Comm = {
  id: string;
  title?: string;
  eventType?: string;
  status?: string;
  createdDate?: number;
  lastModifiedDate?: number;
  sent?: string;
  [k: string]: any;
};

const COMMS_BASE = 'https://api.everbridge.net/managerapps/communications/v1/';

function toMillis(iso?: string) {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : undefined;
}

function normalizeComm(raw: any): Comm {
  return {
    id: raw.commId ?? raw.id,
    title: raw.title ?? raw.name,
    eventType: raw.eventType,
    status: raw.status,
    createdDate: toMillis(raw.created),
    lastModifiedDate: toMillis(raw.update ?? raw.updated),
    sent: raw.sent,
    ...raw,
  };
}

function cleanCommId(commId: string) {
  return commId.trim().replace(/^\/+/, '');
}

async function fetchCommById(params: { idToken: string; commId: string }) {
  const commId = cleanCommId(params.commId);
  const url = `${COMMS_BASE}${encodeURIComponent(commId)}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
  });

  const text = await resp.text();
  const body = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { rawText: text };
        }
      })()
    : {};

  if (!resp.ok) {
    throw new Error(JSON.stringify({ commId, url, status: resp.status, body }));
  }

  return normalizeComm(body);
}

export type UseCommsByIdsUnifiedResult = {
  rows: Comm[];
  totalCount: number;
  loadedCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  refetch: () => Promise<any>;
  isLoading: boolean;
  isFetching: boolean;
  error: any;
};

type Options = {
  enabled?: boolean;
  token: any;
  pageSize?: number;
  resetKey?: string | number;
};

export function useCommsByIds(commIds: Array<string | number>, opts: Options): UseCommsByIdsUnifiedResult {
  const pageSize = opts.pageSize ?? 10;
  const idToken = opts.token?.data?.id_token;
  const enabled = (opts.enabled ?? true) && !!idToken;

  const ids = useMemo(() => {
    return Array.from(
      new Set(
        (commIds ?? [])
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  }, [commIds]);

  const totalCount = ids.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const [page, setPage] = useState(1);
  const [resetNonce, setResetNonce] = useState(0);

  useEffect(() => {
    setPage(1);
    setResetNonce((n) => n + 1);
  }, [pageSize, opts.resetKey, totalCount]);

  const visibleIds = useMemo(() => {
    const end = Math.min(totalCount, page * pageSize);
    return ids.slice(0, end);
  }, [ids, page, pageSize, totalCount]);

  const queries = useQueries({
    queries: visibleIds.map((commId) => ({
      queryKey: ['comms:byId', commId, resetNonce],
      enabled: enabled && visibleIds.length > 0,
      queryFn: () => fetchCommById({ idToken, commId }),
      retry: 0,
    })),
  });

  const rows = useMemo(() => {
    const list = queries.map((q) => q.data).filter(Boolean) as Comm[];

    // Sort newest->oldest by sent (preferred), else createdDate
    return list.sort((a, b) => {
      const aT = toMillis(a.sent) ?? a.createdDate ?? -Infinity;
      const bT = toMillis(b.sent) ?? b.createdDate ?? -Infinity;
      return bT - aT;
    });
  }, [queries]);

  const loadedCount = rows.length;
  const hasMore = page < totalPages;

  const firstError = opts.token.error ?? queries.find((q) => q.error)?.error ?? null;

  const refetch = async () => {
    const ps = queries.map((q) => ((q as any).refetch ? (q as any).refetch() : Promise.resolve(null)));
    return Promise.all(ps);
  };

  return {
    rows,
    totalCount,
    loadedCount,
    page,
    totalPages,
    pageSize,
    hasMore,
    loadMore: () => setPage((p) => Math.min(totalPages, p + 1)),
    reset: () => {
      setPage(1);
      setResetNonce((n) => n + 1);
    },
    refetch,
    isLoading: opts.token.isLoading || queries.some((q) => q.isLoading),
    isFetching: queries.some((q) => q.isFetching),
    error: firstError,
  };
}
