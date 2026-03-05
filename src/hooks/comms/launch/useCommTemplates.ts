import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDefaultTemplateCategory } from 'hooks/comms/launch/useDefaultTemplateCategory';

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
const TEMPLATES_LOOKUP = 'https://api.everbridge.net/managerapps/communications/v1/templates/lookup/';

function normalizeTemplate(raw: any): CommTemplate {
  return { ...raw };
}

async function fetchCommTemplates(idToken: string, filters?: Record<string, any>) {
  const qs = new URLSearchParams();
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
    headers: { accept: 'application/json', Authorization: `Bearer ${idToken}` },
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

async function fetchCommTemplatesByIds(idToken: string, csv: string) {
  const ids = csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!ids.length) return [];

  const resp = await fetch(TEMPLATES_LOOKUP, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ ids, sortBy: 'name', sortDirection: 'asc' }),
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

export function useCommTemplates(filters?: Record<string, any>, opts?: { enabled?: boolean; token: any; planType?: string; standaloneMode?: boolean }) {
  const baseEnabled = (opts?.enabled ?? true) && !!opts?.token?.data?.id_token;
  const isDev = process.env.NODE_ENV === 'development' || opts?.standaloneMode === true;
  const idToken = opts?.token?.data?.id_token as string | undefined;

  const hasPlanType = !!opts?.planType;

  // 1) In prod, look up planCategory from planType
  const planCategoryQuery = useQuery({
    queryKey: ['planTemplateCategory', opts?.planType],
    enabled: baseEnabled && !isDev && hasPlanType,
    retry: 0,
    queryFn: async () => {
      // @ts-expect-error - global _RB
      const rows = await _RB.selectQuery(['bcicTemplateCategory'], 'EA_SA_PlanType', `id = ${opts!.planType}`, 1, true);
      const first = Array.isArray(rows) ? rows[0] : rows?.data?.[0];
      const category = first?.bcicTemplateCategory;
      return category ? String(category) : null;
    },
  });

  const planCategory = planCategoryQuery.data ?? null;

  // 1b) NEW: default category from settings (prod only)
  const defaultCategoryQuery = useDefaultTemplateCategory({
    enabled: baseEnabled && !isDev,
  });

  const defaultCsv = (defaultCategoryQuery.data?.csv ?? '').trim();

  // 1c) NEW: choose plan category first, else default
  const effectiveCsv = (planCategory ?? '').trim() || defaultCsv || null;
  const usedDefault = !(planCategory ?? '').trim() && !!defaultCsv;

  // 2) Effective filters (dev only)
  const effectiveFilters = useMemo(() => {
    if (isDev) return filters;
    return filters;
  }, [filters, isDev]);

  // 3) Template query enabled rules
  const templatesEnabled = baseEnabled && !!idToken && (isDev ? true : hasPlanType ? !!effectiveCsv : !!effectiveCsv);

  const templatesQuery = useQuery({
    queryKey: ['commTemplates', isDev ? 'dev' : (opts?.planType ?? 'no-plan'), isDev ? effectiveFilters : effectiveCsv],
    enabled: templatesEnabled,
    retry: 0,
    queryFn: () => (isDev ? fetchCommTemplates(idToken!, effectiveFilters) : fetchCommTemplatesByIds(idToken!, effectiveCsv!)),
  });

  // 4) Loading/fetching
  const isLoading = opts?.token.isLoading || (!isDev && hasPlanType ? planCategoryQuery.isLoading : false) || (!isDev ? defaultCategoryQuery.isLoading : false) || templatesQuery.isLoading;

  const isFetching = (!isDev && hasPlanType ? planCategoryQuery.isFetching : false) || (!isDev ? defaultCategoryQuery.isFetching : false) || templatesQuery.isFetching;

  // 5) Missing templates error (only once we know both lookups)
  const missingCategoryError = !isDev && templatesQuery.isSuccess && !effectiveCsv ? new Error('No templates configured for this plan type and no default templates configured.') : null;

  return {
    query: templatesQuery,
    isLoading,
    isFetching,
    error: opts?.token.error ?? planCategoryQuery.error ?? defaultCategoryQuery.error ?? missingCategoryError ?? templatesQuery.error ?? null,
    rows: templatesQuery.data ?? [],
    planCategory,
    effectiveCsv, // optional but handy
    usedDefault, // optional but handy for UI messaging
  };
}
