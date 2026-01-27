import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const BASE = 'https://api.everbridge.net/managerapps/communications/v1';
const PROCESSING = 'PROCESSING';

type SessionGetResponse = {
  state?: string;
  status?: string;
  [k: string]: any;
};

type Args = {
  sessionId: string | null;
  tokenResponse: any;
  enabled?: boolean;
  intervalMs?: number;
  maxPolls?: number;
};

export function useContactBuilderSession({ sessionId, tokenResponse, enabled = true, intervalMs = 1000, maxPolls = 5 }: Args) {
  const idToken = tokenResponse?.data?.id_token ?? null;
  const queryEnabled = Boolean(enabled && sessionId && idToken);

  const pollCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);

  // Reset when session changes or enabled toggles
  useEffect(() => {
    pollCountRef.current = 0;
    setIsLoading(queryEnabled); // ✅ true immediately once we can start
  }, [sessionId, queryEnabled]);

  const query = useQuery<SessionGetResponse, Error>({
    queryKey: ['contactBuilderSessionStatus', sessionId],
    enabled: queryEnabled,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
    placeholderData: (prev) => prev,

    queryFn: async () => {
      pollCountRef.current += 1;

      const resp = await fetch(`${BASE}/contact-builder/${sessionId}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      const json = await resp.json().catch(() => ({}) as any);
      if (!resp.ok) throw new Error(JSON.stringify(json));
      return json as SessionGetResponse;
    },

    refetchInterval: (q) => {
      if (!queryEnabled) return false;

      // stop when max polls reached
      if (pollCountRef.current >= maxPolls) return false;

      const data = q.state.data as SessionGetResponse | undefined;
      const status = (data?.status ?? data?.state) as string | undefined;

      // poll only while processing
      return status === PROCESSING ? intervalMs : false;
    },
  });

  const status = (query.data?.status ?? query.data?.state) as string | undefined;

  // Drive loading from: enabled, status, error, maxPolls reached
  useEffect(() => {
    if (!queryEnabled) {
      setIsLoading(false);
      return;
    }

    if (query.isError) {
      setIsLoading(false);
      return;
    }

    if (pollCountRef.current >= maxPolls) {
      setIsLoading(false);
      return;
    }

    if (status && status !== PROCESSING) {
      setIsLoading(false);
      return;
    }

    // includes the initial "no data yet" phase
    setIsLoading(true);
  }, [queryEnabled, status, query.isError, maxPolls]);

  return useMemo(
    () => ({
      status,
      isLoading,
      error: query.error ?? null,
    }),
    [status, isLoading, query.error]
  );
}
