import { useState, useEffect, useRef } from 'react';
import { Button } from 'components/ui/button';
import { Field, Section } from '../../components';
import { formatDate } from 'utils/format';
import type { Comm } from 'hooks/comms/list/useComms';
import { useCommsByIds } from 'hooks/comms/list/useCommsByIds';
import { RecipientsPanel } from './RecipientsPanel';
import { ActivitiesPanel } from './ActivitesPanel';
import { useToasts } from 'hooks/useToasts';

type Props = {
  commId: string;
  token: any;

  onBack: () => void;

  // Optional action buttons
  right?: React.ReactNode;
};

export function CommDetailView({ commId, token, onBack, right }: Props) {
  const { pushToast } = useToasts();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const commQuery = useCommsByIds([commId], {
    enabled: !!commId,
    token,
  });
  const { error, refetch } = commQuery;

  const comm: Comm | null = commQuery.rows[0] ?? null;

  const isLoading = commQuery.isLoading;

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

  return (
    <>
      {isLoading ? (
        <div className="text-sm text-zinc-600">Loading…</div>
      ) : error ? (
        <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(error, null, 2)}</pre>
      ) : comm ? (
        <Section
          title={comm.title ?? 'Communication'}
          tone="blue"
          description={comm.eventType ? `Event Type: ${comm.eventType}` : undefined}
          left={
            <Button variant="secondary" size="sm" onClick={onBack}>
              ← Back
            </Button>
          }
          right={right}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Status">{comm.status ?? '-'}</Field>
            <Field label="Notification Status">{comm.notificationStatus ?? '-'}</Field>
            <Field label="Created">{formatDate((comm as any).createdDate ?? comm.lastModifiedDate)}</Field>
            <Field label="Last Modified">{formatDate(comm.lastModifiedDate)}</Field>
          </div>

          <div className="mt-4">
            <RecipientsPanel commId={commId} token={token} />
          </div>

          <div className="mt-4">
            <ActivitiesPanel commId={commId} token={token} />
          </div>
        </Section>
      ) : (
        <div className="text-sm text-zinc-600">Not found.</div>
      )}
    </>
  );
}
