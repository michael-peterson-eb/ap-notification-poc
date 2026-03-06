import { RefreshCw } from 'lucide-react';

export default function DetailHeaderBar({ onBack, onCommActive, comm, disabled, handleRefresh, isRefreshing }: any) {
  return (
    <div className="flex justify-between">
      <div className="space-x-2">
        <button onClick={onBack} className="text-[#405172] underline text-sm font-semibold pb-3">
          Communication List
        </button>
        <span className="text-[#405172] text-sm font-normal pb-3">/</span>
        <span className="text-[#405172] text-sm font-bold pb-3">Communication Details</span>
      </div>

      <div className="flex items-center">
        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={disabled || isRefreshing}
          aria-busy={isRefreshing ? 'true' : 'false'}
          className="mr-2 flex items-center text-sm font-bold hover:opacity-80 active:scale-[0.95] active:opacity-80 transition-all"
          title={isRefreshing ? 'Refreshing…' : 'Refresh'}>
          {/* Icon: add animate-spin when refreshing. You can also tune speed with animationDuration. */}
          <RefreshCw color="#405172" strokeWidth={3} size={18} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} style={isRefreshing ? { animationDuration: '1000ms' } : undefined} />
        </button>

        <button
          onClick={() => onCommActive(comm.id, comm.active)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-full border border-[#76A5FF] bg-[radial-gradient(281.64%_61.17%_at_103.88%_50%,rgba(23,229,205,0.04)_0%,rgba(64,195,203,0.00)_72.4%),radial-gradient(68.74%_76.79%_at_100%_90.63%,rgba(61,122,235,0.20)_0%,rgba(61,122,235,0.00)_100%)] text-[#1A5CD7] text-sm font-bold duration-200 hover:bg-[radial-gradient(281.64%_61.17%_at_103.88%_50%,rgba(23,229,205,0.06)_0%,rgba(64,195,203,0.00)_72.4%),radial-gradient(68.74%_76.79%_at_100%_90.63%,rgba(61,122,235,0.25)_0%,rgba(61,122,235,0.00)_100%)] active:scale-[0.95] active:opacity-80 transition-all">
          {comm.active === true ? 'Close Communication' : 'Activate Communication'}
        </button>
      </div>
    </div>
  );
}
