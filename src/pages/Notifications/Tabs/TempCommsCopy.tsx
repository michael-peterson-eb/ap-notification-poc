import React, { useMemo, useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '../../../components/ui/button';
import { Field, Section } from '../components';
import { DataTable } from '../../../components/DataTable';
import { formatDate } from '../../../utils/format';
import { useComms, Comm } from '../../../hooks/useComms';
import { useLaunchComm } from '../../../hooks/useLaunchComm';
import { useCommTemplates } from 'hooks/useCommTemplates';
import { useCommEventTypes } from 'hooks/useCommEventTypes';
import { usePlanCommIds } from 'hooks/usePlanCommIds';
import { params } from 'utils/consts';
import { useCommsByIds } from 'hooks/useCommsByIds';
import { useEverbridgeToken } from 'hooks/useEverbridgeToken';

type Mode = 'LIVE' | 'SIMULATION' | 'PREVIEW';
type Priority = 'NORMAL' | 'HIGHPRIORITY' | 'LIFETHREATENING';
type LaunchedFrom = 'API' | 'UI' | 'ORCHESTRATION' | 'CRITICALEVENT' | 'SAFETYMESSAGE';

type ContextVar = { variableId: string; valueType: 'single' | 'multi'; value: string; values: string[] };
type RecipientEntry = { kind: 'ExternalId'; externalId: string } | { kind: 'Id'; id: string } | { kind: 'Name'; firstName: string; lastName: string };

type GroupEntry = { kind: 'Id'; id: string } | { kind: 'Name'; name: string };
type RuleEntry = { kind: 'Id'; id: string } | { kind: 'Name'; name: string };

type MessageContent = {
  type: 'Textual' | 'WebPage' | 'Audio';
  contentType: string;
  title: string;
  content: string;
  paths: string[]; // e.g. ["CATEGORY:EMAIL"]
  attachments: string[];
  usePrefix?: boolean;
  additionalContent?: string; // for WebPage
};

type PublicMessageType = 'WebWidget' | 'AlertUs' | 'GenericOneWay' | 'AudioBulletinBoard' | 'SocialMedia' | 'MemberPortal' | 'Network' | 'CAPPublicMessage';

type PublicMessage = { type: PublicMessageType; title?: string; body?: string } & Record<string, any>;

const CommsTab = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const tokenResponse = useEverbridgeToken();
  const commsTemplates = useCommTemplates({}, { token: tokenResponse });
  const commEventTypes = useCommEventTypes({ token: tokenResponse });

  // Use the list view (useComms) for local development for convenience.
  const comms = useComms({}, { enabled: isDev, token: tokenResponse });

  const launchComm = useLaunchComm(tokenResponse);
  const bcicPlanCommIds = usePlanCommIds(params.id); //Passes a plan id
  const planComms = useCommsByIds(bcicPlanCommIds.ids, { enabled: !isDev && bcicPlanCommIds.ids.length > 0, token: tokenResponse });

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // --- Top-level fields ---
  const [title, setTitle] = useState(`Comms Test - ${new Date().toLocaleString()}`);
  const [description, setDescription] = useState(`Description ${new Date().toLocaleString()}`);
  const [mode, setMode] = useState<Mode>('LIVE');

  const [publicSafety, setPublicSafety] = useState(false);
  const [exercise, setExercise] = useState(false);

  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [eventType, setEventType] = useState('General');
  const [launchedFrom, setLaunchedFrom] = useState<LaunchedFrom>('API');
  const [templateId, setTemplateId] = useState('commsTemplate://fbb1bcb8-c18d-41df-9207-f38e855896b7');

  // --- Context ---
  const [contextId, setContextId] = useState(''); // max 1 in spec
  const [contextVars, setContextVars] = useState<ContextVar[]>([]);

  // --- Settings (advanced) ---
  const [settingsEnabled, setSettingsEnabled] = useState(false);
  const [settingsJson, setSettingsJson] = useState('{\n  "sender": {},\n  "delivery": {},\n  "recipientInteraction": {}\n}');

  // --- Message ---
  const [messageContents, setMessageContents] = useState<MessageContent[]>([
    {
      type: 'Textual',
      contentType: 'text/plain',
      title: '',
      content: '',
      paths: ['CATEGORY:EMAIL'],
      attachments: [],
      usePrefix: false,
    },
  ]);

  // --- Recipients ---
  const [recipientsEnabled, setRecipientsEnabled] = useState(true);
  const [contactRecipients, setContactRecipients] = useState<RecipientEntry[]>([]);
  const [groupRecipients, setGroupRecipients] = useState<GroupEntry[]>([]);
  const [ruleRecipients, setRuleRecipients] = useState<RuleEntry[]>([]);
  const [excludedContacts, setExcludedContacts] = useState<RecipientEntry[]>([]);

  // --- Public Messages ---
  const [publicMessagesEnabled, setPublicMessagesEnabled] = useState(false);
  const [publicMessages, setPublicMessages] = useState<PublicMessage[]>([]);

  // --- Activity ---
  const [activityEnabled, setActivityEnabled] = useState(false);
  const [activityAction, setActivityAction] = useState<'FOLLOWUP' | 'UPDATE' | 'CLOSE'>('UPDATE');
  const [activityTarget, setActivityTarget] = useState('');

  const commsError = comms.error ?? null;

  const onRefreshComms = async () => {
    try {
      setIsManualRefreshing(true);

      if (isDev) {
        await comms.query.refetch();
      } else {
        // in prod: refresh plan ids + each comm query
        await bcicPlanCommIds.query.refetch();
        await Promise.all(planComms.queries.map((q) => q.refetch()));
      }
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const isFetchingActive = isDev ? comms.isFetching : bcicPlanCommIds.isFetching || planComms.isFetching;

  const commColumns = useMemo<ColumnDef<Comm>[]>(() => {
    return [
      {
        accessorKey: 'id',
        header: 'Comm ID',
        cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span>,
      },
      { accessorKey: 'title', header: 'Title' },
      { accessorKey: 'eventType', header: 'Event Type' },
      { accessorKey: 'status', header: 'Status' },
      { id: 'lastModifiedDate', header: 'Last Modified', cell: ({ row }) => formatDate(row.original.lastModifiedDate) },
    ];
  }, []);

  const commsPager = (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={comms.prevPage} disabled={comms.pageNumber <= 1}>
        Prev
      </Button>
      <div className="text-xs text-zinc-600">
        Page <strong className="text-zinc-900">{comms.pageNumber}</strong> / <strong className="text-zinc-900">{comms.totalPages}</strong>
      </div>
      <Button variant="secondary" size="sm" onClick={comms.nextPage} disabled={comms.pageNumber >= comms.totalPages}>
        Next
      </Button>
    </div>
  );

  // Choose what the table should display
  const tableRows = isDev ? comms.rows : planComms.rows;

  // These are for the Section header
  const totalCount = isDev ? comms.totalCount : planComms.loadedCount;
  const rightSide = isDev ? commsPager : null; // no pager in prod
  const tableError = isDev ? comms.error : (bcicPlanCommIds.error ?? planComms.error);

  function buildRecipientsPayload() {
    const contacts = contactRecipients.map((c) => {
      if (c.kind === 'ExternalId') return { type: 'ExternalId', externalId: c.externalId };
      if (c.kind === 'Id') return { type: 'Id', id: c.id };
      return { type: 'Name', firstName: c.firstName, lastName: c.lastName };
    });

    const groups = groupRecipients.map((g) => (g.kind === 'Id' ? { type: 'Id', id: g.id } : { type: 'Name', name: g.name }));
    const rules = ruleRecipients.map((r) => (r.kind === 'Id' ? { type: 'Id', id: r.id } : { type: 'Name', name: r.name }));

    const excluded = excludedContacts.length
      ? {
          contacts: excludedContacts.map((c) => {
            if (c.kind === 'ExternalId') return { type: 'ExternalId', externalId: c.externalId };
            if (c.kind === 'Id') return { type: 'Id', id: c.id };
            return { type: 'Name', firstName: c.firstName, lastName: c.lastName };
          }),
        }
      : undefined;

    const out: any = {};
    if (contacts.length) out.contacts = contacts;
    if (groups.length) out.groups = groups;
    if (rules.length) out.rules = rules;
    if (excluded) out.excluded = excluded;

    return Object.keys(out).length ? out : undefined;
  }

  function buildMessagePayload() {
    const contents = messageContents
      .filter((c) => c.title || c.content)
      .map((c) => {
        const base: any = {
          type: c.type,
          contentType: c.contentType,
          title: c.title,
          content: c.content,
          paths: c.paths.filter(Boolean),
        };
        if (c.attachments?.length) base.attachments = c.attachments.filter(Boolean);
        if (typeof c.usePrefix === 'boolean') base.usePrefix = c.usePrefix;
        if (c.type === 'WebPage' && c.additionalContent) base.additionalContent = c.additionalContent;
        return base;
      });

    return contents.length ? { contents } : undefined;
  }

  function buildSettingsPayload() {
    if (!settingsEnabled) return undefined;
    try {
      return JSON.parse(settingsJson);
    } catch {
      // keep UX: fail fast on launch with readable error
      throw new Error('Settings JSON is invalid (advanced section)');
    }
  }

  function buildContextPayload() {
    const variables = contextVars
      .filter((v) => v.variableId)
      .map((v) => ({
        variableId: v.variableId,
        value: v.valueType === 'multi' ? v.values.filter(Boolean) : v.value,
      }));

    const contextIds = contextId ? [contextId] : [];

    if (!variables.length && !contextIds.length) return undefined;

    return {
      ...(variables.length ? { variables } : {}),
      ...(contextIds.length ? { contextIds } : {}),
    };
  }

  function onLaunch() {
    // LaunchCommRequest
    const body: any = {
      title,
      mode,
      //   ...(description ? { description } : {}),
      //   ...(publicSafety ? { publicSafety } : {}),
      //   ...(exercise ? { exercise } : {}),
      //   ...(priority ? { priority } : {}),
      //   ...(eventType ? { eventType } : {}),
      //   ...(launchedFrom ? { launchedFrom } : {}),
      ...(templateId ? { templateId } : {}),
      //   ...(buildContextPayload() ? { context: buildContextPayload() } : {}),
      //   ...(buildSettingsPayload() ? { settings: buildSettingsPayload() } : {}),
      //   ...(buildMessagePayload() ? { message: buildMessagePayload() } : {}),
      //   ...(recipientsEnabled ? { recipients: buildRecipientsPayload() } : {}),
      //   ...(publicMessagesEnabled && publicMessages.length ? { publicMessages } : {}),
      //   ...(activityEnabled ? { activity: { action: activityAction, ...(activityTarget ? { target: activityTarget } : {}) } } : {}),
    };

    launchComm.mutate({ body });
  }

  useEffect(() => {}, []);

  return (
    <>
      {commsError ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(commsError, null, 2)}</pre> : null}

      <Section
        title="Launch Communication"
        tone="blue"
        description="No JSON editing required — fill out the fields below."
        right={launchComm.isPending ? <div className="text-xs text-emerald-700">Launching…</div> : null}>
        <div className="flex flex-col gap-6">
          {/* Required */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title *" hint="Required. Shown in the Communications interface (not the notification title).">
              <input
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Earthquake - Galesburg, Michigan"
              />
            </Field>

            <Field label="Mode *" hint="LIVE sends, SIMULATION launches without sending, PREVIEW renders only.">
              <select
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}>
                <option value="LIVE">LIVE</option>
                <option value="SIMULATION">SIMULATION</option>
                <option value="PREVIEW">PREVIEW</option>
              </select>
            </Field>
          </div>

          {/* Optional basics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Event Type">
              <select
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                disabled={commEventTypes.isLoading}>
                <option value="">{commEventTypes.isLoading ? 'Loading event types…' : 'Select an event type'}</option>

                {commEventTypes.rows.map((et) => (
                  <option key={et.id} value={et.name}>
                    {et.name}
                  </option>
                ))}
              </select>
            </Field>

            {commEventTypes.error ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(commEventTypes.error, null, 2)}</pre> : null}

            {/* <Field label="Priority">
              <select
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGHPRIORITY">HIGHPRIORITY</option>
                <option value="LIFETHREATENING">LIFETHREATENING</option>
              </select>
            </Field> */}

            {/* <Field label="Launched From">
              <select
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={launchedFrom}
                onChange={(e) => setLaunchedFrom(e.target.value as LaunchedFrom)}>
                <option value="API">API</option>
                <option value="UI">UI</option>
                <option value="ORCHESTRATION">ORCHESTRATION</option>
                <option value="CRITICALEVENT">CRITICALEVENT</option>
                <option value="SAFETYMESSAGE">SAFETYMESSAGE</option>
              </select>
            </Field> */}

            <Field label="Template">
              <select
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={commsTemplates.isLoading}>
                <option value="">{commsTemplates.isLoading ? 'Loading templates…' : 'Select a template (optional)'}</option>

                {commsTemplates.rows.map((t) => (
                  <option key={t.id} value={`commsTemplate://${t.id}`}>
                    {(t.title ?? t.name ?? t.id) + (t.eventType ? ` — ${t.eventType}` : '')}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Description" hint="Not shown to recipients (max 500 chars).">
              <textarea
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </Field>

            {/* <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={publicSafety} onChange={(e) => setPublicSafety(e.target.checked)} />
                Public Safety
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={exercise} onChange={(e) => setExercise(e.target.checked)} />
                Exercise mode
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={recipientsEnabled} onChange={(e) => setRecipientsEnabled(e.target.checked)} />
                Include Recipients in request (otherwise template recipients may be used)
              </label>
            </div> */}
          </div>

          {/* Context */}
          {/* <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Context</div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Context ID (max 1)" hint="Format: shortName://sourceId">
                <input
                  className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={contextId}
                  onChange={(e) => setContextId(e.target.value)}
                  placeholder="cema://12345"
                />
              </Field>

              <div />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">Context Variables</div>
                <Button variant="secondary" size="sm" onClick={() => setContextVars((v) => [...v, { variableId: '', valueType: 'single', value: '', values: [] }])}>
                  Add variable
                </Button>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {contextVars.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                      value={v.variableId}
                      onChange={(e) => {
                        const next = [...contextVars];
                        next[idx] = { ...next[idx], variableId: e.target.value };
                        setContextVars(next);
                      }}
                      placeholder="variableId"
                    />
                    <select
                      className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                      value={v.valueType}
                      onChange={(e) => {
                        const next = [...contextVars];
                        next[idx] = { ...next[idx], valueType: e.target.value as any };
                        setContextVars(next);
                      }}>
                      <option value="single">Single</option>
                      <option value="multi">Multi</option>
                    </select>

                    {v.valueType === 'single' ? (
                      <input
                        className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
                        value={v.value}
                        onChange={(e) => {
                          const next = [...contextVars];
                          next[idx] = { ...next[idx], value: e.target.value };
                          setContextVars(next);
                        }}
                        placeholder="value"
                      />
                    ) : (
                      <input
                        className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
                        value={v.values.join(', ')}
                        onChange={(e) => {
                          const next = [...contextVars];
                          next[idx] = {
                            ...next[idx],
                            values: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setContextVars(next);
                        }}
                        placeholder="values (comma-separated)"
                      />
                    )}

                    <div className="md:col-span-4">
                      <Button variant="secondary" size="sm" onClick={() => setContextVars((arr) => arr.filter((_, i) => i !== idx))}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div> */}

          {/* Message */}
          {/* <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Message</div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMessageContents((c) => [...c, { type: 'Textual', contentType: 'text/plain', title: '', content: '', paths: ['CATEGORY:EMAIL'], attachments: [], usePrefix: false }])}>
                Add message body
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-4">
              {messageContents.map((c, idx) => (
                <div key={idx} className="rounded-xl bg-zinc-50 ring-1 ring-zinc-200 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Type">
                      <select
                        className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                        value={c.type}
                        onChange={(e) => {
                          const next = [...messageContents];
                          next[idx] = { ...next[idx], type: e.target.value as any };
                          setMessageContents(next);
                        }}>
                        <option value="Textual">Textual</option>
                        <option value="WebPage">WebPage</option>
                        <option value="Audio">Audio</option>
                      </select>
                    </Field>

                    <Field label="Content-Type">
                      <input
                        className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                        value={c.contentType}
                        onChange={(e) => {
                          const next = [...messageContents];
                          next[idx] = { ...next[idx], contentType: e.target.value };
                          setMessageContents(next);
                        }}
                        placeholder="text/plain"
                      />
                    </Field>

                    <Field label="Notification Title">
                      <input
                        className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                        value={c.title}
                        onChange={(e) => {
                          const next = [...messageContents];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setMessageContents(next);
                        }}
                      />
                    </Field>

                    <Field label="Paths (comma-separated)" hint="Example: CATEGORY:EMAIL, CATEGORY:SMS">
                      <input
                        className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                        value={c.paths.join(', ')}
                        onChange={(e) => {
                          const next = [...messageContents];
                          next[idx] = {
                            ...next[idx],
                            paths: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setMessageContents(next);
                        }}
                      />
                    </Field>

                    <Field label="Content" hint="Body text (or audio URL reference depending on your setup).">
                      <textarea
                        className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                        value={c.content}
                        onChange={(e) => {
                          const next = [...messageContents];
                          next[idx] = { ...next[idx], content: e.target.value };
                          setMessageContents(next);
                        }}
                        rows={4}
                      />
                    </Field>

                    <Field label="Attachments (IDs, comma-separated)" hint="Previously uploaded attachment IDs.">
                      <input
                        className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                        value={c.attachments.join(', ')}
                        onChange={(e) => {
                          const next = [...messageContents];
                          next[idx] = {
                            ...next[idx],
                            attachments: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setMessageContents(next);
                        }}
                      />
                    </Field>
                  </div>

                  {c.type === 'WebPage' ? (
                    <div className="mt-3">
                      <Field label="Additional Content (WebPage only)">
                        <textarea
                          className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                          value={c.additionalContent ?? ''}
                          onChange={(e) => {
                            const next = [...messageContents];
                            next[idx] = { ...next[idx], additionalContent: e.target.value };
                            setMessageContents(next);
                          }}
                          rows={3}
                        />
                      </Field>
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setMessageContents((arr) => arr.filter((_, i) => i !== idx))}>
                      Remove message body
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div> */}

          {/* Recipients (no JSON — add/remove rows) */}
          {recipientsEnabled ? (
            <></>
          ) : // <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-4">
          //   <div className="font-medium text-sm">Recipients</div>

          //   {/* Contacts */}
          //   <div className="mt-4">
          //     <div className="flex items-center justify-between">
          //       <div className="text-sm font-medium">Contacts</div>
          //       <Button variant="secondary" size="sm" onClick={() => setContactRecipients((a) => [...a, { kind: 'ExternalId', externalId: '' }])}>
          //         Add contact
          //       </Button>
          //     </div>

          //     <div className="mt-2 flex flex-col gap-2">
          //       {contactRecipients.map((c, idx) => (
          //         <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          //           <select
          //             className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
          //             value={c.kind}
          //             onChange={(e) => {
          //               const kind = e.target.value as RecipientEntry['kind'];
          //               const next = [...contactRecipients];
          //               next[idx] = kind === 'ExternalId' ? { kind: 'ExternalId', externalId: '' } : kind === 'Id' ? { kind: 'Id', id: '' } : { kind: 'Name', firstName: '', lastName: '' };
          //               setContactRecipients(next);
          //             }}>
          //             <option value="ExternalId">ExternalId</option>
          //             <option value="Id">Id</option>
          //             <option value="Name">Name</option>
          //           </select>

          //           {c.kind === 'ExternalId' ? (
          //             <input
          //               className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
          //               value={c.externalId}
          //               onChange={(e) => {
          //                 const next = [...contactRecipients];
          //                 next[idx] = { ...c, externalId: e.target.value } as any;
          //                 setContactRecipients(next);
          //               }}
          //               placeholder="externalId"
          //             />
          //           ) : c.kind === 'Id' ? (
          //             <input
          //               className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
          //               value={c.id}
          //               onChange={(e) => {
          //                 const next = [...contactRecipients];
          //                 next[idx] = { ...c, id: e.target.value } as any;
          //                 setContactRecipients(next);
          //               }}
          //               placeholder="id"
          //             />
          //           ) : (
          //             <div className="md:col-span-2 grid grid-cols-2 gap-2">
          //               <input
          //                 className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
          //                 value={c.firstName}
          //                 onChange={(e) => {
          //                   const next = [...contactRecipients];
          //                   next[idx] = { ...c, firstName: e.target.value } as any;
          //                   setContactRecipients(next);
          //                 }}
          //                 placeholder="firstName"
          //               />
          //               <input
          //                 className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
          //                 value={c.lastName}
          //                 onChange={(e) => {
          //                   const next = [...contactRecipients];
          //                   next[idx] = { ...c, lastName: e.target.value } as any;
          //                   setContactRecipients(next);
          //                 }}
          //                 placeholder="lastName"
          //               />
          //             </div>
          //           )}

          //           <Button variant="secondary" size="sm" onClick={() => setContactRecipients((arr) => arr.filter((_, i) => i !== idx))}>
          //             Remove
          //           </Button>
          //         </div>
          //       ))}
          //     </div>
          //   </div>

          //   {/* Groups */}
          //   <div className="mt-6">
          //     <div className="flex items-center justify-between">
          //       <div className="text-sm font-medium">Groups</div>
          //       <Button variant="secondary" size="sm" onClick={() => setGroupRecipients((a) => [...a, { kind: 'Id', id: '' }])}>
          //         Add group
          //       </Button>
          //     </div>

          //     <div className="mt-2 flex flex-col gap-2">
          //       {groupRecipients.map((g, idx) => (
          //         <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          //           <select
          //             className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
          //             value={g.kind}
          //             onChange={(e) => {
          //               const kind = e.target.value as any;
          //               const next = [...groupRecipients];
          //               next[idx] = kind === 'Id' ? { kind: 'Id', id: '' } : { kind: 'Name', name: '' };
          //               setGroupRecipients(next);
          //             }}>
          //             <option value="Id">Id</option>
          //             <option value="Name">Name</option>
          //           </select>

          //           {g.kind === 'Id' ? (
          //             <input
          //               className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
          //               value={g.id}
          //               onChange={(e) => {
          //                 const next = [...groupRecipients];
          //                 next[idx] = { ...g, id: e.target.value };
          //                 setGroupRecipients(next);
          //               }}
          //               placeholder="group id"
          //             />
          //           ) : (
          //             <input
          //               className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
          //               value={g.name}
          //               onChange={(e) => {
          //                 const next = [...groupRecipients];
          //                 next[idx] = { ...g, name: e.target.value };
          //                 setGroupRecipients(next);
          //               }}
          //               placeholder="group name"
          //             />
          //           )}

          //           <Button variant="secondary" size="sm" onClick={() => setGroupRecipients((arr) => arr.filter((_, i) => i !== idx))}>
          //             Remove
          //           </Button>
          //         </div>
          //       ))}
          //     </div>
          //   </div>

          //   {/* Rules */}
          //   <div className="mt-6">
          //     <div className="flex items-center justify-between">
          //       <div className="text-sm font-medium">Rules (Filters)</div>
          //       <Button variant="secondary" size="sm" onClick={() => setRuleRecipients((a) => [...a, { kind: 'Id', id: '' }])}>
          //         Add rule
          //       </Button>
          //     </div>

          //     <div className="mt-2 flex flex-col gap-2">
          //       {ruleRecipients.map((r, idx) => (
          //         <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          //           <select
          //             className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
          //             value={r.kind}
          //             onChange={(e) => {
          //               const kind = e.target.value as any;
          //               const next = [...ruleRecipients];
          //               next[idx] = kind === 'Id' ? { kind: 'Id', id: '' } : { kind: 'Name', name: '' };
          //               setRuleRecipients(next);
          //             }}>
          //             <option value="Id">Id</option>
          //             <option value="Name">Name</option>
          //           </select>

          //           {r.kind === 'Id' ? (
          //             <input
          //               className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
          //               value={r.id}
          //               onChange={(e) => {
          //                 const next = [...ruleRecipients];
          //                 next[idx] = { ...r, id: e.target.value };
          //                 setRuleRecipients(next);
          //               }}
          //               placeholder="rule id"
          //             />
          //           ) : (
          //             <input
          //               className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
          //               value={r.name}
          //               onChange={(e) => {
          //                 const next = [...ruleRecipients];
          //                 next[idx] = { ...r, name: e.target.value };
          //                 setRuleRecipients(next);
          //               }}
          //               placeholder="rule name"
          //             />
          //           )}

          //           <Button variant="secondary" size="sm" onClick={() => setRuleRecipients((arr) => arr.filter((_, i) => i !== idx))}>
          //             Remove
          //           </Button>
          //         </div>
          //       ))}
          //     </div>
          //   </div>

          //   {/* Excluded */}
          //   <div className="mt-6">
          //     <div className="flex items-center justify-between">
          //       <div className="text-sm font-medium">Excluded Contacts</div>
          //       <Button variant="secondary" size="sm" onClick={() => setExcludedContacts((a) => [...a, { kind: 'ExternalId', externalId: '' }])}>
          //         Add excluded contact
          //       </Button>
          //     </div>

          //     <div className="mt-2 flex flex-col gap-2">
          //       {excludedContacts.map((c, idx) => (
          //         <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          //           <select
          //             className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
          //             value={c.kind}
          //             onChange={(e) => {
          //               const kind = e.target.value as any;
          //               const next = [...excludedContacts];
          //               next[idx] = kind === 'ExternalId' ? { kind: 'ExternalId', externalId: '' } : kind === 'Id' ? { kind: 'Id', id: '' } : { kind: 'Name', firstName: '', lastName: '' };
          //               setExcludedContacts(next);
          //             }}>
          //             <option value="ExternalId">ExternalId</option>
          //             <option value="Id">Id</option>
          //             <option value="Name">Name</option>
          //           </select>

          //           {c.kind === 'ExternalId' ? (
          //             <input
          //               className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
          //               value={c.externalId}
          //               onChange={(e) => {
          //                 const next = [...excludedContacts];
          //                 next[idx] = { ...c, externalId: e.target.value } as any;
          //                 setExcludedContacts(next);
          //               }}
          //               placeholder="externalId"
          //             />
          //           ) : c.kind === 'Id' ? (
          //             <input
          //               className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm md:col-span-2"
          //               value={c.id}
          //               onChange={(e) => {
          //                 const next = [...excludedContacts];
          //                 next[idx] = { ...c, id: e.target.value } as any;
          //                 setExcludedContacts(next);
          //               }}
          //               placeholder="id"
          //             />
          //           ) : (
          //             <div className="md:col-span-2 grid grid-cols-2 gap-2">
          //               <input
          //                 className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
          //                 value={(c as any).firstName}
          //                 onChange={(e) => {
          //                   const next = [...excludedContacts];
          //                   next[idx] = { ...(c as any), firstName: e.target.value };
          //                   setExcludedContacts(next as any);
          //                 }}
          //                 placeholder="firstName"
          //               />
          //               <input
          //                 className="rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
          //                 value={(c as any).lastName}
          //                 onChange={(e) => {
          //                   const next = [...excludedContacts];
          //                   next[idx] = { ...(c as any), lastName: e.target.value };
          //                   setExcludedContacts(next as any);
          //                 }}
          //                 placeholder="lastName"
          //               />
          //             </div>
          //           )}

          //           <Button variant="secondary" size="sm" onClick={() => setExcludedContacts((arr) => arr.filter((_, i) => i !== idx))}>
          //             Remove
          //           </Button>
          //         </div>
          //       ))}
          //     </div>
          //   </div>
          // </div>
          null}

          {/* Public Messages */}
          {/* <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publicMessagesEnabled} onChange={(e) => setPublicMessagesEnabled(e.target.checked)} />
              Include Public Messages
            </label>

            {publicMessagesEnabled ? (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Public Messages</div>
                  <Button variant="secondary" size="sm" onClick={() => setPublicMessages((a) => [...a, { type: 'WebWidget', title: '', body: '' }])}>
                    Add public message
                  </Button>
                </div>

                {publicMessages.map((pm, idx) => (
                  <div key={idx} className="rounded-xl bg-zinc-50 ring-1 ring-zinc-200 p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Type">
                        <select
                          className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                          value={pm.type}
                          onChange={(e) => {
                            const t = e.target.value as PublicMessageType;
                            const next = [...publicMessages];
                            next[idx] = { type: t, title: '', body: '' };
                            setPublicMessages(next);
                          }}>
                          <option value="WebWidget">WebWidget</option>
                          <option value="AlertUs">AlertUs</option>
                          <option value="GenericOneWay">GenericOneWay</option>
                          <option value="AudioBulletinBoard">AudioBulletinBoard</option>
                          <option value="SocialMedia">SocialMedia</option>
                          <option value="MemberPortal">MemberPortal</option>
                          <option value="Network">Network</option>
                          <option value="CAPPublicMessage">CAPPublicMessage</option>
                        </select>
                      </Field>

                      <Field label="Title">
                        <input
                          className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                          value={pm.title ?? ''}
                          onChange={(e) => {
                            const next = [...publicMessages];
                            next[idx] = { ...pm, title: e.target.value };
                            setPublicMessages(next);
                          }}
                        />
                      </Field>

                      <Field label="Body" hint="Some types use different fields; this is a safe starter field.">
                        <textarea
                          className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                          value={pm.body ?? ''}
                          onChange={(e) => {
                            const next = [...publicMessages];
                            next[idx] = { ...pm, body: e.target.value };
                            setPublicMessages(next);
                          }}
                          rows={3}
                        />
                      </Field>
                    </div>

                    <div className="mt-3">
                      <Button variant="secondary" size="sm" onClick={() => setPublicMessages((arr) => arr.filter((_, i) => i !== idx))}>
                        Remove public message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div> */}

          {/* Activity */}
          {/* <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={activityEnabled} onChange={(e) => setActivityEnabled(e.target.checked)} />
              Include Activity
            </label>

            {activityEnabled ? (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Action">
                  <select className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm" value={activityAction} onChange={(e) => setActivityAction(e.target.value as any)}>
                    <option value="FOLLOWUP">FOLLOWUP</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="CLOSE">CLOSE</option>
                  </select>
                </Field>

                <Field label="Target Comm ID" hint="Required for follow-up/update/close flows in many cases.">
                  <input
                    className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm"
                    value={activityTarget}
                    onChange={(e) => setActivityTarget(e.target.value)}
                    placeholder="existing communication id"
                  />
                </Field>
              </div>
            ) : null}
          </div> */}

          {/* Advanced Settings */}
          {/* <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settingsEnabled} onChange={(e) => setSettingsEnabled(e.target.checked)} />
              Advanced: Include Settings
            </label>

            {settingsEnabled ? (
              <div className="mt-3">
                <textarea
                  className="w-full min-h-[160px] font-mono text-xs p-3 rounded-xl bg-white ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={settingsJson}
                  onChange={(e) => setSettingsJson(e.target.value)}
                />
                <div className="mt-2 text-xs text-zinc-500">
                  This is the only “raw” section left — if you want, paste the exact ApiSettings schema fields you care about and I’ll convert this to full form fields too.
                </div>
              </div>
            ) : null}
          </div> */}

          {/* Launch button + results */}
          <div className="flex items-start gap-3 flex-wrap">
            <Button onClick={onLaunch} disabled={launchComm.isPending || !title}>
              Launch
            </Button>

            {launchComm.isError ? (
              <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs max-w-full">
                {JSON.stringify(
                  {
                    message: (launchComm.error as any)?.message,
                    status: (launchComm.error as any)?.status,
                    data: (launchComm.error as any)?.data,
                  },
                  null,
                  2
                )}
              </pre>
            ) : null}

            {launchComm.isSuccess ? (
              <pre className="text-emerald-800 bg-emerald-50 ring-1 ring-emerald-200 p-3 rounded-xl overflow-auto text-xs max-w-full">{JSON.stringify(launchComm.data, null, 2)}</pre>
            ) : null}
          </div>
        </div>
      </Section>

      {/* Comms table */}
      <Section
        title="Communications"
        description={`Total: ${totalCount}`}
        tone="blue"
        right={rightSide}
        onRefresh={onRefreshComms}
        refreshing={isManualRefreshing}
        refreshDisabled={isManualRefreshing || isFetchingActive}>
        <DataTable data={tableRows} columns={commColumns} emptyText={isDev ? 'No communications found.' : 'No communications found for this plan.'} />
      </Section>

      {tableError ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(tableError, null, 2)}</pre> : null}
    </>
  );
};

export default CommsTab;
