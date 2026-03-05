import { RefreshCw } from 'lucide-react';

export default function DetailHeaderBar({ onBack, onCommActive, comm, disabled, handleRefresh }) {
  return (
    <div className="flex justify-between">
      <div className="space-x-2">
        <button onClick={onBack} className="text-[#405172] text-base font-normal">
          Communication List
        </button>
        <span className="text-[#405172] text-base font-normal">/</span>
        <span className="text-[#405172] text-base font-bold">Communication Details</span>
      </div>
      <div className="flex items-center">
        <button
          onClick={() => onCommActive(comm.id, comm.active)}
          disabled={disabled}
          className="
                      px-3 py-1.5
                      rounded-full
                      border border-[rgba(29,100,232,0.40)]
                      bg-[radial-gradient(281.64%_61.17%_at_103.88%_50%,rgba(23,229,205,0.04)_0%,rgba(64,195,203,0.00)_72.4%),radial-gradient(68.74%_76.79%_at_100%_90.63%,rgba(61,122,235,0.20)_0%,rgba(61,122,235,0.00)_100%)]
                      text-[#1A5CD7]
                      text-sm font-bold
                      duration-200
                      hover:bg-[radial-gradient(281.64%_61.17%_at_103.88%_50%,rgba(23,229,205,0.06)_0%,rgba(64,195,203,0.00)_72.4%),radial-gradient(68.74%_76.79%_at_100%_90.63%,rgba(61,122,235,0.25)_0%,rgba(61,122,235,0.00)_100%)]
                      active:scale-[0.95] active:opacity-80 transition-all 
                      ">
          {comm.active === true ? 'Close Communication' : 'Activate Communication'}
        </button>
        <button
          onClick={handleRefresh}
          disabled={disabled}
          className="ml-2 flex items-center rounded-full px-3 py-1.5 text-sm font-bold hover:opacity-80 text-white bg-[radial-gradient(108.98%_88.6%_at_1.38%_64.58%,rgba(223,233,252,0.11)_0%,rgba(236,242,253,0)_100%),linear-gradient(268deg,#1982AF_-3.23%,#1B5DD8_20.93%,#1547A6_102.21%)] border border-[rgba(255,255,255,0.32)] active:scale-[0.95] active:opacity-80 transition-all ">
          <RefreshCw strokeWidth={3} className="mr-2" size={14} />
          Refresh
        </button>
      </div>
    </div>
  );
}
