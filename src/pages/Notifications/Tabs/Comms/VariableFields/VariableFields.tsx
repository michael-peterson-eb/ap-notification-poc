import React, { forwardRef, useEffect, useMemo, useState, useImperativeHandle } from 'react';
import { VariableCard } from './VariableCard';
import { VariableControl } from './VariableControl';
import { WhatYoureSending, SendingRow } from './WhatYoureSending';
import type { CommVariableDef, TemplateVariable, VariableFieldsProps, VariableFieldsHandle } from './types';
import {
  deriveVariableType,
  formatterHasTime,
  formatForDateInput,
  formatForDatetimeLocalInput,
  getDatetimeFormatter,
  getDefaultValueFromDef,
  getLengthFromDef,
  getVarOptionsFromDef,
  isMeaningfullyFilled,
  parseMulti,
  tryParseToDate,
  parseDateOnlyLocal,
  parseDatetimeLocal,
  formatMMDDYYYY,
  formatMMDDYYYY_HHMMSS,
  toStrArr,
  getLabelFor,
  mapValidationMessagesToLabels,
} from './variableUtils';
import { useCommVariables } from 'hooks/comms/launch/useCommVariables';
import { useValidateCommVariables } from 'hooks/comms/launch/useValidateCommVariables';

const VariableFields = forwardRef<VariableFieldsHandle, VariableFieldsProps>(({ templateVariables, templateId, tokenResponse, selections, disabled }, ref) => {
  // Hooks
  const defsQuery = useCommVariables({
    tokenResponse,
    enabled: Boolean(templateId),
    verbose: true,
    pageSize: 500,
  });

  const loading = Boolean(defsQuery.isLoading || defsQuery.isFetching);
  const defsById = useMemo<Record<string, CommVariableDef>>(() => (defsQuery.byId ? (defsQuery.byId as Record<string, CommVariableDef>) : {}), [defsQuery.byId]);

  const validateVars = useValidateCommVariables(tokenResponse);

  // State
  const [values, setValues] = useState<Record<string, any>>({});

  // Derived
  const allVars = useMemo<TemplateVariable[]>(() => (Array.isArray(templateVariables) ? templateVariables : []), [templateVariables]);
  const hasVars = allVars.length > 0;
  const sendingRows: SendingRow[] = useMemo(() => {
    return allVars.map((v) => {
      const id = String(v.variableId);
      const def = defsById[id];
      const label = getLabelFor(id, def);
      const raw = values[id] ?? v.value ?? '';
      const val = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '');
      return { vid: id, label, val: val.trim(), required: Boolean(v.required), hasValue: isMeaningfullyFilled(val) };
    });
  }, [allVars, defsById, values]);

  // Helpers
  const requiredMessages = (): string[] => {
    const msgs: string[] = [];
    for (const v of allVars) {
      if (!v.required) continue;
      const id = String(v.variableId);
      const raw = values[id] ?? v.value ?? '';
      if (!isMeaningfullyFilled(raw)) {
        msgs.push(`${getLabelFor(id, defsById[id])}: required`);
      }
    }
    return msgs;
  };

  const buildContextVariables = (): Array<{ variableId: string; value: string | string[] }> => {
    return allVars.map((v) => {
      const id = String(v.variableId);
      const def = defsById[id];
      const raw = values[id] ?? v.value ?? '';
      const type = deriveVariableType(def, v.type);

      if (type === 'multi-select') return { variableId: id, value: toStrArr(raw) };
      return { variableId: id, value: Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '') };
    });
  };

  const buildValidationPayload = (): Array<{ id: string; value: any }> => {
    return allVars
      .map((v) => {
        const id = String(v.variableId);
        const def = defsById[id];
        const raw = values[id] ?? v.value ?? '';

        if (raw == null) return null;
        if (Array.isArray(raw) && raw.length === 0) return null;
        if (!Array.isArray(raw) && String(raw).trim() === '') return null;

        const type = deriveVariableType(def, v.type);

        if (type === 'multi-select') {
          const arr = toStrArr(raw);
          return arr.length ? { id, value: arr } : null;
        }

        const datetimeFormatter = getDatetimeFormatter(def);
        const expectsTime = formatterHasTime(datetimeFormatter);

        const s = Array.isArray(raw) ? String(raw[0] ?? '').trim() : String(raw ?? '').trim();

        const dtl = parseDatetimeLocal(s);
        if (dtl) return { id, value: formatMMDDYYYY_HHMMSS(dtl.y, dtl.m0, dtl.d, dtl.hh, dtl.mm) };

        const dol = parseDateOnlyLocal(s);
        if (dol) return { id, value: expectsTime ? formatMMDDYYYY_HHMMSS(dol.y, dol.m0, dol.d, 0, 0) : formatMMDDYYYY(dol.y, dol.m0, dol.d) };

        return { id, value: s };
      })
      .filter(Boolean) as Array<{ id: string; value: any }>;
  };

  useImperativeHandle(ref, () => ({
    validate: async () => {
      if (!templateId) return { ok: true, messages: [], contextVariables: [] };

      const req = requiredMessages();
      if (req.length) return { ok: false, messages: req };

      try {
        const payload = buildValidationPayload();
        const result = await validateVars.mutateAsync({ variables: payload });

        if (!result.ok) {
          const msgs = mapValidationMessagesToLabels(result.messages ?? [], defsById);
          return { ok: false, messages: msgs.length ? msgs : ['Variable validation failed.'] };
        }

        return { ok: true, messages: [], contextVariables: buildContextVariables() };
      } catch (e: any) {
        return { ok: false, messages: [e?.message ?? 'Variable validation failed.'] };
      }
    },
  }));

  // Lifecycle
  useEffect(() => {
    setValues({});
  }, [templateId]);

  // seed defaults
  useEffect(() => {
    if (!hasVars) return;

    setValues((prev) => {
      const next = { ...prev };
      for (const v of allVars) {
        const id = String(v.variableId);
        if (next[id] === undefined) next[id] = v.value ?? '';
      }
      return next;
    });
  }, [hasVars, allVars]);

  if (!hasVars) return null;

  return (
    <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-4">
      <div className="font-semibold text-zinc-900">Template Variables</div>

      {loading ? (
        <div className="mt-4 rounded-2xl bg-zinc-50 ring-1 ring-zinc-200 p-4">
          <div className="text-sm font-medium text-zinc-800">Loading variables…</div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {allVars.map((v) => {
            const id = String(v.variableId);
            const def = defsById[id];
            const editable = !disabled && (v.permission ?? 'EDIT') === 'EDIT';

            const type = deriveVariableType(def, v.type);
            const label = getLabelFor(id, def);
            const hint = [(def as any)?.tooltip, (def as any)?.description].filter(Boolean).join(' • ') || undefined;

            const options = getVarOptionsFromDef(def) ?? selections ?? [];

            const seeded = v.value ?? getDefaultValueFromDef(def) ?? '';
            const current = values[id];

            const multiValue = parseMulti(current ?? seeded);
            const singleValue = String(current ?? (Array.isArray(seeded) ? seeded[0] : seeded) ?? '');
            const textValue = String(current ?? (Array.isArray(seeded) ? seeded.join(', ') : seeded) ?? '');

            const maxLength = getLengthFromDef(def);
            const datetimeFormatter = getDatetimeFormatter(def);
            const expectsTime = formatterHasTime(datetimeFormatter);

            let dateValue = '';
            let datetimeValue = '';

            if (type === 'date') {
              const raw = String(current ?? (Array.isArray(seeded) ? seeded[0] : seeded) ?? '').trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) dateValue = raw;
              else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) datetimeValue = raw.slice(0, 16);
              else {
                const parsed = tryParseToDate(current ?? seeded);
                if (parsed) {
                  dateValue = formatForDateInput(parsed);
                  datetimeValue = formatForDatetimeLocalInput(parsed);
                }
              }
            }

            const footerLeft = type === 'date' && datetimeFormatter ? <span>Format: {datetimeFormatter}</span> : undefined;
            const footerRight =
              maxLength && (type === 'textbox' || type === 'textarea') ? (
                <span>
                  Length: {textValue.length}/{maxLength}
                </span>
              ) : undefined;

            return (
              <VariableCard key={id} label={label} hint={hint} required={Boolean(v.required)} readOnly={!editable} footerLeft={footerLeft} footerRight={footerRight}>
                <VariableControl
                  type={type}
                  options={options}
                  isEditable={editable}
                  singleValue={singleValue}
                  multiValue={multiValue}
                  textValue={textValue}
                  dateValue={dateValue}
                  datetimeValue={datetimeValue}
                  expectsTime={expectsTime}
                  maxLength={maxLength}
                  onSingleChange={(val) => setValues((prev) => ({ ...prev, [id]: val }))}
                  onMultiChange={(arr) => setValues((prev) => ({ ...prev, [id]: arr }))}
                  onTextChange={(val) => setValues((prev) => ({ ...prev, [id]: val }))}
                  seededValue={seeded}
                  seededInOptions={typeof seeded === 'string' ? options.some((o) => o.value === seeded) : Array.isArray(seeded) && seeded.every((s: string) => options.some((o) => o.value === s))}
                  isLocked={Boolean(disabled)}
                />
              </VariableCard>
            );
          })}
        </div>
      )}

      <WhatYoureSending rows={sendingRows} />
    </div>
  );
});

export default VariableFields;
