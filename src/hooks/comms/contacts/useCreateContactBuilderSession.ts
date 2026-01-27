import { useEffect, useMemo, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

type IncomingContact = { id?: string; contactId?: string; externalId?: string; type?: string; [k: string]: any };
type IncomingGroup = { id?: string; groupId?: string; externalId?: string; type?: string; [k: string]: any };

type RecipientPayload = {
  contacts?: IncomingContact[];
  groups?: IncomingGroup[];
  rules?: any[];
  query?: any[] | Record<string, any>;
  publicUsers?: any[];
  excluded?: {
    contacts?: IncomingContact[];
    groups?: IncomingGroup[];
  };
};

export type ContactBuilderStartResponse = {
  sessionId: string;
  expiration: string;
  buckets: string[];
};

const BASE = 'https://api.everbridge.net/managerapps/communications/v1';

function toApiContact(c: IncomingContact) {
  if (c.contactId) return c;
  if (c.id) return { ...c, contactId: c.id };
  return c;
}

function toApiGroup(g: IncomingGroup) {
  if (g.groupId) return g;
  if (g.id) return { ...g, groupId: g.id };
  return g;
}

type StartVars = {
  recipients: RecipientPayload;
  tokenResponse: any;
};

export function useCreateContactBuilderSession({ recipients, tokenResponse, autoStart = true }: { recipients?: RecipientPayload | null; tokenResponse?: any; autoStart?: boolean }) {
  const mutation = useMutation<ContactBuilderStartResponse, Error, StartVars>({
    mutationFn: async ({ recipients, tokenResponse }) => {
      const idToken = tokenResponse?.data?.id_token;
      if (!idToken) throw new Error('Not authenticated (missing id_token)');
      if (!recipients) throw new Error('No recipients provided');

      const body: any = { data: {} };

      if (recipients.contacts?.length) {
        body.data.individual = { contacts: recipients.contacts.map(toApiContact) };
      }

      if (recipients.groups?.length) {
        body.data.group = { groups: recipients.groups.map(toApiGroup) };
      }

      if (recipients.rules?.length) {
        body.data.rule = recipients.rules;
      }

      if (recipients.publicUsers?.length) {
        body.data.public = recipients.publicUsers;
      }

      if (recipients.query) {
        const queryList = Array.isArray(recipients.query) ? recipients.query : [recipients.query];
        body.data.query = { query: queryList };
      }

      if (recipients.excluded) {
        body.data.exclusion = {};
        if (recipients.excluded.contacts?.length) {
          body.data.exclusion.individual = { contacts: recipients.excluded.contacts.map(toApiContact) };
        }
        if (recipients.excluded.groups?.length) {
          body.data.exclusion.group = { groups: recipients.excluded.groups.map(toApiGroup) };
        }
      }

      const resp = await fetch(`${BASE}/contact-builder`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(JSON.stringify(json));

      return json as ContactBuilderStartResponse;
    },
  });

  // --- CHANGE STARTS HERE ---
  // We only want autoStart to fire once per stable (id_token + recipients payload),
  // not every time tokenResponse object identity changes (e.g., tab refocus).
  const idToken: string | null = tokenResponse?.data?.id_token ?? null;

  const startKey = useMemo(() => {
    if (!autoStart) return null;
    if (!recipients) return null;
    if (!idToken) return null;

    let recipientsKey = '';
    try {
      recipientsKey = JSON.stringify(recipients);
    } catch {
      // Fallback if something is non-serializable; this is less ideal but avoids crashing.
      recipientsKey = String(recipients);
    }

    return `${idToken}::${recipientsKey}`;
  }, [autoStart, recipients, idToken]);

  const startedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoStart) return;
    if (!recipients) return;
    if (!idToken) return;
    if (!startKey) return;

    // prevent duplicate auto-start for the same inputs
    if (startedKeyRef.current === startKey) return;

    // don't double-trigger if already running
    if (mutation.isPending) return;

    startedKeyRef.current = startKey;
    mutation.mutate({ recipients, tokenResponse });
    // NOTE: we intentionally do NOT depend on tokenResponse identity;
    // startKey already captures the meaningful token value (idToken).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, startKey, recipients, idToken]);
  // --- CHANGE ENDS HERE ---

  return {
    ...mutation,
    status: mutation.status,
    isPending: mutation.isPending,
    response: mutation.data ?? null,
    start: (vars?: StartVars) => (vars ? mutation.mutateAsync(vars) : mutation.mutateAsync({ recipients: recipients!, tokenResponse })),
  };
}
