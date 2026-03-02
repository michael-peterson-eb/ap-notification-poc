import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'components/ui/button';
import { useLaunchComm } from 'hooks/comms/launch/useLaunchComm';
import { useCommTemplates, useCommEventTypes, useCommTemplateById } from 'hooks/comms/list';
import { params } from 'utils/consts';
import RecipientsPreviewPanel from './RecipientsPreviewPanel';
import { ValidationResult } from './VariableFields/types';
import { useToasts } from 'hooks/useToasts';
import StepRail from 'components/StepRail';
import { PreviewMessageCard } from './PreviewMessageCard';
import { useStepRailPositions } from 'hooks/useStepRailPositions';
import LaunchHeader from './LaunchHeader';
import EventAndTemplateCard from './EventTemplateCard';

type Mode = 'LIVE' | 'SIMULATION' | 'PREVIEW';

function formatTitleForEvent(eventType: string) {
  const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const left = eventType && eventType.trim() ? eventType.trim() : 'Generic';
  return `${left} - ${dateStr}`;
}

const LaunchCommunicationPanel = ({ tokenResponse, permissions }) => {
  // Hooks
  const { pushToast } = useToasts();
  const commsTemplates = useCommTemplates({}, { token: tokenResponse, planType: params.planType, standaloneMode: params.standaloneMode });
  const commEventTypes = useCommEventTypes({ token: tokenResponse });
  const launchComm = useLaunchComm(tokenResponse);

  // Event type - default to first from API, or "General"
  const [eventType, setEventType] = useState<string>('General');

  // Title
  const [title, setTitle] = useState<string>(() => formatTitleForEvent('General'));
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);

  // Description
  const [description, setDescription] = useState('Enter a communication description');

  // Mode - always live right now
  const mode: Mode = 'LIVE';

  // Template
  const [templateId, setTemplateId] = useState<string>('');

  // Variables & Validation
  const [variableValidationMessages, setVariableValidationMessages] = useState<string[] | null>(null);
  const variableFieldsRef = useRef<{ validate: () => Promise<ValidationResult> } | null>(null);

  // Confirmation state
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const isLocked = showLaunchConfirm || launchComm.isPending;

  const templateDetailQuery = useCommTemplateById(templateId, { token: tokenResponse, enabled: Boolean(templateId) });
  const { template: templateDetail } = templateDetailQuery;
  const templateVars = templateDetail?.variables ?? [];
  const hasTemplate = Boolean(templateId);

  const { layoutRef, step1CardRef, step2CardRef, step1Y, step2Y } = useStepRailPositions({ hasStep2: hasTemplate });

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

  // Don't show the launch panel at all if the user doesn't have launch permissions
  if (!permissions?.includes('bc.comms.launch')) return null;

  return (
    <div className="w-full px-2">
      <LaunchHeader
        title={title}
        description={description}
        onSaveTitle={(nextTitle: string) => {
          setTitle(nextTitle);
          setTitleManuallyEdited(true);
        }}
        onSaveDescription={(nextDescription: string) => setDescription(nextDescription)}
      />

      <div ref={layoutRef} className="relative grid grid-cols-[72px_1fr] gap-6 items-start">
        <StepRail hasStep2={hasTemplate} step1Y={step1Y} step2Y={step2Y} />

        <div className="flex flex-col gap-6">
          <EventAndTemplateCard
            ref={step1CardRef}
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

          {hasTemplate ? <PreviewMessageCard ref={step2CardRef} templateDetail={templateDetail} /> : null}

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
              tokenResponse={tokenResponse}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end">
        <Button onClick={() => handleLaunch(false)} disabled={showLaunchConfirm || launchComm.isPending || !title || !templateId || templateDetailQuery.isFetching} className="px-6 py-3">
          {templateDetailQuery.isFetching ? 'Loading template…' : 'Confirm & Launch'}
        </Button>
      </div>
    </div>
  );
};

export default LaunchCommunicationPanel;
