import React, { useEffect, useRef, useState } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  widthClassName?: string;
  transitionMs?: number;
};

export function Modal({ open, onClose, title, children, closeOnBackdrop = true, closeOnEscape = true, widthClassName = '', transitionMs = 220 }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);

      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(raf2);
      });

      return () => cancelAnimationFrame(raf1);
    } else {
      setShown(false);
      const t = window.setTimeout(() => setMounted(false), transitionMs);
      return () => window.clearTimeout(t);
    }
  }, [open, transitionMs]);

  useEffect(() => {
    if (!mounted || !shown || !closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mounted, shown, closeOnEscape, onClose]);

  if (!mounted) return null;

  const overlayStyle: React.CSSProperties = {
    opacity: shown ? 1 : 0,
    transition: `opacity ${transitionMs}ms ease`,
    pointerEvents: shown ? 'auto' : 'none',
  };

  const backdropStyle: React.CSSProperties = {
    opacity: shown ? 1 : 0,
    transition: `opacity ${transitionMs}ms ease`,
  };

  const panelStyle: React.CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? 'translateY(0px) scale(1) translateX(0px)' : 'translateY(30px) scale(0.8)',
    transition: `opacity ${transitionMs}ms ease, transform ${transitionMs}ms ease`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={overlayStyle} aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" style={backdropStyle} onClick={() => closeOnBackdrop && onClose()} />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 w-[75%] !h-[85vh] !min-h-[85vh] overflow-hidden rounded-lg shadow-xl ring-0 flex flex-col bg-white"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 !overflow-hidden min-h-0 bg-[linear-gradient(146deg,rgba(224,237,255,0.41),rgba(218,217,255,0.50),rgba(224,235,255,0.41),rgba(233,240,255,0.50))]">{children}</div>
      </div>
    </div>
  );
}
