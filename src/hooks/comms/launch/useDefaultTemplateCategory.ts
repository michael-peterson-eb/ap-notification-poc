import { useQuery } from '@tanstack/react-query';

export function rbfSelectQueryPromise<T>(sql: string, limit: number, map: (rows: any[]) => T, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    let finished = false;

    const timer = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      reject(new Error(`rbf_selectQuery timed out after ${timeoutMs}ms: ${sql}`));
    }, timeoutMs);

    const finishResolve = (val: T) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      resolve(val);
    };

    const finishReject = (err: any) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      reject(err);
    };

    try {
      // @ts-expect-error rbf_selectQuery is global
      rbf_selectQuery(
        sql,
        limit,
        (values: any[]) => {
          try {
            const result = map(values ?? []);
            finishResolve(result);
          } catch (e) {
            finishReject(e);
          }
        },
        false
      );
    } catch (e) {
      finishReject(e);
    }
  });
}

export type DefaultTemplateCategory = {
  settingsRowId: number;
  csv: string;
};

export type UseDefaultTemplateCategoryOpts = {
  enabled?: boolean;
  staleTimeMs?: number;
  timeoutMs?: number;
};

export function useDefaultTemplateCategory(opts: UseDefaultTemplateCategoryOpts = {}) {
  const { enabled = true, staleTimeMs = 30_000, timeoutMs = 15_000 } = opts;

  return useQuery({
    queryKey: ['defaultTemplateCategory'],
    enabled,
    staleTime: staleTimeMs,
    retry: 0,
    queryFn: async (): Promise<DefaultTemplateCategory> => {
      return rbfSelectQueryPromise(
        `SELECT id, bcicDefaultTemplate FROM $SETTINGS`,
        1,
        (rows) => {
          // rows looks like: [ [468991815, '123,124,125'] ]
          const first = rows?.[0];
          const settingsRowIdRaw = first?.[0] ?? 1;
          const csvRaw = first?.[1];

          const settingsRowIdNum = Number(settingsRowIdRaw);
          const settingsRowId = Number.isFinite(settingsRowIdNum) ? settingsRowIdNum : 1;

          const csv = csvRaw == null ? '' : String(csvRaw);

          return { settingsRowId, csv };
        },
        timeoutMs
      );
    },
  });
}
