import { useMutation, useQueryClient } from '@tanstack/react-query';
import { params } from '../utils/consts';

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

  console.log('Launching comm with body:', params.body);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify(params.body),
  });

  // Some errors return JSON ProblemDetail, some may be empty
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

export function useLaunchComm(tokenResponse) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { body: LaunchCommRequest }) => {
      const idToken = tokenResponse.data?.id_token;
      if (!idToken) throw new Error('Not authenticated (missing id_token)');
      return postLaunchComm({ idToken, body: args.body });
    },
    onSuccess: (response) => {
      if (process.env.NODE_ENV !== 'development') {
        //@ts-ignore attached to window
        _RB.createRecord('EA_SA_Notification', { ebNotificationId: response.id, R481285521: params.id, objectType: '$DEFAULT' });
      }

      qc.invalidateQueries({ queryKey: ['comms', 'comm'] });
    },
  });
}
