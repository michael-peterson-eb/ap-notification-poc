import { useMutation, useQueryClient } from '@tanstack/react-query';

type StopCommArgs = { commId: string };

function normalizeCommId(commId: string) {
  return commId.replace(/^[a-zA-Z]+:\/\//, '');
}

async function stopCommRequest(commIdRaw: string, accessToken: string) {
  const commId = normalizeCommId(commIdRaw);

  const url = `https://api.everbridge.net/managerapps/communications/v1/${encodeURIComponent(commId)}/stop`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    // ✅ send an empty JSON body to avoid 400s on strict PATCH handlers
    body: JSON.stringify({ commId: commId }),
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
    const err: any = new Error(typeof data === 'string' ? data : (data?.message ?? `Stop comm failed (${res.status})`));
    err.status = res.status;
    err.data = data;
    err.commIdSent = commId;
    throw err;
  }

  // Some endpoints return no JSON; normalize success
  return data ?? { ok: true };
}

export function useStopComm(tokenResponse: any) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['stopComm'],
    mutationFn: async ({ commId }: StopCommArgs) => {
      const idToken = tokenResponse.data?.id_token;
      if (!idToken) throw new Error('Not authenticated (missing id_token)');
      if (!commId) throw new Error('Missing commId');
      return stopCommRequest(commId, idToken);
    },
    onSuccess: async () => {
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
  });
}
