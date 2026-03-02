import React from 'react';

export type SendingRow = {
  vid: string;
  label: string;
  val: string;
  required: boolean;
  hasValue: boolean;
};

export const WhatYoureSending: React.FC<{
  rows: SendingRow[];
}> = ({ rows }) => {
  const filled = rows.filter((r) => r.hasValue).length;
  const missingRequired = rows.filter((r) => r.required && !r.hasValue).length;
  const shown = rows.filter((r) => r.hasValue || r.required);

  return (
    <details className="mt-6 rounded-2xl bg-zinc-50 ring-1 ring-zinc-200 p-4">
      <summary className="cursor-pointer select-none font-medium text-zinc-900">
        What you’re sending{' '}
        <span className="text-xs text-zinc-600 font-normal ml-2">
          ({filled} filled{missingRequired ? ` • ${missingRequired} required missing` : ''})
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-2">
        {shown.length ? (
          shown.map((r) => (
            <div key={r.vid} className="flex items-start justify-between gap-3">
              <div className="text-xs text-zinc-700 min-w-0">
                <span className="font-medium text-zinc-900">{r.label}</span>
                {r.required ? <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">Required</span> : null}
              </div>

              <div className="text-xs text-zinc-700 max-w-[60%] truncate">{r.val ? r.val : <span className="text-red-700">Missing</span>}</div>
            </div>
          ))
        ) : (
          <div className="text-xs text-zinc-600">No values set yet.</div>
        )}
      </div>
    </details>
  );
};
