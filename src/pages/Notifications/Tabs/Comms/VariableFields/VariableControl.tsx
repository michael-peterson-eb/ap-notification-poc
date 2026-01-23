import React, { useMemo, useState } from 'react';
import { Select } from '../../../components/Select';
import { Checkbox } from 'components/ui/checkbox'; // adjust if your path differs
import { MultiSelectToggle } from './MultiSelectToggle';
import { SelectionOption, VariableType } from './types';

type Props = {
  type: VariableType;
  options: SelectionOption[];
  isEditable: boolean;

  // values
  singleValue: string;
  multiValue: string[];
  textValue: string;

  // date values (preformatted for input elements)
  dateValue: string; // YYYY-MM-DD
  datetimeValue: string; // YYYY-MM-DDTHH:MM
  expectsTime: boolean;

  // constraints
  maxLength?: number;

  // events
  onSingleChange: (v: string) => void;
  onMultiChange: (v: string[]) => void;
  onTextChange: (v: string) => void;

  // keep-default support for single select
  seededValue?: any;
  seededInOptions?: boolean;

  isLocked?: boolean;
};

export const VariableControl: React.FC<Props> = ({
  type,
  options,
  isEditable,
  singleValue,
  multiValue,
  textValue,
  dateValue,
  datetimeValue,
  expectsTime,
  maxLength,
  onSingleChange,
  onMultiChange,
  onTextChange,
  seededValue,
  seededInOptions,
  isLocked,
}) => {
  const disabled = !isEditable || Boolean(isLocked);

  // Only offer the toggle for textbox + we have options
  const canTextboxUseSelect = type === 'textbox' && options?.length > 0;

  // Default toggle state: if current textbox value matches an option value, start in "Use list"
  const initialUseList = useMemo(() => {
    if (!canTextboxUseSelect) return false;
    return options.some((o) => o.value === textValue);
  }, [canTextboxUseSelect, options, textValue]);

  const [textboxAsSelect, setTextboxAsSelect] = useState<boolean>(initialUseList);

  const selectedTextboxOption = useMemo(() => {
    if (!canTextboxUseSelect) return undefined;
    return options.find((o) => o.value === textValue);
  }, [canTextboxUseSelect, options, textValue]);

  // ---------- Single Select ----------
  // Keep as label-only (per your request)
  if (type === 'single-select') {
    const showKeepDefault = !seededInOptions && seededValue != null && String(seededValue).trim() !== '';

    const effectiveSelectValue = options.some((o) => o.value === singleValue) || seededInOptions ? singleValue : showKeepDefault ? `__DEFAULT__:${String(seededValue)}` : singleValue;

    return (
      <Select
        value={effectiveSelectValue}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.startsWith('__DEFAULT__:')) onSingleChange(raw.substring('__DEFAULT__:'.length));
          else onSingleChange(raw);
        }}
        disabled={disabled}>
        {showKeepDefault ? <option value={`__DEFAULT__:${String(seededValue)}`}>Keep default: {String(seededValue)}</option> : null}

        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    );
  }

  // ---------- Multi Select ----------
  if (type === 'multi-select') {
    return <MultiSelectToggle options={options} value={multiValue} disabled={disabled} onChange={onMultiChange} />;
  }

  // ---------- Textarea ----------
  if (type === 'textarea') {
    return (
      <textarea
        rows={4}
        maxLength={maxLength}
        value={textValue}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50 disabled:text-zinc-500"
      />
    );
  }

  // ---------- Date ----------
  if (type === 'date') {
    return expectsTime ? (
      <input
        type="datetime-local"
        value={datetimeValue}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50 disabled:text-zinc-500"
      />
    ) : (
      <input
        type="date"
        value={dateValue}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50 disabled:text-zinc-500"
      />
    );
  }

  // ---------- Textbox with optional "Use list" (2-column layout) ----------
  if (type === 'textbox' && canTextboxUseSelect) {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-xs text-zinc-600 select-none">
          <Checkbox checked={textboxAsSelect} onCheckedChange={(checked) => setTextboxAsSelect(checked === true)} disabled={disabled} />
          Use plan values
        </label>

        {textboxAsSelect ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Column 1: label-only select */}
            <Select value={textValue || ''} onChange={(e) => onTextChange(e.target.value)} disabled={disabled}>
              <option value="">Select…</option>
              {options.map((opt, i) => (
                <option key={i} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            {/* Column 2: show actual value being sent */}
            <input
              className="w-full rounded-xl bg-zinc-50 ring-1 ring-zinc-200 px-3 py-2 text-sm text-zinc-700"
              value={selectedTextboxOption?.value ?? textValue ?? ''}
              disabled
              readOnly
              aria-label="Selected value"
            />
          </div>
        ) : (
          <input
            className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50 disabled:text-zinc-500"
            maxLength={maxLength}
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={disabled}
          />
        )}
      </div>
    );
  }

  // ---------- Textbox fallback ----------
  return (
    <input
      className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50 disabled:text-zinc-500"
      maxLength={maxLength}
      value={textValue}
      onChange={(e) => onTextChange(e.target.value)}
      disabled={disabled}
    />
  );
};
