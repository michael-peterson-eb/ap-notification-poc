import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEverbridgeToken } from './useEverbridgeToken';

export type PagedResponse<T> = {
  message?: string;
  firstPageUri?: string;
  nextPageUri?: string;
  lastPageUri?: string;
  page: {
    pageSize: number;
    start: number;
    data: T[];
    totalCount: number;
    totalPageCount: number;
    currentPageNo: number;
  };
};

export type IncidentTemplate = {
  id: number;
  name: string;
  templateStatus?: string;
  category?: { id: number; name: string };
  lastModifiedDate?: number;
  createdName?: string;
  lastModifiedName?: string;
  [k: string]: any;
};

async function fetchTemplatesPage(params: { orgId: string; pageNumber: number; idToken: string }) {
  const { orgId, pageNumber, idToken } = params;
  const url = `https://api.everbridge.net/rest/incidentTemplates/${orgId}?skipPaging=false&pageNumber=${pageNumber}`;

  const resp = await fetch(url, {
    headers: { accept: 'application/json', Authorization: `Bearer ${idToken}` },
  });
  const json = await resp.json();
  if (!resp.ok) throw json;
  return json as PagedResponse<IncidentTemplate>;
}

export function useIncidentTemplates(orgId: string, initialPage = 1) {
  const [pageNumber, setPageNumber] = useState(initialPage);

  const tokenQ = useEverbridgeToken();
  const idToken = tokenQ.data?.id_token;

  const query = useQuery({
    queryKey: ['incidentTemplates', orgId, pageNumber, idToken],
    enabled: Boolean(orgId) && Boolean(idToken),
    queryFn: () => fetchTemplatesPage({ orgId, pageNumber, idToken: idToken as string }),
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

    // query state
    query,
    isLoading: tokenQ.isLoading || query.isLoading,
    isFetching: query.isFetching,
    error: tokenQ.error ?? query.error ?? null,

    // data
    rows,
    page,
    totalPages,
    totalCount,

    // pagination controls (owned by hook)
    ...api,
  };
}
