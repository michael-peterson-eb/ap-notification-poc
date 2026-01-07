import { useQuery } from '@tanstack/react-query';

export type CommTemplate = {
  id: string; // normalized ID used by UI
  templateId?: string; // raw API value (often "commsTemplate://...")
  name?: string;
  title?: string;
  eventType?: string;
  description?: string;
  active?: boolean;
  status?: string;
  createdDate?: number;
  lastModifiedDate?: number;
  [k: string]: any;
};

const TEMPLATES_BASE = 'https://api.everbridge.net/managerapps/communications/v1/templates/';

function normalizeTemplate(raw: any): CommTemplate {
  return {
    ...raw,
  };
}

async function fetchCommTemplates(idToken: string, filters?: Record<string, any>) {
  const qs = new URLSearchParams();

  // Hard-code pageSize = 100, ignore pagination for now
  qs.set('pageSize', '100');

  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, String(v));
    }
  }

  const url = qs.toString() ? `${TEMPLATES_BASE}?${qs.toString()}` : TEMPLATES_BASE;

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

  if (!resp.ok) throw new Error(JSON.stringify({ status: resp.status, ...json }));

  const rows = Array.isArray(json) ? json : Array.isArray((json as any)?.data) ? (json as any).data : [];

  return rows.map(normalizeTemplate);
}

export function useCommTemplates(filters?: Record<string, any>, opts?: { enabled?: boolean; token: any }) {
  const enabled = (opts?.enabled ?? true) && !!opts?.token?.data?.id_token;

  const query = useQuery({
    queryKey: ['commTemplates', filters],
    enabled,
    queryFn: () => fetchCommTemplates(opts!.token.data!.id_token, filters),
    retry: 0,
  });

  return {
    query,
    isLoading: opts?.token.isLoading || query.isLoading,
    isFetching: query.isFetching,
    error: opts?.token.error ?? query.error ?? null,
    rows: query.data ?? [],
  };
}
