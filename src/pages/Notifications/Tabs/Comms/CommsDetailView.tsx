import { Button } from '../../../../components/ui/button';
import { Field, Section } from '../../components';
import { formatDate } from '../../../../utils/format';
import type { Comm } from '../../../../hooks/useComms';
import { useCommsByIds } from '../../../../hooks/useCommsByIds';

type Props = {
  commId: string;
  token: any;

  // If true, we will render using fullRow and NOT fetch.
  useFullRow: boolean;
  fullRow?: Comm | null;

  onBack: () => void;

  // Optional action buttons
  right?: React.ReactNode;
};

export function CommDetailView({ commId, token, useFullRow, fullRow, onBack, right }: Props) {
  const shouldFetch = !useFullRow;

  const commQuery = useCommsByIds(shouldFetch ? [commId] : [], {
    enabled: shouldFetch && !!commId,
    token,
  });

  const comm: Comm | null = useFullRow ? (fullRow ?? null) : (commQuery.rows[0] ?? null);

  const isLoading = shouldFetch ? commQuery.isLoading : false;
  const error = shouldFetch ? commQuery.error : null;

  return (
    <>
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={onBack}>
          ← Back
        </Button>

        <div className="text-xs text-zinc-500">
          Comm ID: <span className="font-mono">{commId}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-600">Loading…</div>
      ) : error ? (
        <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(error, null, 2)}</pre>
      ) : comm ? (
        <Section title={comm.title ?? 'Communication'} tone="blue" description={comm.eventType ? `Event Type: ${comm.eventType}` : undefined} right={right}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Status">{comm.status ?? '-'}</Field>
            <Field label="Notification Status">{comm.notificationStatus ?? '-'}</Field>
            <Field label="Created">{formatDate((comm as any).createdDate ?? comm.lastModifiedDate)}</Field>
            <Field label="Last Modified">{formatDate(comm.lastModifiedDate)}</Field>
          </div>

          <div className="mt-4">
            <div className="text-xs text-zinc-500 mb-2">Raw</div>
            <pre className="text-xs bg-zinc-50 ring-1 ring-zinc-200 p-3 rounded-xl overflow-auto">{JSON.stringify(comm, null, 2)}</pre>
          </div>
        </Section>
      ) : (
        <div className="text-sm text-zinc-600">Not found.</div>
      )}
    </>
  );
}
