import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CommVariableDef } from 'pages/Notifications/Tabs/Comms/VariableFields/types';

type Args = {
  tokenResponse: any;
  enabled?: boolean;
  verbose?: boolean;
  pageSize?: number;
};

type PageShape =
  | {
      items?: any[];
      content?: any[];
      page?: number;
      number?: number;
      totalPages?: number;
      last?: boolean;
      nextPage?: number;
      next?: { page?: number } | string;
    }
  | any;

const BASE_URL = 'https://api.everbridge.net/managerapps/communications/v1/variables';

async function fetchJson(url: string, tokenResponse: any) {
  const idToken = tokenResponse?.data?.id_token;
  if (!idToken) throw new Error('Missing ID token');

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load variables (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}

function extractItems(page: PageShape): any[] {
  if (!page) return [];
  if (Array.isArray(page)) return page;
  if (Array.isArray(page.items)) return page.items;
  if (Array.isArray(page.content)) return page.content;
  // common fallback
  if (Array.isArray((page as any).data)) return (page as any).data;
  return [];
}

function getPageNumber(page: PageShape): number {
  const n = page?.number ?? page?.page ?? 0;
  return typeof n === 'number' ? n : 0;
}

function getTotalPages(page: PageShape): number | null {
  const tp = page?.totalPages;
  return typeof tp === 'number' ? tp : null;
}

function isLastPage(page: PageShape): boolean {
  if (typeof page?.last === 'boolean') return page.last;
  const tp = getTotalPages(page);
  if (tp == null) return false;
  return getPageNumber(page) >= tp - 1;
}

async function fetchAllVariables(token: any, verbose: boolean, pageSize: number) {
  // We assume pageable; we’ll loop when we can detect totalPages/last.
  // If the API returns everything in one shot, this will just run once.
  const items: any[] = [];
  let page = 0;

  // hard safety cap to avoid accidental infinite loops
  const MAX_PAGES = 10;

  for (let i = 0; i < MAX_PAGES; i++) {
    const url = new URL(BASE_URL);
    url.searchParams.set('verbose', String(Boolean(verbose)));
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(pageSize));

    const json = await fetchJson(url.toString(), token);
    const chunk = extractItems(json);
    items.push(...chunk);

    // If we can’t detect pagination info, stop after first request
    const tp = getTotalPages(json);
    const hasPagingSignals = tp != null || typeof json?.last === 'boolean';
    if (!hasPagingSignals) break;

    if (isLastPage(json)) break;

    page = getPageNumber(json) + 1;
  }

  return items;
}

export function useCommVariables({ tokenResponse, enabled = true, verbose = true, pageSize = 500 }: Args) {
  const query = useQuery({
    queryKey: ['commsVariables', verbose, pageSize],
    enabled: Boolean(enabled && tokenResponse),
    queryFn: async () => {
      const rows = await fetchAllVariables(tokenResponse, verbose, pageSize);
      return rows;
    },
    staleTime: 60_000,
  });

  const byId = useMemo<Record<string, CommVariableDef>>(() => {
    const map: Record<string, CommVariableDef> = {};
    const rows = (query.data ?? []) as any[];
    for (const v of rows) {
      // variable id field name can vary; support the common ones
      const id = String(v?.id ?? v?.variableId ?? v?.variableID ?? '');
      if (!id) continue;
      map[id] = v as CommVariableDef;
    }
    return map;
  }, [query.data]);

  return {
    ...query,
    rows: (query.data ?? []) as CommVariableDef[],
    byId,
    errors: query.error ? { _global: String((query.error as any)?.message ?? query.error) } : {},
  };
}
