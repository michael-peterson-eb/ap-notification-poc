import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEverbridgeToken } from './useEverbridgeToken';
import type { PagedResponse } from './useIncidentTemplates';

export type Comm = {
  id: number | string;
  title?: string;
  description?: string;
  eventType?: string;
  active?: boolean;
  status?: string;
  createdDate?: number;
  lastModifiedDate?: number;
  [k: string]: any;
};

const COMMS_BASE = 'https://api.everbridge.net/managerapps/communications/v1/';

async function fetchCommsPage(params: { pageNumber: number; idToken: string; filters?: Record<string, any> }) {
  const { pageNumber, idToken, filters } = params;

  const qs = new URLSearchParams();
  qs.set('skipPaging', 'false');
  qs.set('pageNumber', String(pageNumber));

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

  const json = await resp.json().catch((e) => {
    console.error('Failed to parse JSON response from Everbridge Comms API',e );
  });
  if (!resp.ok) throw { status: resp.status, ...json };

  return json as PagedResponse<Comm>;
}

export function useComms(filters?: Record<string, any>) {
  const tokenQ = useEverbridgeToken();
  const [pageNumber, setPageNumber] = useState(1);

  const query = useQuery({
    queryKey: ['comms', pageNumber, filters],
    enabled: !!tokenQ.data?.id_token,
    queryFn: () =>
      fetchCommsPage({
        pageNumber,
        idToken: tokenQ.data!.id_token,
        filters,
      }),
    retry: 0,
  });

  const page = query.data?.page;
  const rows = page?.data ?? [];
  const totalPages = page?.totalPageCount ?? 1;
  const totalCount = page?.totalCount ?? 0;
  const currentPage = page?.currentPageNo ?? pageNumber;

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
    isLoading: tokenQ.isLoading || query.isLoading,
    isFetching: query.isFetching,
    error: tokenQ.error ?? query.error ?? null,

    rows,
    page,
    totalPages,
    totalCount,

    ...api,
  };
}
