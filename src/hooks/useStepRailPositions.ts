import { useEffect, useRef, useState } from 'react';

export function useStepRailPositions({ hasStep2 }: { hasStep2: boolean }) {
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const step1CardRef = useRef<HTMLDivElement | null>(null);
  const step2CardRef = useRef<HTMLDivElement | null>(null);
  const [step1Y, setStep1Y] = useState<number | null>(null);
  const [step2Y, setStep2Y] = useState<number | null>(null);

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;

    const compute = () => {
      const root = layoutRef.current;
      if (!root) return;

      const rootRect = root.getBoundingClientRect();
      const c1 = step1CardRef.current?.getBoundingClientRect();
      const c2 = step2CardRef.current?.getBoundingClientRect();

      if (c1) setStep1Y(c1.top - rootRect.top);
      else setStep1Y(null);

      if (hasStep2 && c2) setStep2Y(c2.top - rootRect.top);
      else setStep2Y(null);
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);

    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [hasStep2]);

  return { layoutRef, step1CardRef, step2CardRef, step1Y, step2Y };
}
