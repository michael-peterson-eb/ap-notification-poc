import { useQuery } from '@tanstack/react-query';

export type CommEventType = {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  category?: string;
  [k: string]: any;
};

const EVENT_TYPES_URL = 'https://api.everbridge.net/managerapps/cem-comms-setting/v1/event-type-categories';

function normalizeEventType(raw: any): CommEventType {
  return {
    id: String(raw.id ?? raw.eventTypeId ?? raw.name),
    name: raw.name,
    description: raw.description,
    active: raw.active,
    category: raw.category,
    ...raw,
  };
}

async function fetchEventTypes(idToken: string) {
  const url = `${EVENT_TYPES_URL}?pageSize=-1`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const text = await resp.text();
  const json = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { raw: text };
        }
      })()
    : {};

  if (!resp.ok) {
    throw new Error(JSON.stringify({ status: resp.status, ...json }));
  }

  const rows = Array.isArray(json) ? json : Array.isArray((json as any)?.data) ? (json as any).data : [];

  return rows.map(normalizeEventType);
}

export function useCommEventTypes(opts: { token: any }) {
  const query = useQuery({
    queryKey: ['commEventTypes'],
    enabled: !!opts.token.data?.id_token,
    queryFn: () => fetchEventTypes(opts.token.data!.id_token),
    retry: 0,
  });

  return {
    query,
    isLoading: opts.token.isLoading || query.isLoading,
    isFetching: query.isFetching,
    error: opts.token.error ?? query.error ?? null,
    rows: query.data ?? [],
  };
}
