import { useQuery } from '@tanstack/react-query';

export type PathEntry = {
  language?: string;
  pathCategory?: string;
  contentUri: string;
};

export type MessageContent = {
  type: string;
  title?: string;
  contentType?: string;
  content?: string;
  paths?: string[];
  sourceUri?: string;
};

type Options = {
  enabled?: boolean;
};

type ContentItemPayload = {
  content?: string | null;
  attachments?: any[];
  title?: string | null;
  language?: string | null;
  contentType?: string | null;
  paths?: string[] | null;
  [k: string]: any;
};

type ContentResponsePayload = {
  content?: Record<string, ContentItemPayload> | null;
  [k: string]: any;
};

async function fetchContentForPath(p: PathEntry, idToken: string): Promise<MessageContent[]> {
  const res = await fetch(p.contentUri, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${idToken}`,
      'x-requested-with': 'XMLHttpRequest',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err: any = new Error(`Failed to fetch ${p.contentUri}: ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  // explicitly type the parsed JSON
  const json = (await res.json().catch(() => ({}))) as ContentResponsePayload;
  const out: MessageContent[] = [];

  if (json && typeof json === 'object' && json.content && typeof json.content === 'object') {
    // iterate with typed values
    for (const [key, rawVal] of Object.entries(json.content)) {
      const val = rawVal as ContentItemPayload | undefined;
      if (!val || typeof val !== 'object') continue;

      // guard property types before assigning
      const title = typeof val.title === 'string' ? val.title : undefined;
      const contentType = typeof val.contentType === 'string' ? val.contentType : undefined;
      const content = typeof val.content === 'string' ? val.content : undefined;
      const paths = Array.isArray(val.paths) ? val.paths.filter((p) => typeof p === 'string') : p.pathCategory ? [`CATEGORY:${p.pathCategory}`] : [];

      out.push({
        type: key,
        title,
        contentType,
        content,
        paths,
        sourceUri: p.contentUri,
      });
    }
  }

  return out;
}

export function useCommContents(paths: PathEntry[] | undefined, tokenResponse: any, opts: Options = {}) {
  const enabled = opts.enabled ?? true;
  const idToken = tokenResponse?.data?.id_token;

  const queryKey = ['comm', 'contents', { paths: paths ?? [] }];

  const query = useQuery<MessageContent[], Error>({
    queryKey,
    enabled: enabled && !!paths?.length && !!idToken,
    queryFn: async (): Promise<MessageContent[]> => {
      if (!paths || !paths.length) return [];
      if (!idToken) throw new Error('Missing auth token');

      const settled = await Promise.allSettled(paths.map((p) => fetchContentForPath(p, idToken)));

      const successes: MessageContent[] = [];
      const errors: any[] = [];

      for (const r of settled) {
        if (r.status === 'fulfilled') {
          successes.push(...r.value);
        } else {
          errors.push(r.reason);
        }
      }

      if (successes.length === 0 && errors.length > 0) {
        const e = errors[0] instanceof Error ? errors[0] : new Error(String(errors[0]));
        (e as any).allErrors = errors;
        throw e;
      }

      // attach partial errors for caller inspection if needed
      (successes as any)._partialErrors = errors;
      return successes;
    },
    staleTime: 15_000,
    retry: 0,
  });

  const contents: MessageContent[] = query.data ?? [];
  const isLoading = query.isLoading;
  const error = query.error ?? (Array.isArray((contents as any)?._partialErrors) && (contents as any)._partialErrors.length ? new Error('Partial content fetch failures') : null);

  return {
    query,
    contents,
    isLoading,
    isFetching: query.isFetching,
    error,
  };
}
