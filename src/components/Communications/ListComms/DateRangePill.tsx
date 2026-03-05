import * as React from 'react';
import { Calendar as CalendarIcon, Check } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';
import { Calendar } from 'components/ui/calendar';

type Props = {
  dateValue: string;
  onDateChange: (dateIso: string) => void;
  ariaLabel?: string;
};

type Preset = { label: string; days: number };

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoStartOfLocalDayFromDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function ymd(iso: string): string {
  return iso.slice(0, 10);
}

function parseIsoToLocalDate(iso: string): Date {
  // We store start-of-local-day ISO. Convert to Date and normalize.
  const t = Date.parse(iso);
  const d = Number.isFinite(t) ? new Date(t) : new Date();
  return startOfLocalDay(d);
}

export function DateRangePill({ dateValue, onDateChange, ariaLabel = 'Date range selector' }: Props) {
  const presets: Preset[] = React.useMemo(
    () => [
      { label: '7 D', days: 7 },
      { label: '14 D', days: 14 },
      { label: '21 D', days: 21 },
      { label: '30 D', days: 30 },
    ],
    []
  );

  const presetIsos = React.useMemo(() => presets.map((p) => isoStartOfLocalDayFromDaysAgo(p.days)), [presets]);

  const selectedPresetIndex = React.useMemo(() => {
    const cur = ymd(dateValue);
    for (let i = 0; i < presetIsos.length; i++) {
      if (ymd(presetIsos[i]) === cur) return i;
    }
    return -1;
  }, [dateValue, presetIsos]);

  const isCustomDate = selectedPresetIndex === -1;

  const selectedDate = React.useMemo(() => parseIsoToLocalDate(dateValue), [dateValue]);

  const [open, setOpen] = React.useState(false);

  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex items-stretch overflow-hidden rounded-full bg-white" style={{ border: '1px solid #76A5FF' }}>
      {presets.map((opt, idx) => {
        const selected = idx === selectedPresetIndex;

        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onDateChange(isoStartOfLocalDayFromDaysAgo(opt.days))}
            className={[
              'relative inline-flex h-10 w-28 items-center justify-center gap-2 px-5 text-sm font-semibold',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
              selected ? 'bg-[#C4D9FF] text-zinc-900' : 'bg-[#EBF2FF] text-zinc-900 hover:bg-zinc-50',
            ].join(' ')}
            style={idx !== 0 ? { borderLeft: '1px solid #76A5FF' } : undefined}>
            {selected ? <Check size={16} className="shrink-0" /> : null}
            <span className="whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={[
              'inline-flex h-10 w-28 items-center justify-center gap-2',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
              isCustomDate ? 'bg-[#C4D9FF] text-zinc-900' : 'bg-[#EBF2FF] text-zinc-900 hover:bg-zinc-50',
            ].join(' ')}
            style={{ borderLeft: '1px solid #76A5FF' }}
            aria-label="Choose a date">
            {isCustomDate ? <Check size={16} className="shrink-0" /> : null}
            <CalendarIcon size={16} className="shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            // Only fires when a day is selected, NOT when paging months
            onSelect={(d) => {
              if (!d) return;
              const iso = startOfLocalDay(d).toISOString();
              onDateChange(iso);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
