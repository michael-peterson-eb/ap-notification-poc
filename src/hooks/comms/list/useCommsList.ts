import { useMemo, useState } from 'react';
import { useComms } from 'hooks/comms/list/useComms';
import { usePlanCommIds } from 'hooks/comms/list/usePlanCommIds';
import { useCommsByIds } from 'hooks/comms/list/useCommsByIds';

// This hook provides a unified interface to fetch comms lists. In dev mode, it uses a simple list query.
// In prod mode, it fetches comm ids for the specified plan and then fetches comms by those ids, paginated.
// This is necessary because in prod, comms must be fetched by id for plan association, while in dev we can use simpler queries.

type UseCommsListArgs = {
  token: any;
  planId: string | number;
  pageSize?: number;
  enabled?: boolean;
  overrideIsDev?: boolean;
};

export function useCommsList({ token, planId, pageSize = 10, enabled = true, overrideIsDev }: UseCommsListArgs) {
  const planIdStr = String(planId);

  const isDev = overrideIsDev ?? process.env.NODE_ENV === 'development';
  const commsDev = useComms({}, { enabled: enabled && isDev && !!token?.data?.id_token, token });

  // Prod paginiation and query. First get the ids of the comms for this plan.
  // This gives us total count and ids to page through. This is stored in a BCIC field on the plan object.
  const bcicPlanCommIds = usePlanCommIds(planIdStr);

  const [page, setPage] = useState(1);

  const totalIds = bcicPlanCommIds.ids.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalIds / pageSize));

  const pageIds = useMemo(() => {
    const start = (page - 1) * pageSize;
    return bcicPlanCommIds.ids.slice(start, start + pageSize);
  }, [bcicPlanCommIds.ids, page, pageSize]);

  // Get the comms for the current page of ids
  const commsProd = useCommsByIds(pageIds, {
    enabled: enabled && !isDev && pageIds.length > 0 && !!token?.data?.id_token,
    token,
  });

  // Unified fields returned to caller
  if (isDev) {
    const rows = commsDev.rows ?? [];
    const unified: any = {
      rows,
      totalCount: commsDev.totalCount ?? rows.length,
      isLoading: Boolean(commsDev.isLoading),
      isFetching: Boolean(commsDev.isFetching),
      error: commsDev.error ?? null,
      // dev pagination helpers if provided by useComms
      pageNumber: (commsDev as any).pageNumber ?? undefined,
      totalPages: (commsDev as any).totalPages ?? undefined,
      prevPage: (commsDev as any).prevPage ?? undefined,
      nextPage: (commsDev as any).nextPage ?? undefined,
      // unified refetch for callers
      async refetch() {
        if (commsDev?.query?.refetch) return commsDev.query.refetch();
        return;
      },
    };

    return {
      comms: unified,
      page,
      setPage,
      pageSize,
      pageIds,
      totalIds,
      totalPages,
      isDev: true,
    };
  }

  // Prod unified shape
  const rows = commsProd.rows ?? [];
  const unifiedProd: any = {
    rows,
    totalCount: commsProd.loadedCount ?? rows.length,
    isLoading: Boolean(bcicPlanCommIds.isLoading || commsProd.isLoading),
    isFetching: Boolean(bcicPlanCommIds.isFetching || commsProd.isFetching),
    error: bcicPlanCommIds.error ?? commsProd.error ?? null,
    // no dev pagination helpers (undefined)
    refetch: async () => {
      if (bcicPlanCommIds?.query?.refetch) {
        await bcicPlanCommIds.query.refetch();
      }
      if (Array.isArray((commsProd as any)?.queries)) {
        await Promise.all((commsProd as any).queries.map((q: any) => q.refetch?.()));
      } else if ((commsProd as any)?.query?.refetch) {
        await (commsProd as any).query.refetch();
      }
    },
  };

  return {
    comms: unifiedProd,
    page,
    setPage,
    pageSize,
    pageIds,
    totalIds,
    totalPages,
    isDev: false,
  };
}
