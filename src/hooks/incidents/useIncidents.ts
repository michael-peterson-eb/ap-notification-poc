import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEverbridgeToken } from '../useEverbridgeToken';
import type { PagedResponse } from './useIncidentTemplates';

export type Incident = {
  id: number;
  name: string;
  incidentStatus?: string;
  incidentType?: string;
  lastModifiedDate?: number;
  [k: string]: any;
};

async function fetchIncidentsPage(params: { orgId: string; pageNumber: number; idToken: string }) {
  const { orgId, pageNumber, idToken } = params;

  const url = `https://api.everbridge.net/rest/incidents/${orgId}?skipPaging=false&pageNumber=${pageNumber}`;
  const resp = await fetch(url, {
    headers: { accept: 'application/json', Authorization: `Bearer ${idToken}` },
  });
  const json = await resp.json();
  if (!resp.ok) throw json;
  return json as PagedResponse<Incident>;
}

export function useIncidents(orgId: string, initialPage = 1) {
  const [pageNumber, setPageNumber] = useState(initialPage);

  const tokenQ = useEverbridgeToken();
  const idToken = tokenQ.data?.id_token;

  const query = useQuery({
    queryKey: ['incidents', orgId, pageNumber, idToken],
    enabled: Boolean(orgId) && Boolean(idToken),
    queryFn: () => fetchIncidentsPage({ orgId, pageNumber, idToken: idToken as string }),
    placeholderData: (prev) => prev,
    retry: 1,
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
    tokenQ,
    idToken,

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
