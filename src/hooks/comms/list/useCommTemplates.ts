import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

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

// NEW: lookup templates by IDs (CSV in bcicTemplateCategory)
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

  // --- 1) In prod, look up planCategory from planType ---
  const planCategoryQuery = useQuery({
    queryKey: ['planTemplateCategory', opts?.planType],
    enabled: baseEnabled && !isDev && hasPlanType,
    retry: 0,
    queryFn: async () => {
      // @ts-expect-error - global _RB
      const rows = await _RB.selectQuery(['bcicTemplateCategory'], 'EA_SA_PlanType', `id = ${opts!.planType}`, 1, true);

      const first = Array.isArray(rows) ? rows[0] : rows?.data?.[0];
      const category = first?.bcicTemplateCategory;

      // normalize empty/undefined to null
      return category ? String(category) : null;
    },
  });

  const planCategory = planCategoryQuery.data ?? null;

  // --- 2) Effective filters ---
  // Dev: just use filters (or none) and pull everything
  // Prod: (NO LONGER USED for category filtering) keep as-is for minimal diff
  const effectiveFilters = useMemo(() => {
    if (isDev) return filters; // dev can be undefined -> pull all templates

    // prod: only meaningful if we have a category
    if (!planCategory) return undefined;

    // NOTE: category is now a CSV of template IDs; do not add it to filters anymore
    return filters;
  }, [filters, isDev, planCategory]);

  // --- 3) Template query enabled rules ---
  const templatesEnabled =
    baseEnabled &&
    !!idToken &&
    (isDev // dev: no planType/category required
      ? true
      : hasPlanType && !!planCategory); // prod: must have planType AND csv

  const templatesQuery = useQuery({
    queryKey: ['commTemplates', isDev ? 'dev' : opts?.planType, isDev ? effectiveFilters : planCategory],
    enabled: templatesEnabled,
    retry: 0,
    queryFn: () => (isDev ? fetchCommTemplates(idToken!, effectiveFilters) : fetchCommTemplatesByIds(idToken!, planCategory!)),
  });

  // --- 4) Loading state rules ---
  // If prod is missing planType or missing category, we should NOT appear to be loading forever.
  const isLoading = opts?.token.isLoading || (!isDev && hasPlanType ? planCategoryQuery.isLoading : false) || templatesQuery.isLoading;

  const isFetching = (!isDev && hasPlanType ? planCategoryQuery.isFetching : false) || templatesQuery.isFetching;

  // Optional: provide a more explicit error when prod has planType but no category
  const missingCategoryError = !isDev && hasPlanType && planCategoryQuery.isSuccess && !planCategory ? new Error('No template IDs configured for this plan type.') : null;

  return {
    query: templatesQuery,
    isLoading,
    isFetching,
    error: opts?.token.error ?? planCategoryQuery.error ?? missingCategoryError ?? templatesQuery.error ?? null,
    rows: templatesQuery.data ?? [],
    planCategory,
  };
}
