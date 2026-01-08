import * as React from 'react';
import { RotateCw } from 'lucide-react';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  isLoading?: boolean;
  loadingText?: string;
};

export function Select({ children, isLoading, loadingText = 'Loading…', className = '', ...props }: SelectProps) {
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        className={['w-full rounded-xl bg-white ring-1 ring-zinc-200', 'px-3 py-2 text-sm text-zinc-500', 'flex items-center gap-2', 'cursor-not-allowed select-none', className].join(' ')}>
        <RotateCw className="h-4 w-4 animate-spin text-zinc-500" />
        <span>{loadingText}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        {...props}
        className={[
          'w-full appearance-none rounded-xl bg-white ring-1 ring-zinc-200',
          'pl-3 pr-10 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-300',
          'disabled:bg-zinc-50 disabled:text-zinc-500',
          className,
        ].join(' ')}>
        {children}
      </select>

      {/* Caret */}
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
      </svg>
    </div>
  );
}
