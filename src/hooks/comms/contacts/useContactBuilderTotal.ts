import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const DEFAULT_BASE = 'https://api.everbridge.net/managerapps/communications/v1';

export type ContactSummaryResponse = {
  total?: number;
  buckets?: Record<string, number>;
  public?: {
    provisionalCount?: number;
    subscribedToIds?: any[];
  };
  [k: string]: any;
};

type Params = {
  sessionId: string | null | undefined;
  tokenResponse?: any; // tokenResponse.data.id_token
  enabled?: boolean;
  baseUrl?: string;

  // polling controls (optional)
  intervalMs?: number;
  maxPolls?: number;
};

function hasAnyNonZeroBucket(buckets?: Record<string, number>) {
  if (!buckets) return false;
  return Object.values(buckets).some((n) => Number(n ?? 0) > 0);
}

export function useContactSummary({ sessionId, tokenResponse, enabled = true, baseUrl = DEFAULT_BASE, intervalMs = 1000, maxPolls = 10 }: Params) {
  const idToken = tokenResponse?.data?.id_token;

  const queryEnabled = Boolean(enabled && sessionId && idToken);
  const pollCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);

  // Reset when session changes or enabled toggles
  useEffect(() => {
    pollCountRef.current = 0;
    setIsLoading(queryEnabled);
  }, [sessionId, queryEnabled]);

  const queryKey = ['contactBuilderSummary', sessionId, baseUrl];

  const query = useQuery<ContactSummaryResponse, Error>({
    queryKey,
    enabled: queryEnabled,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
    placeholderData: (prev) => prev,

    queryFn: async ({ signal }) => {
      pollCountRef.current += 1;

      if (!sessionId) throw new Error('sessionId is required');
      if (!idToken) throw new Error('Not authenticated (missing id_token)');

      const url = new URL(`${baseUrl.replace(/\/$/, '')}/contact-builder/${encodeURIComponent(sessionId)}/summary`);

      const resp = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        signal,
      });

      const text = await resp.text();
      let json: any = {};
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = { raw: text };
        }
      }

      if (!resp.ok) {
        if (resp.status === 409) throw new Error('Contact summary unavailable: session completed (409).');
        if (resp.status === 404) throw new Error('Session not found (404).');
        if (resp.status === 401) throw new Error('Unauthorized (401) - token may not have permission to access this API.');
        throw new Error(`GET contact summary failed: ${resp.status} ${JSON.stringify(json)}`);
      }

      return json as ContactSummaryResponse;
    },

    // 👇 poll while summary still "empty"
    refetchInterval: (q) => {
      if (!queryEnabled) return false;

      // stop when max polls reached
      if (pollCountRef.current >= maxPolls) return false;

      const data = q.state.data as ContactSummaryResponse | undefined;

      const total = Number(data?.total ?? 0);
      const bucketsReady = hasAnyNonZeroBucket(data?.buckets);

      // If the summary has something meaningful, stop polling
      if (total > 0 || bucketsReady) return false;

      // otherwise keep polling
      return intervalMs;
    },

    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // Drive loading similar to the session hook
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

    const total = Number(query.data?.total ?? 0);
    const bucketsReady = hasAnyNonZeroBucket(query.data?.buckets);

    if (total > 0 || bucketsReady) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
  }, [queryEnabled, query.isError, query.data, maxPolls]);

  return useMemo(
    () => ({
      ...query,
      isLoading, // override-style loading that reflects polling
    }),
    [query, isLoading]
  );
}
