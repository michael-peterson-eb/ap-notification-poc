import { useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

export type Comm = {
  commId: string;
  title?: string;
  eventType?: string;
  status?: string;
  createdDate?: number;
  lastModifiedDate?: number;
  [k: string]: any;
};

type CommsListResponse<T> = {
  data: T[];
  pages: {
    currentPage: number;
    pageSize: number;
    pageCount: number;
    totalPages: number;
    maxSize: number;
    totalCount: number;
  };
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
    ...raw,
  };
}

async function fetchCommsPage(params: { pageNumber: number; pageSize: number; idToken: string; filters?: Record<string, any> }) {
  const { pageNumber, pageSize, idToken, filters } = params;

  const qs = new URLSearchParams();
  qs.set('pageNumber', String(pageNumber));
  qs.set('pageSize', String(pageSize));

  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, String(v));
    }
  }

  const url = `${COMMS_BASE}?${qs.toString()}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const text = await resp.text();
  const json = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { raw: text };
        }
      })()
    : {};

  if (!resp.ok) throw new Error(JSON.stringify({ status: resp.status, ...json }));

  const typed = json as CommsListResponse<any>;

  return {
    ...typed,
    data: Array.isArray(typed.data) ? typed.data.map(normalizeComm) : [],
  } as CommsListResponse<Comm>;
}

export type UseCommsUnifiedResult = {
  rows: Comm[];
  totalCount: number;
  loadedCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  hasMore: boolean;
  loadMore: () => Promise<any> | void;
  reset: () => void;
  refetch: () => Promise<any>;
  isLoading: boolean;
  isFetching: boolean;
  error: any;
};

export function useComms(filters: Record<string, any> = {}, opts: { enabled?: boolean; token: any; pageSize?: number }): UseCommsUnifiedResult {
  const pageSize = opts.pageSize ?? 10;
  const enabled = (opts.enabled ?? true) && !!opts.token?.data?.id_token;

  // Internal reset trigger — bumps query key so infinite query drops pages immediately
  const [resetNonce, setResetNonce] = useState(0);

  const filtersKey = JSON.stringify(filters ?? {});

  const query = useInfiniteQuery({
    queryKey: ['comms:list', filtersKey, pageSize, resetNonce],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchCommsPage({
        pageNumber: Number(pageParam ?? 1),
        pageSize,
        idToken: opts.token.data.id_token,
        filters,
      }),
    getNextPageParam: (lastPage) => {
      const cur = lastPage?.pages?.currentPage ?? 1;
      const total = lastPage?.pages?.totalPages ?? 1;
      return cur < total ? cur + 1 : undefined;
    },
    retry: 0,
  });

  const pages = useMemo(() => query.data?.pages ?? [], [query.data]);
  const rows = useMemo(() => pages.flatMap((p) => p.data ?? []), [pages]);

  const last = pages[pages.length - 1];
  const totalPages = last?.pages?.totalPages ?? 1;
  const page = last?.pages?.currentPage ?? 1;
  const totalCount = last?.pages?.totalCount ?? 0;

  const hasMore = page < totalPages;

  return {
    rows,
    totalCount,
    loadedCount: rows.length,
    page,
    totalPages,
    pageSize,
    hasMore,
    loadMore: () => (hasMore ? query.fetchNextPage() : undefined),
    reset: () => setResetNonce((n) => n + 1),
    refetch: async () => {
      await query.refetch();
    },
    isLoading: opts.token.isLoading || query.isLoading,
    isFetching: query.isFetching,
    error: opts.token.error ?? query.error ?? null,
  };
}
