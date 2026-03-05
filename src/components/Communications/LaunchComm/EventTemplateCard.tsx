import React from 'react';
import { Field } from 'components';
import { Select } from 'components/Select';
import { params } from 'utils/consts';
import VariableFields from './VariableFields/VariableFields';
import Card from 'components/Card';
import { useCreateContactBuilderSession } from 'hooks/comms/contacts/useCreateContactBuilderSession';
import { useContactSummary } from 'hooks/comms/contacts/useContactBuilderTotal';
import { RotateCcw } from 'lucide-react';

const EventAndTemplateCard = React.forwardRef(function EventAndTemplateCard(
  { eventType, setEventType, templateId, setTemplateId, commEventTypes, commsTemplates, isLocked, hasTemplate, templateDetail, templateVars, variableFieldsRef, tokenResponse, onVariablesChange, resetLaunch }: any,
  ref: any
) {
  const recipients = templateDetail?.recipients ?? null;

  // 1) Create contact builder session (only when template + recipients exist)
  const createSession = useCreateContactBuilderSession({
    recipients,
    tokenResponse,
    autoStart: Boolean(hasTemplate && recipients),
  });

  const sessionId = createSession?.response?.sessionId ?? null;

  // 2) Fetch summary
  const summaryQuery = useContactSummary({
    tokenResponse,
    sessionId,
    enabled: Boolean(sessionId),
  });

  const summary = summaryQuery.data;

  const loadingTotals = Boolean(createSession?.isPending || summaryQuery.isLoading || summaryQuery.isFetching);

  // Recipients (show 0 once done, even if summary is missing)
  const recipientTotal = summary?.total ?? 0;

  // Delivery paths (bucket types with > 0, excluding exclusion)
  const deliveryPaths = React.useMemo(() => {
    const buckets = summary?.buckets ?? {};
    return Object.entries(buckets).filter(([k, v]) => k !== 'exclusion' && Number(v) > 0).length;
  }, [summary?.buckets]);

  const recipientsDisplay = loadingTotals ? '—' : recipientTotal;
  const deliveryPathsDisplay = loadingTotals ? '—' : deliveryPaths;

  return (
    <div ref={ref}>
      <Card className="p-6">
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-medium">Select an Event Type and Communication Template to Use</h2>
          <button className="flex items-center gap-2" onClick={resetLaunch}>
             <RotateCcw strokeWidth={3} size={16} color="#005EF9" />
             <span className="text-[#005EF9] text-sm font-bold">Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* <Field label="Select Event Type"> */}
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
          {/* </Field> */}

          {/* <Field label="Select A Template"> */}
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
          {/* </Field> */}
        </div>

        {hasTemplate && templateVars.length > 0 && (
          <div className="mt-6 rounded-xl overflow-hidden ring-1 ring-zinc-100 shadow-[0_12px_30px_rgba(14,30,37,0.08)]">
            <div className="h-3 bg-blue-400/80" />
            <div className="px-6 py-5 border-b border-[#BDC6DA] bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[22px] font-semibold text-zinc-900">{templateDetail?.name ?? 'Template'}</div>
                  <div className="mt-1 text-sm text-zinc-600">Variable Form{templateDetail ? ` - ${templateVars.length} Variable${templateVars.length === 1 ? '' : 's'}` : ''}</div>
                </div>

                {/* Render even while loading; show — until done */}
                {hasTemplate && recipients ? (
                  <div className="text-right">
                    <div className="text-[22px] font-medium text-[#005EF9] leading-tight">
                      {recipientsDisplay} <span className="text-[#13151C] font-medium">{!loadingTotals && recipientTotal === 1 ? 'Recipient' : 'Recipients'}</span>
                    </div>
                    <div className="mt-1 text-sm text-black font-normal">
                      {deliveryPathsDisplay} <span>{!loadingTotals && deliveryPaths === 1 ? 'Delivery Path' : 'Delivery Paths'}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-white px-6 pb-6">
              <VariableFields
                ref={variableFieldsRef}
                templateVariables={templateVars}
                templateId={templateId}
                tokenResponse={tokenResponse}
                selections={params.variableSelections ?? []}
                disabled={isLocked}
                onVariablesChange={onVariablesChange}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});

export default EventAndTemplateCard;
