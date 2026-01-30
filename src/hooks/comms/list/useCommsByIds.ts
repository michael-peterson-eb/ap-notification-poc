import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

export type Comm = {
  id: string;
  title?: string;
  eventType?: string;
  status?: string;
  createdDate?: number;
  lastModifiedDate?: number;
  [k: string]: any;
};

export type CommFetchResult = {
  commId: string;
  url: string;
  status: number;
  raw: any;
  normalized: Comm;
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
    lastModifiedDate: toMillis(raw.updated),
    ...raw,
  };
}

function cleanCommId(commId: string) {
  // avoid accidental "/{id}" or whitespace
  return commId.trim().replace(/^\/+/, '');
}

async function fetchCommById(params: { idToken: string; commId: string }): Promise<CommFetchResult> {
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
    throw new Error(
      JSON.stringify({
        commId,
        url,
        status: resp.status,
        body,
      })
    );
  }

  const normalized = normalizeComm(body);

  return {
    commId,
    url,
    status: resp.status,
    raw: body,
    normalized,
  };
}

export function useCommsByIds(commIds: Array<string | number>, opts?: { enabled?: boolean; token?: any }) {
  const idToken = opts?.token?.data?.id_token;
  const enabled = (opts?.enabled ?? true) && !!idToken && commIds.length > 0;

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

  const queries = useQueries({
    queries: ids.map((commId) => ({
      queryKey: ['comm', commId],
      enabled,
      queryFn: () => fetchCommById({ idToken: idToken!, commId }),
      retry: 0,
    })),
  });

  // ✅ rows for your table (normalized), sorted by createdDate (newest first)
  const rows = useMemo(() => {
    const list = queries.map((q) => (q.data ? q.data.normalized : null)).filter(Boolean) as Comm[];

    // Newest → oldest. Put missing createdDate at the end.
    return list.sort((a, b) => {
      const aT = a.createdDate ?? -Infinity;
      const bT = b.createdDate ?? -Infinity;
      return bT - aT;
    });
  }, [queries]);

  // ✅ raw debug info per id (success or error)
  const results = useMemo(
    () =>
      ids.map((commId, i) => {
        const q = queries[i];
        return {
          commId,
          status: (q.data as any)?.status,
          url: (q.data as any)?.url,
          raw: (q.data as any)?.raw,
          normalized: (q.data as any)?.normalized,
          error: q.error ?? null,
          isLoading: q.isLoading,
          isFetching: q.isFetching,
        };
      }),
    [ids, queries]
  );

  // Find first error (if any)
  const firstError = opts?.token.error ?? queries.find((q) => q.error)?.error ?? null;

  const refetch = async () => {
    const promises = queries.map((q) => {
      try {
        // q.refetch may be undefined if query is disabled or not mounted yet,
        // guard defensively and return a resolved Promise
        return typeof (q as any).refetch === 'function' ? (q as any).refetch() : Promise.resolve(null);
      } catch (err) {
        return Promise.reject(err);
      }
    });
    return Promise.all(promises);
  };

  return {
    queries,
    ids,

    rows, // table-ready
    results, // raw per-id details

    error: firstError,
    isLoading: opts?.token.isLoading || queries.some((q) => q.isLoading),
    isFetching: queries.some((q) => q.isFetching),

    requestedCount: ids.length,
    loadedCount: rows.length,
    refetch,
  };
}
