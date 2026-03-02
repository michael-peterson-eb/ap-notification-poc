import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type ThreadStatus = 'ACTIVE' | 'INACTIVE';

type Props = {
  value: ThreadStatus;
  onChange: (value: ThreadStatus) => void;
  label?: string;
  className?: string;
};

export function ThreadStatusSelect({ value, onChange, label = 'Status', className = '' }: Props) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="text-base font-bold text-black">{label}</span>

      <div className="relative">
        {/* Left check icon */}
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black">
          <Check size={16} strokeWidth={3} />
        </div>

        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ThreadStatus)}
          className={[
            'h-10',
            'appearance-none',
            'rounded-lg',
            'border',
            'pl-9 pr-9',
            'text-sm font-semibold',
            'shadow-sm',
            'outline-none transition',
            'bg-[#C4D9FF]',
            'border-[#76A5FF]',
            'text-black',
            'focus:ring-2 focus:ring-[#76A5FF]/40',
          ].join(' ')}
          aria-label="Thread status">
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        {/* Right chevron */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black">
          <ChevronDown size={16} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
