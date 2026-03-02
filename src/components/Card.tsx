import React from 'react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  overflowVisible?: boolean;
};

export default function Card({ children, className = '', overflowVisible = false }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl shadow-[0_8px_24px_rgba(14,30,37,0.06)] ring-1 ring-zinc-100',
        // only use overflow-hidden when overflowVisible is false
        overflowVisible ? 'overflow-visible' : 'overflow-hidden',
        className,
      ].join(' ')}>
      {children}
    </div>
  );
}
