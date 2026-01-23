import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export type CommTemplateDetail = {
  id: string;
  name: string;
  organizationId?: string;
  description?: string;
  status?: string;
  priority?: string;
  publicSafety?: boolean;
  category?: string;
  eventType?: string;
  type?: string;
  created?: string;
  createdBy?: string;
  createdByName?: string;
  updated?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdRoleId?: string;
  updatedRoleId?: string;
  lastUsed?: string;
  variables?: Array<{
    variableId: string;
    value: string;
    permission: 'VIEW' | 'EDIT' | 'NONE' | string;
    required: boolean;
  }>;
  settings?: any;
  message?: any;
  recipients?: any;
  publicMessages?: any[];
  permissions?: any;
  phase?: string;
  planCount?: number;
};

function normalizeTemplateId(value?: string) {
  if (!value) return '';
  return value.startsWith('commsTemplate://') ? value.replace('commsTemplate://', '') : value;
}

/**
 * Fetch a single communication template detail by ID.
 * Uses Everbridge Communications endpoint:
 * GET /managerapps/communications/v1/templates/{id}
 */
export const useCommTemplateById = (
  templateId: string,
  opts: { token: any; enabled?: boolean } // tokenResponse type from useEverbridgeToken
) => {
  const normalizedId = useMemo(() => normalizeTemplateId(templateId), [templateId]);
  const token = opts.token?.data?.id_token;

  const query = useQuery({
    queryKey: ['comm-template-by-id', normalizedId],
    enabled: Boolean(opts.enabled ?? true) && Boolean(normalizedId) && Boolean(token) && normalizedId !== '',
    queryFn: async (): Promise<CommTemplateDetail> => {
      const res = await fetch(`https://api.everbridge.net/managerapps/communications/v1/templates/${encodeURIComponent(normalizedId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed to fetch template ${normalizedId}: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
      }

      const resp = await res.json();

      return resp;
    },
    staleTime: 60_000,
  });

  return {
    ...query,
    template: query.data ?? null,
    normalizedId,
  };
};
