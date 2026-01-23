import React from 'react';
import { SelectionOption } from './types';
import { Checkbox } from 'components/ui/checkbox'; // adjust path if needed

type Props = {
  options: SelectionOption[];
  value: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
};

export const MultiSelectToggle: React.FC<Props> = ({ options, value, disabled, onChange }) => {
  return (
    <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-2">
      {/* Selected pills */}
      {value.length ? (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((val) => (
            <button
              key={val}
              type="button"
              className="text-xs px-2 py-1 rounded-full bg-zinc-50 ring-1 ring-zinc-200 hover:bg-zinc-100 disabled:opacity-60"
              disabled={disabled}
              onClick={() => onChange(value.filter((v) => v !== val))}
              title="Remove">
              {val} <span className="ml-1">×</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Options list */}
      <div className="flex flex-col gap-1 max-h-48 overflow-auto">
        {options.map((opt, i) => {
          const checked = value.includes(opt.value);

          const toggle = () => {
            if (disabled) return;
            const next = checked ? value.filter((v) => v !== opt.value) : [...value, opt.value];
            onChange(next);
          };

          return (
            <div
              key={i}
              role="checkbox"
              aria-checked={checked}
              onClick={toggle}
              className={['flex items-center gap-2 rounded-lg px-2 py-1 text-sm', disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-50'].join(' ')}>
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(next) => {
                  if (next === true && !checked) onChange([...value, opt.value]);
                  if (next === false && checked) onChange(value.filter((v) => v !== opt.value));
                }}
              />
              <span className="select-none">{opt.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
