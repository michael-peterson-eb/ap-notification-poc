import { useComms, UseCommsUnifiedResult } from 'hooks/comms/list/useComms';
import { usePlanCommIds } from 'hooks/comms/list/usePlanCommIds';
import { useCommsByIds, UseCommsByIdsUnifiedResult } from 'hooks/comms/list/useCommsByIds';
import { params } from 'utils/consts';

type UseCommsListArgs = {
  token: any;
  planId: string | number;
  pageSize?: number;
  filters?: Record<string, any>;
};

export function useCommsList({ token, planId, pageSize = 10, filters }: UseCommsListArgs): UseCommsUnifiedResult | UseCommsByIdsUnifiedResult {
  const planIdStr = String(planId);

  const isDev = process.env.NODE_ENV === 'development';
  const isStandalone = params.standaloneMode;
  const useListApi = isDev || isStandalone;

  const hasToken = Boolean(token?.data?.id_token);

  const resetKey = JSON.stringify(filters ?? {});

  // Dev and legacy: use full list API
  const listResult = useComms(filters ?? {}, {
    enabled: useListApi && hasToken,
    token,
    pageSize,
  });

  // Prod: plan comm ids + by-ids fetch
  const planIdsResult = usePlanCommIds(planIdStr, !useListApi);
  const byIdsResult = useCommsByIds(planIdsResult.ids, {
    enabled: !useListApi && hasToken && planIdsResult.ids.length > 0,
    token,
    pageSize,
    resetKey,
  });

  // ✅ Return the correct view; this is NOT a hooks violation (plain conditional return)
  return useListApi ? listResult : byIdsResult;
}
