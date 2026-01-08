// hooks/useStopComm.ts
import { useMutation } from '@tanstack/react-query';

type StopCommArgs = { commId: string };

type TokenLike = { access_token?: string; token?: string } | string | null | undefined;

function getAccessToken(token: TokenLike) {
  if (!token) return '';
  if (typeof token === 'string') return token;
  return token.access_token ?? token.token ?? '';
}

// ✅ strips comms:// (or anything://) prefixes if present
function normalizeCommId(commId: string) {
  return commId.replace(/^[a-zA-Z]+:\/\//, '');
}

async function stopCommRequest(commIdRaw: string, accessToken: string) {
  console.log('Stopping comm:', commIdRaw);
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

export function useStopComm(tokenResponse: any, onStopped?: () => void) {
  return useMutation({
    mutationKey: ['stopComm'],
    mutationFn: async ({ commId }: StopCommArgs) => {
      const idToken = tokenResponse.data?.id_token;
      if (!idToken) throw new Error('Not authenticated (missing id_token)');
      if (!commId) throw new Error('Missing commId');
      return stopCommRequest(commId, idToken);
    },
    onSuccess: async () => {
      await onStopped?.();
    },
  });
}
