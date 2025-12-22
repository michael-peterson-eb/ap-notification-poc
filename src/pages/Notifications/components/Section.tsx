type Tone = 'zinc' | 'blue' | 'emerald';

export default function Section({ title, description, children, tone = 'zinc', right }: { title: string; description?: string; children: React.ReactNode; tone?: Tone; right?: React.ReactNode }) {
  const toneStyles =
    tone === 'blue'
      ? {
          header: 'bg-gradient-to-r from-blue-50 to-white border-blue-200/70',
          title: 'text-blue-950',
          desc: 'text-blue-700/80',
          ring: 'ring-blue-100',
        }
      : tone === 'emerald'
        ? {
            header: 'bg-gradient-to-r from-emerald-50 to-white border-emerald-200/70',
            title: 'text-emerald-950',
            desc: 'text-emerald-700/80',
            ring: 'ring-emerald-100',
          }
        : {
            header: 'bg-gradient-to-r from-zinc-100/70 to-white border-zinc-200/70',
            title: 'text-zinc-900',
            desc: 'text-zinc-600',
            ring: 'ring-zinc-200/60',
          };

  return (
    <div className={['rounded-2xl bg-white shadow-sm ring-1', toneStyles.ring].join(' ')}>
      <div className={['border-b px-5 py-4 rounded-t-2xl flex items-start justify-between gap-4', toneStyles.header].join(' ')}>
        <div>
          <div className={['text-sm font-semibold leading-5', toneStyles.title].join(' ')}>{title}</div>
          {description ? <div className={['text-xs mt-1', toneStyles.desc].join(' ')}>{description}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}