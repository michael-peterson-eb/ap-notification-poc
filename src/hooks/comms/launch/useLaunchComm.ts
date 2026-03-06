import { useMutation, useQueryClient } from '@tanstack/react-query';
import { params } from 'utils/consts';

const COMMS_BASE = 'https://api.everbridge.net/managerapps/communications/v1';
const LAUNCH_COMMS_PATH = '/';

type LaunchCommRequest = {
  title: string;
  mode: 'LIVE' | 'SIMULATION' | 'PREVIEW';
  description?: string;
  publicSafety?: boolean;
  priority?: 'NORMAL' | 'HIGHPRIORITY' | 'LIFETHREATENING';
  eventType?: string;
  launchedFrom?: 'API' | 'UI' | 'ORCHESTRATION' | 'CRITICALEVENT' | 'SAFETYMESSAGE';
  templateId?: string;
  context?: {
    variables?: Array<{ variableId?: string; value?: string | string[] }>;
    contextIds?: string[]; // maxItems: 1 per spec
  };
  exercise?: boolean;
  settings?: any;
  message?: any;
  recipients?: any;
  publicMessages?: any[];
  activity?: { action?: 'FOLLOWUP' | 'UPDATE' | 'CLOSE'; target?: string };
};

async function postLaunchComm(params: { idToken: string; body: LaunchCommRequest }) {
  const url = `${COMMS_BASE}${LAUNCH_COMMS_PATH}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify(params.body),
  });

  const text = await resp.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { raw: text };
        }
      })()
    : {};

  if (!resp.ok) {
    const err = new Error('Launch communication failed');
    (err as any).status = resp.status;
    (err as any).data = data;
    throw err;
  }

  return data; // expected 201 with { id: string }
}

export function useLaunchComm(tokenResponse: any) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { body: LaunchCommRequest }) => {
      const idToken = tokenResponse?.data?.id_token;
      if (!idToken) throw new Error('Not authenticated (missing id_token)');
      return postLaunchComm({ idToken, body: args.body });
    },

    onSuccess: async (response) => {
      // In Prod, create a notification record. This creates a relationship with the plan so we know
      // which notifications belong to which plan.
      if (process.env.NODE_ENV !== 'development') {
        try {
          // @ts-ignore attached to window
          _RB.createRecord?.('EA_SA_Notification', {
            ebNotificationId: response.id,
            R481285521: params.id,
            objectType: '$DEFAULT',
          });
        } catch (e) {
          console.warn('RB createRecord failed', e);
        }
      }

      // Small delay to give backend time to register the new comm
      await new Promise((res) => setTimeout(res, 500));

      // Refetch comms associated with this plan
      try {
        await queryClient.invalidateQueries({
          predicate: (q) => {
            try {
              const key = q.queryKey;
              if (Array.isArray(key) && key[0] === 'planCommIds') {
                // If planId is part of the key, only invalidate matching plan id.
                if (key.length > 1) {
                  return String(key[1]) === String(params.id);
                }
                return true;
              }
              return false;
            } catch {
              return false;
            }
          },
        });
      } catch (e) {
        console.error('Failed to invalidate planCommIds', e);
      }

      // We invalidate all queries whose first key segment is 'comm'. This will invalidate
      // our comms list / by ids queries so they refetch updated data.
      try {
        await queryClient.invalidateQueries({
          predicate: (q) => {
            try {
              const key = q.queryKey;
              return Array.isArray(key) && key[0] === 'comm';
            } catch {
              return false;
            }
          },
        });
      } catch (e) {
        console.error('Failed to invalidate per-comm queries', e);
      }
    },

    onError: (err) => {
      console.error('Launch comm failed', err);
    },
  });
}
