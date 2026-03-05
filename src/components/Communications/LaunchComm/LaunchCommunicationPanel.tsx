import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLaunchComm } from 'hooks/comms/launch/useLaunchComm';
import { useCommTemplates, useCommEventTypes, useCommTemplateById } from 'hooks/comms/list';
import { params } from 'utils/consts';
import { ValidationResult } from './VariableFields/types';
import { useToasts } from 'hooks/useToasts';
import LaunchHeader from './LaunchHeader';
import EventAndTemplateCard from './EventTemplateCard';
import { PreviewMessages } from './VariableFields/PreviewMessage';
import { useCommVariables } from 'hooks/comms/launch/useCommVariables';
import LaunchActionBar from './LaunchActionBar';

type Mode = 'LIVE' | 'SIMULATION' | 'PREVIEW';

function formatTitleForEvent(eventType: string) {
  const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const left = eventType && eventType.trim() ? eventType.trim() : 'Generic';
  return `${left} - ${dateStr}`;
}

const LaunchCommunicationPanel = ({ tokenResponse, permissions, setActiveTab }) => {
  const isDev = process.env.NODE_ENV === 'development';
  const isStandalone = params.standaloneMode;

  // Hooks
  const { pushToast } = useToasts();
  const commsTemplates = useCommTemplates({}, { token: tokenResponse, planType: params.planType, standaloneMode: params.standaloneMode });
  const commEventTypes = useCommEventTypes({ token: tokenResponse });
  const launchComm = useLaunchComm(tokenResponse, setActiveTab);

  // Event type - default to first from API, or "General"
  const [eventType, setEventType] = useState<string>('General');

  // Title
  const [title, setTitle] = useState<string>(() => formatTitleForEvent('General'));
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);

  // Description
  const [description, setDescription] = useState('');

  // Mode - always live right now
  const mode: Mode = 'LIVE';

  // Template
  const [templateId, setTemplateId] = useState<string>('');

  // Variables & Validation
  const [variableValidationMessages, setVariableValidationMessages] = useState<string[] | null>(null);
  const variableFieldsRef = useRef<{
    validate?: () => Promise<ValidationResult>;
    getValues?: () => Record<string, any>;
  } | null>(null);
  const [valuesById, setValuesById] = useState<Record<string, string | string[] | null>>({});
  const variablesQuery = useCommVariables({ tokenResponse, enabled: Boolean(templateId), pageSize: 500 });
  const variableDefs = variablesQuery?.data ?? [];

  // Confirmation state
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const isLocked = showLaunchConfirm || launchComm.isPending;

  const templateDetailQuery = useCommTemplateById(templateId, { token: tokenResponse, enabled: Boolean(templateId) });
  const { template: templateDetail } = templateDetailQuery;
  const templateVars = templateDetail?.variables ?? [];
  const hasTemplate = Boolean(templateId);

  // template defaults by id (from templateDetail.variables)
  const templateDefaultsById = useMemo(() => {
    const map: Record<string, any> = {};
    (templateDetail?.variables ?? []).forEach((v: any) => {
      map[v.variableId] = v.value ?? null;
    });
    return map;
  }, [templateDetail?.variables]);

  // merged values (UI edits override template values)
  const mergedValuesById = useMemo(() => ({ ...templateDefaultsById, ...(valuesById ?? {}) }), [templateDefaultsById, valuesById]);

  const resetLaunch = () => {
    setTitle('General');
    setTemplateId('');
  };

  function buildLaunchBody(contextVariables?: Array<{ variableId: string; value: string | string[] }>) {
    return {
      title,
      mode,
      ...(description ? { description } : {}),
      ...(eventType ? { eventType } : {}),
      templateId: `commsTemplate://${templateId}`,
      ...(contextVariables?.length ? { context: { variables: contextVariables } } : {}),
    };
  }

  async function handleLaunch(confirm = false) {
    if (!templateId) {
      alert('Please select a template before launching this communication.');
      return;
    }
    if (templateDetailQuery.isFetching) return;

    const result = await variableFieldsRef.current?.validate?.();
    if (!result?.ok) {
      setShowLaunchConfirm(false);
      setVariableValidationMessages(result?.messages?.length ? result.messages : ['Please fix the variables highlighted below.']);
      return;
    }

    setVariableValidationMessages(null);

    if (!confirm) {
      setShowLaunchConfirm(true);
      return;
    }

    const body = buildLaunchBody(result.contextVariables ?? undefined);
    launchComm.mutate({ body });
  }

  // Update event type from API if it loads later
  useEffect(() => {
    if (!commEventTypes.isLoading && commEventTypes.rows?.length) {
      const firstName = commEventTypes.rows[0].name ?? 'General';
      setEventType((prev) => (prev ? prev : firstName));
    }
  }, [commEventTypes.isLoading, commEventTypes.rows]);

  // Auto-title updates when eventType changes, unless manually edited
  useEffect(() => {
    if (!titleManuallyEdited) {
      setTitle(formatTitleForEvent(eventType));
    }
  }, [eventType, titleManuallyEdited]);

  // Clear validation messages and confirmation if template changes
  useEffect(() => {
    setVariableValidationMessages(null);
    setShowLaunchConfirm(false);
  }, [templateId]);

  // On launch success, reset state and show toast
  useEffect(() => {
    if (launchComm.isSuccess && launchComm.data) {
      setTemplateId('');
      pushToast({ type: 'success', title: 'Launch succeeded', message: 'Communication launched successfully.' });
    }
  }, [launchComm.isSuccess, launchComm.data, pushToast]);

  // On launch error, show toast with message extraction
  useEffect(() => {
    if (launchComm.isError) {
      let msg = 'Launch failed.';
      try {
        const err = launchComm.error as any;
        if (err?.message) msg = err.message;
        else if (err?.toString) msg = String(err);
      } catch {}
      pushToast({ type: 'error', title: 'Launch failed', message: msg });
    }
  }, [launchComm.isError, launchComm.error, pushToast]);

  // Update variables
  useEffect(() => {
    try {
      const live = variableFieldsRef.current?.getValues?.() ?? {};
      if (live && Object.keys(live).length) {
        setValuesById(live);
      } else {
        setValuesById((prev) => ({ ...templateDefaultsById, ...prev }));
      }
    } catch {}
  }, [templateId, templateDetail?.variables, templateDefaultsById]);

  // Don't show the launch panel at all if the user doesn't have launch permissions
  if (!permissions?.includes('bc.comms.launch')) return null;

  return (
    <div className="w-full px-2 min-h-[60vh]">
      <LaunchHeader
        title={title}
        description={description}
        onSaveTitle={(nextTitle: string) => {
          setTitle(nextTitle);
          setTitleManuallyEdited(true);
        }}
        onSaveDescription={(nextDescription: string) => setDescription(nextDescription)}
      />

      <div className="flex flex-col gap-6">
        <EventAndTemplateCard
          eventType={eventType}
          setEventType={setEventType}
          templateId={templateId}
          setTemplateId={setTemplateId}
          commEventTypes={commEventTypes}
          commsTemplates={commsTemplates}
          isLocked={isLocked}
          hasTemplate={hasTemplate}
          templateDetail={templateDetail}
          templateVars={templateVars}
          variableFieldsRef={variableFieldsRef}
          tokenResponse={tokenResponse}
          onVariablesChange={(next: Record<string, string | string[] | null>) => {
            setValuesById(next);
          }}
          resetLaunch={resetLaunch}
        />

        {!hasTemplate && <div className="mt-4 rounded-xl px-6 py-6 text-center text-base text-zinc-800">Please select a template to proceed</div>}

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

        {hasTemplate ? (
          <PreviewMessages contents={templateDetail?.message?.contents ?? []} variables={variableDefs} valuesById={mergedValuesById} defaultOpen={{ Email: true, SMS: false, Voice: false }} />
        ) : null}
      </div>

      {hasTemplate && (
        <LaunchActionBar
          disabled={launchComm.isPending || !title || !templateId || templateDetailQuery.isFetching}
          isConfirming={showLaunchConfirm}
          subtitle="Gathering recipients" // optional: you can pass "Gathering 15 Recipients" if you wire the count up
          onCancel={() => {
            if (isDev || isStandalone) {
               resetLaunch();
            } else {
              window.__closeCommunicationsModal?.();
            }
            setShowLaunchConfirm(false);
          }}
          onStartLaunch={() => handleLaunch(false)}
          onStopLaunch={() => setShowLaunchConfirm(false)}
          onLaunchImmediately={() => {
            setShowLaunchConfirm(false);
            handleLaunch(true);
          }}
          onAutoLaunch={() => {
            setShowLaunchConfirm(false);
            handleLaunch(true);
          }}
        />
      )}
    </div>
  );
};

export default LaunchCommunicationPanel;
