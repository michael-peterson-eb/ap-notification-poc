import React from 'react';
import { LoaderCircle } from 'lucide-react';

type LoaderProps = {
  loadingText?: string;
  /** If true, takes full height of parent and centers vertically */
  fullHeight?: boolean;
};

const Loader = ({ loadingText = 'Loading...', fullHeight = true }: LoaderProps) => {
  return (
    <div aria-busy="true" className={['flex flex-col items-center justify-center text-zinc-500', fullHeight ? 'h-full w-full' : 'py-8'].join(' ')}>
      <LoaderCircle className="h-10 w-10 animate-spin text-blue-400/80" />

      {loadingText ? <div className="mt-4 text-sm text-zinc-500">{loadingText}</div> : null}
    </div>
  );
};

export default Loader;
