import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'components/ui/button';
import { Send } from 'lucide-react';

type Props = {
  disabled?: boolean;

  // whether we’re in the “countdown / cancel window” state
  isConfirming: boolean;

  // optional center subtitle like “Gathering 15 Recipients”
  subtitle?: string;

  // left button in idle state
  onCancel: () => void;

  // idle primary button → should call your existing handleLaunch(false)
  onStartLaunch: () => void;

  // confirming left button
  onStopLaunch: () => void;

  // confirming right button → should call your existing handleLaunch(true)
  onLaunchImmediately: () => void;

  // confirming auto-fire when countdown completes
  onAutoLaunch: () => void;

  // how long the fake countdown lasts
  durationMs?: number;
};

export default function LaunchActionBar({ disabled, isConfirming, subtitle, onCancel, onStartLaunch, onStopLaunch, onLaunchImmediately, onAutoLaunch, durationMs = 6000 }: Props) {
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  // reset when leaving confirming mode
  useEffect(() => {
    if (!isConfirming) {
      setProgress(0);
      startedAtRef.current = null;
      firedRef.current = false;
    }
  }, [isConfirming]);

  useEffect(() => {
    if (!isConfirming) return;

    let raf = 0;

    const tick = () => {
      if (!startedAtRef.current) startedAtRef.current = performance.now();
      const elapsed = performance.now() - startedAtRef.current;
      const next = Math.max(0, Math.min(1, elapsed / durationMs));
      setProgress(next);

      if (next >= 1 && !firedRef.current) {
        firedRef.current = true;
        onAutoLaunch();
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isConfirming, durationMs, onAutoLaunch]);

  const pct = useMemo(() => `${Math.round(progress * 100)}%`, [progress]);

  return (
    <div className="mt-8">
      <div
        className="
        rounded-[40px]
        border-2 border-[rgba(29,100,232,0.40)]
        bg-gradient-to-b
        from-[rgba(233,237,247,0.70)]
        to-[rgba(238,242,252,0.70)]
        shadow-[0_4px_4px_0_rgba(27,30,38,0.08),0_6px_32px_-8px_rgba(29,100,232,0.25)]
        backdrop-blur-[32.5px]
        py-4 px-8
        ">
        {!isConfirming ? (
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={disabled}
              className="active:scale-[0.95] active:opacity-80 transition-all rounded-full px-6 py-3 text-sm font-bold text-[#1A5CD7] hover:text-[#1A5CD7] border-[#1D64E866] bg-[radial-gradient(281.64%_61.17%_at_103.88%_50%,rgba(23,229,205,0.04)_0%,rgba(64,195,203,0)_72.4%),radial-gradient(68.74%_76.79%_at_100%_90.63%,rgba(61,122,235,0.20)_0%,rgba(61,122,235,0)_100%)]">
              Cancel
            </Button>

            <Button
              onClick={onStartLaunch}
              disabled={disabled}
              className="active:scale-[0.95] active:opacity-80 transition-all  rounded-full px-6 py-3 text-sm font-bold text-white bg-[radial-gradient(108.98%_88.6%_at_1.38%_64.58%,rgba(223,233,252,0.11)_0%,rgba(236,242,253,0)_100%),linear-gradient(268deg,#1982AF_-3.23%,#1B5DD8_20.93%,#1547A6_102.21%)] border border-[rgba(255,255,255,0.32)]">
              <Send className="mr-2 h-4 w-4" />
              Launch Communication
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={onStopLaunch}
              disabled={disabled}
              className="active:scale-[0.95] active:opacity-80 transition-all rounded-full px-6 text-sm font-bold text-[#1A5CD7] hover:text-[#1A5CD7] border-[#1D64E866] bg-[radial-gradient(281.64%_61.17%_at_103.88%_50%,rgba(23,229,205,0.04)_0%,rgba(64,195,203,0)_72.4%),radial-gradient(68.74%_76.79%_at_100%_90.63%,rgba(61,122,235,0.20)_0%,rgba(61,122,235,0)_100%)]">
              Stop Launch
            </Button>

            <div className="flex-1 min-w-[220px] max-w-[520px]">
              <div className="text-center text-sm font-medium text-zinc-900">Launching Communication</div>

              <div className="mt-2 h-1.5 w-full rounded-full bg-blue-200 overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: pct }} />
              </div>

              <div className="mt-2 text-center text-xs text-zinc-600">{subtitle ?? 'Gathering recipients'}</div>
            </div>

            <Button
              onClick={onLaunchImmediately}
              disabled={disabled}
              className="active:scale-[0.95] active:opacity-80 transition-all rounded-full px-6 py-3 text-sm font-bold text-white bg-[radial-gradient(108.98%_88.6%_at_1.38%_64.58%,rgba(223,233,252,0.11)_0%,rgba(236,242,253,0)_100%),linear-gradient(268deg,#1982AF_-3.23%,#1B5DD8_20.93%,#1547A6_102.21%)] border border-[rgba(255,255,255,0.32)]">
              <Send className="mr-2 h-4 w-4" />
              Launch Immediately
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
