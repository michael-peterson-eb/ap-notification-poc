import { useQuery } from '@tanstack/react-query';

export type CommActivity = {
  actor?: string;
  root?: string;
  priority?: string;
  createdBy?: {
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  createdAt?: string; // ISO timestamp
  actionType?: string; // INIT, etc
  messageType?: string; // STANDARD, etc
  [k: string]: any;
};

type Options = {
  enabled?: boolean;
  token: any; // token response (same as everywhere else)
  pageSize?: number; // default 100
};

async function fetchCommActivities(params: { commId: string; tokenResponse: any; pageSize: number }): Promise<CommActivity[]> {
  const { commId, tokenResponse, pageSize } = params;
  const idToken = tokenResponse?.data?.id_token;

  if (!idToken) throw new Error('Missing auth token');

  const url = new URL(`https://api.everbridge.net/managerapps/communications/v1/${encodeURIComponent(commId)}/activities`);
  url.searchParams.set('pageSize', String(pageSize));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${idToken}`,
      'x-requested-with': 'XMLHttpRequest',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err: any = new Error(`Activities request failed (${res.status})`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const json = await res.json().catch(() => []);
  const rows = Array.isArray(json) ? json : Array.isArray((json as any)?.data) ? (json as any).data : [];
  return rows as CommActivity[];
}

export function useCommActivities(commId: string | null, opts: Options) {
  const enabled = !!commId && (opts.enabled ?? true);
  const pageSize = opts.pageSize ?? 100;

  const query = useQuery({
    queryKey: ['comm', commId, 'activities', { pageSize }],
    enabled,
    queryFn: () => fetchCommActivities({ commId: commId!, tokenResponse: opts.token, pageSize }),
    staleTime: 15_000,
    retry: 0,
  });

  return {
    query,
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
  };
}
