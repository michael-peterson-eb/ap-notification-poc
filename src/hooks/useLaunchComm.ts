import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEverbridgeToken } from './useEverbridgeToken';

/**
 * Per docs, base is:
 *   https://api.everbridge.net/managerapps/communications/v1/
 * :contentReference[oaicite:3]{index=3}
 *
 * Keep suffix configurable; many tenants use something like `/comms/launch`.
 */
const COMMS_BASE = 'https://api.everbridge.net/managerapps/communications/v1';
const LAUNCH_COMMS_PATH = '/comms/launch'; // adjust if your tenant differs

async function postLaunchComm(params: { idToken: string; body: any }) {
  const url = `${COMMS_BASE}${LAUNCH_COMMS_PATH}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify(params.body ?? {}),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw json;

  return json;
}

export function useLaunchComm() {
  const tokenQ = useEverbridgeToken();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { body: any }) => {
      const idToken = tokenQ.data?.id_token;
      if (!idToken) throw new Error('Not authenticated (missing id_token)');
      return postLaunchComm({ idToken, body: args.body });
    },
    onSuccess: () => {
      // refresh comms list after launch
      qc.invalidateQueries({ queryKey: ['comms'] });
    },
  });
}
