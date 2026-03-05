import { useMutation, useQueryClient } from '@tanstack/react-query';

type SetCommActiveArgs = { commId: string; active: boolean };

function normalizeCommId(commId: string) {
  return commId.replace(/^[a-zA-Z]+:\/\//, '');
}

async function setCommActiveRequest(commIdRaw: string, active: boolean, accessToken: string) {
  const commId = normalizeCommId(commIdRaw);

  // ✅ removed "/stop"
  const url = `https://api.everbridge.net/managerapps/communications/v1/${encodeURIComponent(commId)}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    // ✅ send JSON body with active flag
    body: JSON.stringify({ commId, active }),
  });

  const text = await res.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  if (!res.ok) {
    const err: any = new Error(typeof data === 'string' ? data : (data?.message ?? `Update comm failed (${res.status})`));
    err.status = res.status;
    err.data = data;
    err.commIdSent = commId;
    err.activeSent = active;
    throw err;
  }

  return data ?? { ok: true };
}

export function useSetCommActive(tokenResponse: any) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['setCommActive'],
    mutationFn: async ({ commId, active }: SetCommActiveArgs) => {
      const idToken = tokenResponse.data?.id_token;
      if (!idToken) throw new Error('Not authenticated (missing id_token)');
      if (!commId) throw new Error('Missing commId');
      if (typeof active !== 'boolean') throw new Error('Missing active boolean');
      return setCommActiveRequest(commId, active, idToken);
    },
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({
          predicate: (q) => {
            try {
              const key = q.queryKey;
              return Array.isArray(key) && key[0] === 'comms';
            } catch {
              return false;
            }
          },
        });
      } catch (e) {
        console.error('Failed to invalidate per-comm queries', e);
      }
    },
  });
}
