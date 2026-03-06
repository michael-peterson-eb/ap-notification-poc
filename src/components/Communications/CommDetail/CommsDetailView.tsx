import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { Comm } from 'hooks/comms/list/useComms';
import { useCommsByIds } from 'hooks/comms/list/useCommsByIds';
import { RecipientsPanel } from './RecipientsPanel';
import { ActivitiesPanel } from './ActivitiesPanel';
import { useToasts } from 'hooks/useToasts';
import Loader from 'components/Loader';
import { CommInfoPanel } from './CommInfoPanel';
import DetailHeaderBar from './DetailHeaderBar';
import MessagePanel from './MessagePanel';
import { RecipientDetailsPanel } from './RecipientDetailsPanel';
import { useCommConfirmationStatus } from 'hooks/comms/details/useCommConfirmationStatus';

type Props = {
  commId: string;
  token: any;
  onBack: () => void;
  onCommActive?: (id: string, active: boolean) => void;
};

export function CommDetailView({ commId, token, onBack, onCommActive }: Props) {
  const { pushToast } = useToasts();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const commQuery = useCommsByIds([commId], {
    enabled: !!commId,
    token,
  });
  const confirmation = useCommConfirmationStatus(commId, { token, enabled: !!commId });
  const { error, refetch } = commQuery;

  const comm: Comm | null = commQuery.rows[0] ?? null;

  const isLoading = commQuery.isLoading || confirmation.isLoading;
  const disabled = isLoading || isRefreshing;

  // avoid duplicate toasts for the same error object
  const lastErrorRef = useRef<any>(null);

  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;

      // try to extract a short, helpful message
      let msg = 'Failed to load communication details.';
      try {
        if (typeof error === 'string') msg = error;
        else if ((error as any)?.message) msg = (error as any).message;
        else if ((error as any)?.response?.status) msg = `HTTP ${(error as any).response.status}`;
        else if ((error as any)?.status) msg = `HTTP ${(error as any).status}`;
      } catch (e) {
        // ignore
      }

      pushToast({ type: 'error', title: 'Could not load comm', message: msg });
    }
  }, [error, pushToast]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
    } catch (e) {
      // show toast on refresh error
      let msg = 'Refresh failed.';
      try {
        if (typeof e === 'string') msg = e;
        else if ((e as any)?.message) msg = (e as any).message;
        else if ((e as any)?.response?.status) msg = `HTTP ${(e as any).response.status}`;
        else if ((e as any)?.status) msg = `HTTP ${(e as any).status}`;
      } catch {
        // ignore
      }
      pushToast({ type: 'error', title: 'Refresh failed', message: msg });
    } finally {
      setIsRefreshing(false);
    }
  };

  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const [leftPx, setLeftPx] = useState(0);

  useLayoutEffect(() => {
    const right = rightRef.current;
    const left = leftRef.current;

    // if nodes not ready yet, wait — this effect will re-run when isLoading/commId changes
    if (!right || !left) return;

    const apply = (height?: number) => {
      const h = typeof height === 'number' ? Math.round(height) : Math.round(right.getBoundingClientRect().height);
      setLeftPx(h);
    };

    apply();

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      window.requestAnimationFrame(() => apply(entry.contentRect.height));
    });
    ro.observe(right);

    return () => {
      ro.disconnect();
    };
  }, [commId, isLoading]); // <-- important: re-run when loading finishes / comm changes

  if (isLoading) {
    return (
      <div className="h-full flex items-center">
        <Loader />
      </div>
    );
  }

  return (
    comm && (
      <div className="min-h-[60vh]">
        <DetailHeaderBar onBack={onBack} onCommActive={onCommActive} comm={comm} disabled={disabled} handleRefresh={handleRefresh} isRefreshing={isRefreshing} />
        <div className="mb-8 mt-2">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-normal leading-tight m-0">{comm.title ?? 'Untitled'}</h1>
              </div>
              {comm.description ? <div className="mt-2 text-sm font-semibold">{comm.description}</div> : null}
            </div>
          </div>

          <CommInfoPanel comm={comm} />
        </div>
        <div className="flex gap-6">
          <div ref={leftRef} className="w-1/3 flex flex-col" style={{ maxHeight: `${leftPx}px` }}>
            <ActivitiesPanel confirmation={confirmation} commId={commId} comm={comm} token={token} />
          </div>

          <div ref={rightRef} className="flex-1 flex flex-col gap-8">
            <RecipientsPanel confirmation={confirmation} />
            <MessagePanel comm={comm} token={token} />
          </div>
        </div>
        <RecipientDetailsPanel commId={commId} token={token} />
      </div>
    )
  );
}
