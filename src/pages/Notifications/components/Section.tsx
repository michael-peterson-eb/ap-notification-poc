// Section.tsx
import React from 'react';
import { Button } from '../../../components/ui/button';
import { RefreshCcw } from 'lucide-react';

type Tone = 'zinc' | 'blue' | 'emerald';
type Variant = 'card' | 'light';

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: Tone;
  variant?: Variant;

  right?: React.ReactNode;

  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  refreshLabel?: string;
  refreshDisabled?: boolean;
};

export default function Section({
  title,
  description,
  children,
  tone = 'zinc',
  variant = 'card',
  right,
  onRefresh,
  refreshing = false,
  refreshLabel = 'Refresh',
  refreshDisabled,
}: Props) {
  const toneStyles =
    tone === 'blue'
      ? {
          header: 'bg-gradient-to-r from-blue-50 to-white border-blue-200/70',
          title: 'text-blue-950',
          desc: 'text-blue-700/80',
          ring: 'ring-blue-100',
          divider: 'border-blue-100',
        }
      : tone === 'emerald'
        ? {
            header: 'bg-gradient-to-r from-emerald-50 to-white border-emerald-200/70',
            title: 'text-emerald-950',
            desc: 'text-emerald-700/80',
            ring: 'ring-emerald-100',
            divider: 'border-emerald-100',
          }
        : {
            header: 'bg-gradient-to-r from-zinc-100/70 to-white border-zinc-200/70',
            title: 'text-zinc-900',
            desc: 'text-zinc-600',
            ring: 'ring-zinc-200/60',
            divider: 'border-zinc-200/60',
          };

  const isLight = variant === 'light';

  const wrapClass = isLight
    ? 'bg-transparent' // no card chrome
    : ['rounded-2xl bg-white shadow-sm ring-1', toneStyles.ring].join(' ');

  const headerClass = isLight
    ? ['flex items-center justify-between gap-4', 'px-0 py-2 border-b', toneStyles.divider].join(' ')
    : ['border-b px-5 py-4 rounded-t-2xl flex items-start justify-between gap-4', toneStyles.header].join(' ');

  const bodyClass = isLight ? 'pt-4' : 'p-5';

  return (
    <div className={wrapClass}>
      <div className={headerClass}>
        <div>
          <div className={[isLight ? 'text-base font-semibold' : 'text-lg font-semibold leading-5', toneStyles.title].join(' ')}>
            {title}
          </div>
          {description ? <div className={['text-xs mt-1', toneStyles.desc].join(' ')}>{description}</div> : null}
        </div>

        {right || onRefresh ? (
          <div className="shrink-0 flex items-center gap-2">
            {onRefresh ? (
              <Button variant="secondary" size="sm" onClick={onRefresh} disabled={refreshDisabled}>
                {refreshing ? <RefreshCcw className="animate-spin" /> : <RefreshCcw />}
                {refreshing ? 'Refreshing…' : refreshLabel}
              </Button>
            ) : null}
            {right ? <div>{right}</div> : null}
          </div>
        ) : null}
      </div>

      <div className={bodyClass}>{children}</div>
    </div>
  );
}
