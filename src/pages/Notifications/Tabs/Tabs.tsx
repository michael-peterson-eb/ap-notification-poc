type TabKey = 'incidents' | 'comms';

export default function Tabs({ tab, onTabChange }: { tab: TabKey; onTabChange: (t: TabKey) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-zinc-100 p-1 ring-1 ring-zinc-200 shadow-sm">
      <button
        type="button"
        className={['px-3 py-1.5 rounded-lg text-sm font-medium transition', tab === 'comms' ? 'bg-white text-zinc-900 shadow ring-1 ring-zinc-200' : 'text-zinc-600 hover:text-zinc-900'].join(' ')}
        onClick={() => onTabChange('comms')}>
        Comms
      </button>

      <button
        // temporarily disabling incidents tab, not in use in poc any longer
        disabled
        type="button"
        className={['px-3 py-1.5 rounded-lg text-sm font-medium transition', tab === 'incidents' ? 'bg-white text-zinc-900 shadow ring-1 ring-zinc-200' : 'text-zinc-600 hover:text-zinc-900'].join(
          ' '
        )}
        onClick={() => onTabChange('incidents')}>
        Incidents
      </button>
    </div>
  );
}
