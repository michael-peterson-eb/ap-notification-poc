import React from 'react';
import { X } from 'lucide-react';

type HeaderBarProps = {
  title?: string;
  logo?: React.ReactNode; // optional custom logo element
  onRefresh?: () => void;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  onClose?: () => void;
  className?: string;
  /** optional right-side custom nodes (e.g. user avatar) */
  rightNodes?: React.ReactNode;
};

export default function HeaderBar({ title = 'Communications', logo, onRefresh, onMinimize, onToggleMaximize, onClose, className = '', rightNodes }: HeaderBarProps) {
  return (
    <header className={`w-full bg-black text-white ${className} sticky top-0 z-50`}>
      <div className="max-w-full mx-auto flex items-center justify-between h-12 px-4">
        <div className="flex items-center gap-3">
          {/* Logo: accept custom or fallback simple mark */}
          <div className="flex-shrink-0">
            {logo ?? (
              <svg xmlns="http://www.w3.org/2000/svg" width="23" height="16" viewBox="0 0 23 16" fill="none">
                <path
                  d="M22.6421 0C16.9115 0 11.581 3.0364 8.73003 7.92512L8.72735 7.9295C8.72198 7.93826 8.66023 8.04861 8.56091 8.24479C6.44283 6.00274 3.48271 4.72582 0.357935 4.72582H0V9.51032H0.357935C3.82006 9.51032 6.63701 12.2647 6.63701 15.6497V16H11.5371L11.53 15.6427C11.53 15.6243 11.5022 13.8201 12.3094 11.6657C13.8521 7.55028 18.005 4.78537 22.6421 4.78537H23V0H22.6421ZM0.71587 8.81756V5.43172C3.6044 5.52805 6.31666 6.79008 8.23161 8.93317C8.20566 8.99097 8.17881 9.05052 8.15107 9.11271C7.7645 9.99288 7.19807 11.4695 6.87861 13.1755C5.90414 10.7259 3.52655 8.95681 0.71587 8.81756ZM7.35825 15.2985C7.43162 12.9697 8.2164 10.7706 8.73898 9.5506C10.024 11.233 10.7363 13.2106 10.8078 15.2985H7.35825ZM22.2841 4.08911C17.4932 4.22749 13.2436 7.13953 11.6374 11.4231C11.4405 11.9494 11.2911 12.4521 11.1765 12.9181C10.8087 11.5255 10.1591 10.2136 9.24367 9.04001C9.18371 8.96382 9.12644 8.89113 9.07096 8.82281C9.23204 8.48913 9.3412 8.2912 9.35284 8.27018C12.0177 3.70288 16.9482 0.828507 22.2841 0.705019V4.08911Z"
                  fill="white"
                />
              </svg>
            )}
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium select-none">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* custom right nodes first (if any) */}
          {rightNodes}

          {/* action buttons */}
          {onRefresh && (
            <button type="button" onClick={onRefresh} aria-label="Refresh" title="Refresh" className="rounded px-2 py-1 hover:bg-white/10 transition">
              {/* refresh icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="inline-block" aria-hidden>
                <path d="M21 12a9 9 0 1 0-3.197 6.464" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 3v6h-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {onMinimize && (
            <button type="button" onClick={onMinimize} aria-label="Minimize" title="Minimize" className="rounded px-2 py-1 hover:bg-white/10 transition">
              {/* minimize */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 12h12" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {onToggleMaximize && (
            <button type="button" onClick={onToggleMaximize} aria-label="Toggle maximize" title="Maximize / Restore" className="rounded px-2 py-1 hover:bg-white/10 transition">
              {/* maximize/restore */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3.5" y="6.5" width="13" height="10" rx="1.5" stroke="white" strokeWidth="1.6" />
                <path d="M7.5 20.5H20.5V6.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" title="Close" className="rounded px-2 py-1">
              {/* close */}
              <X size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
