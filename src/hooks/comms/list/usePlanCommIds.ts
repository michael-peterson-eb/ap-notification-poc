import { useQuery } from '@tanstack/react-query';

type RBClient = {
  getRelatedIds: (relId: string, objName: string, recordId: string) => Promise<Array<string | number>>;
  selectQuery: (fields: string[], objectName: string, where: string, limit?: number) => Promise<any>;
};

function getRB(): RBClient {
  const rb = (window as any)?._RB;
  if (!rb?.getRelatedIds || !rb?.selectQuery) {
    throw new Error('RB client not available: window._RB.getRelatedIds/selectQuery missing');
  }
  return rb as RBClient;
}

/** parse selectQuery results like: [[val],[val], ...] or [[val, ...],[val,...]] */
function extractFirstColumnValues(rows: any): string[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => (Array.isArray(row) ? row[0] : row))
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
}

export function usePlanCommIds(planId?: string, enabled: boolean = true) {
  const query = useQuery({
    queryKey: ['planCommIds', planId],
    enabled: !!planId && enabled,
    retry: 0,
    queryFn: async () => {
      const rb = getRB();

      // Step 1: related notification record IDs (LCAP ids)
      const notificationIds = await rb.getRelatedIds('R481285521', 'EA_SA_Plan', String(planId));

      const cleanNotifIds = (notificationIds ?? []).map((x) => String(x).trim()).filter(Boolean);

      if (!cleanNotifIds.length) return [];

      // Build a safe IN() clause. If these are numeric IDs, keep numeric.
      // If they might be strings, quote them.
      const allNumeric = cleanNotifIds.every((s) => /^\d+$/.test(s));
      const inList = allNumeric ? cleanNotifIds.join(', ') : cleanNotifIds.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ');

      const rows = await rb.selectQuery(['ebNotificationId'], 'EA_SA_Notification', `id IN (${inList})`, 10000);

      const commIds = extractFirstColumnValues(rows);

      // Step 3: de-dupe + return
      return Array.from(new Set(commIds));
    },
  });

  return {
    query,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    ids: query.data ?? [],
  };
}
