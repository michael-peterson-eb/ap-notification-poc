import * as React from 'react';
import { Search } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  maxWidthPx?: number; // optional, if you want it configurable
};

export function SearchByNameInput({ value, onChange, placeholder = 'Search by Name', className = '', inputClassName = '' }: Props) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`relative w-full max-w-sm`}>
        <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#4A5A73]">
          <Search size={16} strokeWidth={2.5} />
        </div>

        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[
            'h-10 w-full',
            '!rounded-full',
            'pl-14 pr-6',
            'text-base',
            'bg-[#EBF2FF]',
            '!border !border-[#6375997a]',
            // 'border border-[#76A5FF]',
            'outline-none',
            'placeholder:text-[#4A5A73]',
            'focus:border-[#76A5FF]',
            'focus:ring-2 focus:ring-[#76A5FF]/30',
            'transition',
            inputClassName,
          ].join(' ')}
        />
      </div>
    </div>
  );
}
