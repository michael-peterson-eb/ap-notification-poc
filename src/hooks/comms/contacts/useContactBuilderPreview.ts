import { useQuery } from '@tanstack/react-query';

const DEFAULT_BASE = 'https://api.everbridge.net/managerapps/communications/v1';

export type ContactAddress = {
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null; // ISO alpha-2
  locationType?: string | null;
  locationName?: string | null;
};

export type ContactPreview = {
  id: number;
  firstName?: string | null;
  middleInitial?: string | null;
  lastName?: string | null;
  externalId?: string | null;
  recordTypeId?: number | null;
  recordTypeName?: string | null;
  registerEmail?: string | null;
  country?: string | null;
  addresses?: ContactAddress[];
  createdName?: string | null;
  lastModifiedDate?: string | null; // ISO 8601
};

export type PagesMeta = {
  currentPage: number;
  pageSize: number;
  pageCount: number;
  totalPages: number;
  maxSize?: number;
  totalCount: number;
};

export type ContactPreviewResponse = {
  pages: PagesMeta;
  data: ContactPreview[];
};

type Params = {
  sessionId: string | null | undefined;
  tokenResponse?: any; // shape you already have (tokenResponse.data.id_token)
  pageSize?: number; // 1..250 ; default 100
  pageNumber?: number; // >=1 ; default 1
  sortBy?: 'FIRSTNAME' | 'MIDDLEINITIAL' | 'LASTNAME' | 'EMAIL' | 'COUNTRY' | 'EXTERNALID';
  sortDirection?: 'ASC' | 'ASCENDING' | 'DESC' | 'DESCENDING';
  includeExcludedContacts?: boolean;
  bucket?: string[]; // optional
  name?: string; // optional filter by name
  enabled?: boolean;
  baseUrl?: string; // override default base (e.g. dev host)
};

export function useContactPreview({
  sessionId,
  tokenResponse,
  pageSize = 100,
  pageNumber = 1,
  sortBy = 'LASTNAME',
  sortDirection = 'ASC',
  includeExcludedContacts = false,
  bucket,
  name,
  enabled = true,
  baseUrl = DEFAULT_BASE,
}: Params) {
  const idToken = tokenResponse?.data?.id_token;

  const queryKey = ['contactBuilderPreview', sessionId, pageSize, pageNumber, sortBy, sortDirection, includeExcludedContacts, bucket ? [...bucket].sort() : undefined, name ?? undefined, baseUrl];

  return useQuery<ContactPreviewResponse, Error>({
    queryKey,
    enabled: Boolean(enabled && sessionId && idToken),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,

    queryFn: async ({ signal }) => {
      if (!sessionId) throw new Error('sessionId is required');
      if (!idToken) throw new Error('Not authenticated (missing id_token)');

      const url = new URL(`${baseUrl.replace(/\/$/, '')}/contact-builder/${encodeURIComponent(sessionId)}/preview`);

      url.searchParams.set('sortBy', sortBy);
      url.searchParams.set('sortDirection', sortDirection);
      url.searchParams.set('direction', sortDirection);
      url.searchParams.set('pageSize', String(pageSize));
      url.searchParams.set('pageNumber', String(pageNumber));
      url.searchParams.set('includeExcludedContacts', String(includeExcludedContacts));

      if (name) url.searchParams.set('name', name);
      if (bucket && bucket.length) {
        for (const b of bucket) {
          console.log('Appending bucket param:', b);
          url.searchParams.append('bucket', b);
        }
      }

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
        // Provide helpful error messages (409 is special per docs)
        if (resp.status === 409) {
          throw new Error('Contact preview unavailable: session completed or exceeds 10,000 contacts (409).');
        }
        if (resp.status === 404) {
          throw new Error('Session not found (404).');
        }
        if (resp.status === 401) {
          throw new Error('Unauthorized (401) - token may not have permission to access this API.');
        }
        // fallback: include any parsed body
        throw new Error(`GET contact preview failed: ${resp.status} ${JSON.stringify(json)}`);
      }

      // Map response into our types robustly
      const pages = {
        currentPage: Number(json.pages?.currentPage ?? pageNumber),
        pageSize: Number(json.pages?.pageSize ?? pageSize),
        pageCount: Number(json.pages?.pageCount ?? json.data?.length ?? 0),
        totalPages: Number(json.pages?.totalPages ?? 1),
        maxSize: json.pages?.maxSize ? Number(json.pages.maxSize) : undefined,
        totalCount: Number(json.pages?.totalCount ?? json.data?.length ?? 0),
      };

      const data: ContactPreview[] = Array.isArray(json.data)
        ? json.data.map((c: any) => ({
            id: Number(c.id),
            firstName: c.firstName ?? null,
            middleInitial: c.middleInitial ?? null,
            lastName: c.lastName ?? null,
            externalId: c.externalId ?? null,
            recordTypeId: c.recordTypeId != null ? Number(c.recordTypeId) : null,
            recordTypeName: c.recordTypeName ?? null,
            registerEmail: c.registerEmail ?? null,
            country: c.country ?? null,
            addresses: Array.isArray(c.addresses)
              ? c.addresses.map((a: any) => ({
                  streetAddress: a.streetAddress ?? null,
                  city: a.city ?? null,
                  state: a.state ?? null,
                  postalCode: a.postalCode ?? null,
                  country: a.country ?? null,
                  locationType: a.locationType ?? null,
                  locationName: a.locationName ?? null,
                }))
              : [],
            createdName: c.createdName ?? null,
            lastModifiedDate: c.lastModifiedDate ?? null,
          }))
        : [];

      return {
        pages,
        data,
      };
    },

    staleTime: 30_000, // 30s
    gcTime: 5 * 60_000, // 5m (v5 name for cacheTime)
    retry: (failureCount, error) => {
      // don't retry on expected client errors
      const msg = String(error?.message ?? '');
      if (/404|401|409/.test(msg)) return false;
      return failureCount < 2;
    },
  });
}
