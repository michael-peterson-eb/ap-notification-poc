import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export type Comm = {
  id: string;
  title?: string;
  eventType?: string;
  status?: string;

  createdDate?: number;
  lastModifiedDate?: number;

  // any other fields
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
    // map API commId -> id (table expects id)
    id: raw.commId ?? raw.id,

    // keep common fields
    title: raw.title ?? raw.name,
    eventType: raw.eventType,
    status: raw.status,

    // map created/update -> createdDate/lastModifiedDate (ms)
    createdDate: toMillis(raw.created),
    lastModifiedDate: toMillis(raw.update),

    // preserve everything else in case you need it
    ...raw,
  };
}

async function fetchCommsPage(params: { pageNumber: number; idToken: string; filters?: Record<string, any> }) {
  const { pageNumber, idToken, filters } = params;

  const qs = new URLSearchParams();

  // If your API supports paging params, you can add them here.
  // Your sample response shows pages.currentPage etc, so it likely does.
  // If it doesn't, leaving these out still works; you'll just always get page 1.
  qs.set('pageNumber', String(pageNumber));

  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, String(v));
    }
  }

  // Avoid trailing `?` when qs is empty
  const url = qs.toString() ? `${COMMS_BASE}?${qs.toString()}` : COMMS_BASE;

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

  // Expect the shape you pasted: { data: [...], pages: {...} }
  const typed = json as CommsListResponse<any>;

  return {
    ...typed,
    data: Array.isArray(typed.data) ? typed.data.map(normalizeComm) : [],
  } as CommsListResponse<Comm>;
}

export function useComms(filters?: Record<string, any>, opts?: { enabled?: boolean; token: any }) {
  const [pageNumber, setPageNumber] = useState(1);

  const query = useQuery({
    queryKey: ['comms', pageNumber, filters],
    enabled: (opts?.enabled ?? true) && !!opts.token.data?.id_token,
    queryFn: () =>
      fetchCommsPage({
        pageNumber,
        idToken: opts.token.data!.id_token,
        filters,
      }),
    retry: 0,
  });

  // ✅ Use the correct fields from the actual response
  const rows = query.data?.data ?? [];
  const pages = query.data?.pages;

  const totalPages = pages?.totalPages ?? 1;
  const totalCount = pages?.totalCount ?? 0;
  const currentPage = pages?.currentPage ?? pageNumber;

  const api = useMemo(
    () => ({
      pageNumber: currentPage,
      setPageNumber: (n: number) => setPageNumber(Math.max(1, n)),
      nextPage: () => setPageNumber((p) => Math.min(totalPages, p + 1)),
      prevPage: () => setPageNumber((p) => Math.max(1, p - 1)),
    }),
    [currentPage, totalPages]
  );

  return {
    query,
    isLoading: opts.token.isLoading || query.isLoading,
    isFetching: query.isFetching,
    error: opts.token.error ?? query.error ?? null,

    rows,
    pages,
    totalPages,
    totalCount,

    ...api,
  };
}
