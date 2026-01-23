import { useMemo, useState, useEffect, useRef } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '../../../../components/ui/button';
import { Field, Section } from '../../components';
import { DataTable } from '../../../../components/DataTable';
import { useLaunchComm } from '../../../../hooks/comms/launch/useLaunchComm';
import { useCommTemplates } from 'hooks/comms/list/useCommTemplates';
import { useCommEventTypes } from 'hooks/comms/list/useCommEventTypes';
import { params } from 'utils/consts';
import { useEverbridgeToken } from 'hooks/useEverbridgeToken';
import { Select } from '../../components/Select';
import { useStopComm } from 'hooks/comms/launch/useStopComm';
import { CommDetailView } from './CommsDetailView';
import { useCommTemplateById } from 'hooks/comms/list/useCommTemplatesByIds';
import VariableFields from './VariableFields/VariableFields';
import RecipientsPreviewPanel from './RecipientsPreviewPanel';
import getCommColumns from './commColumns';
import { useCommsList } from 'hooks/comms/list/useCommsList';
import type { Comm } from '../../../../hooks/comms/list/useComms';
import CommsPager from './CommsPager';
import { ValidationResult } from './VariableFields/types';
import { useValidPermissions } from 'hooks/useValidPermissions';

type Mode = 'LIVE' | 'SIMULATION' | 'PREVIEW';

