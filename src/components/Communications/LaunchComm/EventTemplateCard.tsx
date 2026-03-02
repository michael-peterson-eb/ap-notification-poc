import React from 'react';
import { Field } from 'components';
import { Select } from 'components/Select';
import { params } from 'utils/consts';
import VariableFields from './VariableFields/VariableFields';
import Card from 'components/Card';

const EventAndTemplateCard = React.forwardRef(function EventAndTemplateCard(
  { eventType, setEventType, templateId, setTemplateId, commEventTypes, commsTemplates, isLocked, hasTemplate, templateDetail, templateVars, variableFieldsRef, tokenResponse }: any,
  ref: any
) {
  return (
    <div ref={ref}>
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-medium">Select an Event Type and Communication Template to Use</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Select Event Type">
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

          <Field label="Select A Template">
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

        {hasTemplate && templateVars.length > 0 && (
          <div className="mt-6 rounded-xl overflow-hidden ring-1 ring-zinc-100 shadow-[0_12px_30px_rgba(14,30,37,0.08)]">
            <div className="h-3 bg-blue-400/80" />
            <div className="px-6 py-5 border-b border-[#BDC6DA] bg-white">
              <div className="text-3xl font-semibold text-zinc-900">{templateDetail?.name ?? 'Template'}</div>
              <div className="mt-1 text-sm text-zinc-600">Variable Form{templateDetail ? ` - ${templateVars.length} Variable${templateVars.length === 1 ? '' : 's'}` : ''}</div>
            </div>
            <div className="bg-white px-6 py-6">
              <VariableFields
                ref={variableFieldsRef}
                templateVariables={templateVars}
                templateId={templateId}
                tokenResponse={tokenResponse}
                selections={params.variableSelections ?? []}
                disabled={isLocked}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});

export default EventAndTemplateCard;
