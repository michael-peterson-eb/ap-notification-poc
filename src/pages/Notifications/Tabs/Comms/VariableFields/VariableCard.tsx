import React from 'react';

type Props = {
  label: string;
  hint?: string;
  required?: boolean;
  readOnly?: boolean;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
};

export const VariableCard: React.FC<Props> = ({ label, hint, required, readOnly, children, footerLeft, footerRight }) => {
  const showFooter = Boolean(footerLeft || footerRight);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 truncate">{label}</div>
          {hint ? <div className="text-xs text-zinc-500 mt-1">{hint}</div> : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">{required ? <span className="text-[11px] px-2 py-1 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">Required</span> : null}</div>
      </div>

      <div className="mt-3">{children}</div>

      {showFooter ? (
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <div>{footerLeft ?? <span />}</div>
          <div>{footerRight ?? <span />}</div>
        </div>
      ) : null}
    </div>
  );
};