const CommsTab = () => {
  const tokenResponse = useEverbridgeToken();
  const commsTemplates = useCommTemplates({}, { token: tokenResponse, planType: params.planType });
  const commEventTypes = useCommEventTypes({ token: tokenResponse });
  const permissions = useValidPermissions();

  const { comms, page, setPage, totalIds, totalPages, isDev } = useCommsList({ token: tokenResponse, planId: params.id, pageSize: 10, enabled: true });
  const { error: commsError, isFetching: commsFetching, refetch: commsRefetch, rows: commsRows, totalCount: commsTotalCount } = comms;

  const onRefreshComms = async () => {
    try {
      setIsManualRefreshing(true);
      if (commsRefetch) await commsRefetch();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const launchComm = useLaunchComm(tokenResponse);
  const stopComm = useStopComm(tokenResponse);

  const commColumns = useMemo<ColumnDef<Comm>[]>(() => {
    return getCommColumns({
      onSelect: (comm) => setSelected({ id: comm.id, row: comm }),
      stopComm,
      permissions,
    });
  }, [stopComm, permissions]);

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [selected, setSelected] = useState<{ id: string; row?: Comm | null } | null>(null);

  const [title, setTitle] = useState(`Comms Test - ${new Date().toLocaleString()}`);
  const [mode, setMode] = useState<Mode>('LIVE');
  const [eventType, setEventType] = useState('General');
  const [templateId, setTemplateId] = useState<string>('');
  const [description, setDescription] = useState(`Description ${new Date().toLocaleString()}`);

  const [variableValidationMessages, setVariableValidationMessages] = useState<string[] | null>(null);
  const variableFieldsRef = useRef<{ validate: () => Promise<ValidationResult> } | null>(null);

  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const isLocked = showLaunchConfirm || launchComm.isPending;

  const templateDetailQuery = useCommTemplateById(templateId, {
    token: tokenResponse,
    enabled: Boolean(templateId),
  });
  const { template: templateDetail } = templateDetailQuery;
  const templateVars = templateDetail?.variables ?? [];

  // Reset variable-related launch state when template changes
  useEffect(() => {
    setVariableValidationMessages(null);
    setShowLaunchConfirm(false);
  }, [templateId]);

  function buildLaunchBody(contextVariables?: Array<{ variableId: string; value: string | string[] }>) {
    const body: any = {
      title,
      mode,
      ...(description ? { description } : {}),
      ...(eventType ? { eventType } : {}),
      templateId: `commsTemplate://${templateId}`,
      ...(contextVariables?.length ? { context: { variables: contextVariables } } : {}),
    };

    return body;
  }

  async function handleLaunch(confirm = false) {
    if (!templateId) {
      alert('Please select a template before launching this communication.');
      return;
    }

    if (templateDetailQuery.isFetching) return;

    if (confirm) {
      // Confirm click: launch using latest vars from VariableFields (no extra state)
      const result = await variableFieldsRef.current?.validate?.();
      if (!result?.ok) {
        setShowLaunchConfirm(false);
        setVariableValidationMessages(result?.messages?.length ? result.messages : ['Please fix the variables highlighted below.']);
        return;
      }

      setVariableValidationMessages(null);
      const body = buildLaunchBody(result.contextVariables ?? undefined);
      launchComm.mutate({ body });
      return;
    }

    // First click: validate, then show confirm
    setVariableValidationMessages(null);

    const result = await variableFieldsRef.current?.validate?.();
    if (!result?.ok) {
      setShowLaunchConfirm(false);
      setVariableValidationMessages(result?.messages?.length ? result.messages : ['Please fix the variables highlighted below.']);
      return;
    }

    setShowLaunchConfirm(true);
  }

  if (selected) {
    const useFullRow = !isDev;
    const isStopped = selected.row?.notificationStatus?.toLowerCase() === 'stopped' || selected.row?.notificationStatus === 'completed';

    return (
      <CommDetailView
        commId={selected.id}
        token={tokenResponse}
        useFullRow={useFullRow}
        fullRow={selected.row}
        onBack={() => setSelected(null)}
        right={
          permissions.includes('bc.comms.launch') && (
            <Button variant="destructive" size="sm" disabled={stopComm.isPending || isStopped} onClick={() => stopComm.mutate({ commId: selected.id })}>
              Stop
            </Button>
          )
        }
      />
    );
  }

  return (
    <>
      {commsError ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(commsError, null, 2)}</pre> : null}

      {permissions.includes('bc.comms.launch') && (
        <Section title="Launch Communication" tone="blue" description="Fill out the fields below." right={launchComm.isPending ? <div className="text-xs text-emerald-700">Launching…</div> : null}>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Title" required>
                <input
                  className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-zinc-50 disabled:text-zinc-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Earthquake - Galesburg, Michigan"
                  disabled={isLocked}
                />
              </Field>

              <Field label="Mode" required>
                <Select value={mode} onChange={(e) => setMode(e.target.value as Mode)} disabled={isLocked}>
                  <option value="LIVE">LIVE</option>
                  <option value="SIMULATION">SIMULATION</option>
                  <option value="PREVIEW">PREVIEW</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Event Type">
                <Select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  disabled={commEventTypes.isLoading || isLocked}
                  isLoading={commEventTypes.isLoading}
                  loadingText="Loading event types…">
                  <option value="">{commEventTypes.isLoading ? 'Loading event types…' : 'Select an event type'}</option>
                  {commEventTypes.rows.map((et) => (
                    <option key={et.id} value={et.name}>
                      {et.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Template" required>
                <Select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={commsTemplates.isLoading || isLocked}
                  isLoading={commsTemplates.isLoading}
                  loadingText="Loading templates…">
                  <option value="">{commsTemplates.isLoading ? 'Loading templates…' : 'Select a template'}</option>
                  {commsTemplates.rows.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Description">
              <textarea
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-zinc-50 disabled:text-zinc-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isLocked}
              />
            </Field>

            {templateId ? (
              <VariableFields
                ref={variableFieldsRef}
                templateVariables={templateVars}
                templateId={templateId}
                tokenResponse={tokenResponse}
                selections={params.variableSelections ?? []}
                disabled={isLocked}
              />
            ) : null}

            {showLaunchConfirm ? (
              <RecipientsPreviewPanel
                title={title}
                templateId={templateId}
                selectedTemplateDetail={templateDetail}
                isTemplateDetailMissing={Boolean(templateId && !templateDetail)}
                isPending={launchComm.isPending}
                onCancel={() => setShowLaunchConfirm(false)}
                onConfirm={() => {
                  setShowLaunchConfirm(false);
                  handleLaunch(true);
                }}
              />
            ) : null}

            {variableValidationMessages?.length ? (
              <div className="rounded-xl bg-red-50 ring-1 ring-red-200 p-3">
                <div className="text-sm font-medium text-red-800">Please fix the following:</div>
                <ul className="mt-2 list-disc pl-5 text-xs text-red-800 space-y-1">
                  {variableValidationMessages.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex items-start gap-3 flex-wrap">
              <Button onClick={() => handleLaunch()} disabled={showLaunchConfirm || launchComm.isPending || !title || !templateId || templateDetailQuery.isFetching}>
                {templateDetailQuery.isFetching ? 'Loading template…' : 'Launch'}
              </Button>
            </div>

            {launchComm.isSuccess && launchComm.data ? (
              <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3">
                <div className="text-sm font-medium text-emerald-800">Launch succeeded</div>
                <pre className="mt-2 overflow-auto rounded-lg p-2 text-xs text-emerald-900">{JSON.stringify(launchComm.data, null, 2)}</pre>
              </div>
            ) : null}

            {launchComm.isError ? (
              <div className="rounded-xl bg-red-50 ring-1 ring-red-200 p-3">
                <div className="text-sm font-medium text-red-800">Launch failed</div>
                <pre className="mt-2 overflow-auto rounded-lg p-2 text-xs text-red-900">{JSON.stringify(launchComm.error, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        </Section>
      )}

      {permissions.includes('bc.comms.list') && (
        <Section
          title="Communications"
          description={`Total: ${commsTotalCount}`}
          tone="blue"
          right={<CommsPager comms={comms} page={page} setPage={setPage} totalIds={totalIds} totalPages={totalPages} />}
          onRefresh={onRefreshComms}
          refreshing={isManualRefreshing}
          refreshDisabled={isManualRefreshing || commsFetching}>
          <DataTable data={commsRows} columns={commColumns} emptyText={isDev ? 'No communications found.' : 'No communications found for this plan.'} />{' '}
        </Section>
      )}
    </>
  );
};

export default CommsTab;
