import { useMemo, useState } from 'react';
import { useComms } from 'hooks/comms/list/useComms';
import { usePlanCommIds } from 'hooks/comms/list/usePlanCommIds';
import { useCommsByIds } from 'hooks/comms/list/useCommsByIds';
import { params } from 'utils/consts';

// This hook provides a unified interface to fetch comms lists. In dev or standalone mode, it uses a simple list query.
// In prod mode, it fetches comm ids for the specified plan and then fetches comms by those ids, paginated.
// This is necessary because in prod, comms must be fetched by id for plan association, while in dev we can use simpler queries.
// Standalone mode is used for BCIC legacy tenants, and does not run plan-based filtering, so it runs the same way dev does.

type UseCommsListArgs = {
  token: any;
  planId: string | number;
  pageSize?: number;
};

export function useCommsList({ token, planId, pageSize = 10 }: UseCommsListArgs) {
  const planIdStr = String(planId);

  const isDev = process.env.NODE_ENV === 'development';
  const isStandalone = params.standaloneMode;
  const showListView = isDev || isStandalone;

  const commsList = useComms({}, { enabled: (isDev || isStandalone) && !!token?.data?.id_token, token });

  // Prod paginiation and query. First get the ids of the comms for this plan.
  // This gives us total count and ids to page through. This is stored in a BCIC field on the plan object.
  const bcicPlanCommIds = usePlanCommIds(planIdStr, !showListView);

  const [page, setPage] = useState(1);

  const totalIds = bcicPlanCommIds.ids.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalIds / pageSize));

  const pageIds = useMemo(() => {
    const start = (page - 1) * pageSize;
    return bcicPlanCommIds.ids.slice(start, start + pageSize);
  }, [bcicPlanCommIds.ids, page, pageSize]);

  // Get the comms for the current page of ids
  const commsListedById = useCommsByIds(pageIds, {
    enabled: !showListView && pageIds.length > 0 && !!token?.data?.id_token,
    token,
  });

  // Unified fields returned to caller
  if (showListView) {
    const rows = commsList.rows ?? [];
    const unified: any = {
      rows,
      totalCount: commsList.totalCount ?? rows.length,
      isLoading: Boolean(commsList.isLoading),
      isFetching: Boolean(commsList.isFetching),
      error: commsList.error ?? null,
      // dev pagination helpers if provided by useComms
      pageNumber: (commsList as any).pageNumber ?? undefined,
      totalPages: (commsList as any).totalPages ?? undefined,
      prevPage: (commsList as any).prevPage ?? undefined,
      nextPage: (commsList as any).nextPage ?? undefined,
      // unified refetch for callers
      async refetch() {
        if (commsList?.query?.refetch) return commsList.query.refetch();
        return;
      },
    };

    return {
      comms: unified,
      page: (commsList as any).pageNumber,
      totalPages: (commsList as any).totalPages,
      setPage,
      pageSize,
      pageIds,
      totalIds,
    };
  }

  // Prod unified shape
  const rows = commsListedById.rows ?? [];
  const unifiedListByIds: any = {
    rows,
    totalCount: commsListedById.loadedCount ?? rows.length,
    isLoading: Boolean(bcicPlanCommIds.isLoading || commsListedById.isLoading),
    isFetching: Boolean(bcicPlanCommIds.isFetching || commsListedById.isFetching),
    error: bcicPlanCommIds.error ?? commsListedById.error ?? null,
    // no dev pagination helpers (undefined)
    refetch: async () => {
      if (bcicPlanCommIds?.query?.refetch) {
        await bcicPlanCommIds.query.refetch();
      }
      if (Array.isArray((commsListedById as any)?.queries)) {
        await Promise.all((commsListedById as any).queries.map((q: any) => q.refetch?.()));
      } else if ((commsListedById as any)?.query?.refetch) {
        await (commsListedById as any).query.refetch();
      }
    },
  };

  return {
    comms: unifiedListByIds,
    page,
    setPage,
    pageSize,
    pageIds,
    totalIds,
    totalPages,
  };
}
