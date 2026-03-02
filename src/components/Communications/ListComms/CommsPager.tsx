import React from 'react';
import { Button } from 'components/ui/button';
import { params } from 'utils/consts';

type CommsObject = {
  pageNumber: number;
  totalPages: number;
  prevPage: () => void;
  nextPage: () => void;
};

type Props = {
  // dev: pass the object returned from useComms()
  comms?: CommsObject | null;

  // prod: page state and totals
  page?: number;
  setPage?: (updater: (p: number) => number) => void;
  totalIds?: number;
  totalPages?: number;
};

const CommsPager: React.FC<Props> = ({ comms = null, page = 1, setPage, totalIds = 0, totalPages = 1 }) => {
  const isDev = process.env.NODE_ENV === 'development';
  const isStandalone = params.standaloneMode;
  const showListView = isDev || isStandalone;

  if (showListView && comms) {
    const { pageNumber, totalPages: devTotal, prevPage, nextPage } = comms;
    return (
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={prevPage} disabled={pageNumber <= 1}>
          Prev
        </Button>
        <div className="text-xs text-zinc-600">
          Page <strong className="text-zinc-900">{pageNumber}</strong> / <strong className="text-zinc-900">{devTotal}</strong>
        </div>
        <Button variant="secondary" size="sm" onClick={nextPage} disabled={pageNumber >= devTotal}>
          Next
        </Button>
      </div>
    );
  }

  // Prod pager (uses page + setPage + totalPages + totalIds)
  const onPrev = () => setPage?.((p) => Math.max(1, p - 1));
  const onNext = () => setPage?.((p) => Math.min(totalPages ?? 1, (page ?? 1) + 1));

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={onPrev} disabled={(page ?? 1) <= 1}>
        Prev
      </Button>

      <div className="text-xs text-zinc-600">
        Page <strong className="text-zinc-900">{page}</strong> / <strong className="text-zinc-900">{totalPages}</strong>
        <span className="ml-2 text-zinc-400">({totalIds} total)</span>
      </div>

      <Button variant="secondary" size="sm" onClick={onNext} disabled={(page ?? 1) >= (totalPages ?? 1)}>
        Next
      </Button>
    </div>
  );
};

export default CommsPager;
