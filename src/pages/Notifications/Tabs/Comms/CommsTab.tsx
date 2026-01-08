import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '../../../../components/ui/button';
import { Field, Section } from '../../components';
import { DataTable } from '../../../../components/DataTable';
import { formatDate } from '../../../../utils/format';
import { useComms, Comm } from '../../../../hooks/useComms';
import { useLaunchComm } from '../../../../hooks/useLaunchComm';
import { useCommTemplates } from 'hooks/useCommTemplates';
import { useCommEventTypes } from 'hooks/useCommEventTypes';
import { usePlanCommIds } from 'hooks/usePlanCommIds';
import { params } from 'utils/consts';
import { useCommsByIds } from 'hooks/useCommsByIds';
import { useEverbridgeToken } from 'hooks/useEverbridgeToken';
import { Select } from '../../components/Select';
import { useStopComm } from 'hooks/useStopComm';
import { CommDetailView } from './CommsDetailView';

type Mode = 'LIVE' | 'SIMULATION' | 'PREVIEW';

const CommsTab = () => {
  const isDev = process.env.NODE_ENV === 'development';

  const tokenResponse = useEverbridgeToken();
  const commsTemplates = useCommTemplates({}, { token: tokenResponse });
  const commEventTypes = useCommEventTypes({ token: tokenResponse });

  // Use the list view (useComms) for local development for convenience.
  const comms = useComms({}, { enabled: isDev, token: tokenResponse });

  // In production, use plan comm IDs to fetch relevant comms.
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const bcicPlanCommIds = usePlanCommIds(params.id);
  const totalIds = bcicPlanCommIds.ids.length;
  const totalPages = Math.max(1, Math.ceil(totalIds / pageSize));

  const pageIds = useMemo(() => {
    const start = (page - 1) * pageSize;
    return bcicPlanCommIds.ids.slice(start, start + pageSize);
  }, [bcicPlanCommIds.ids, page, pageSize]);

  const planComms = useCommsByIds(pageIds, {
    enabled: !isDev && pageIds.length > 0,
    token: tokenResponse,
  });

  //State
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [selected, setSelected] = useState<{ id: string; row?: Comm | null } | null>(null);
  // Launch fields
  const [title, setTitle] = useState(`Comms Test - ${new Date().toLocaleString()}`);
  const [description, setDescription] = useState(`Description ${new Date().toLocaleString()}`);
  const [mode, setMode] = useState<Mode>('LIVE');
  const [eventType, setEventType] = useState('General');
  const [templateId, setTemplateId] = useState('commsTemplate://fbb1bcb8-c18d-41df-9207-f38e855896b7');
  // Derived
  const commsError = comms.error ?? null;
  const isFetchingActive = isDev ? comms.isFetching : bcicPlanCommIds.isFetching || planComms.isFetching;

  const onRefreshComms = async () => {
    try {
      setIsManualRefreshing(true);

      if (isDev) {
        await comms.query.refetch();
      } else {
        await bcicPlanCommIds.query.refetch();
        await Promise.all(planComms.queries.map((q) => q.refetch()));
      }
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const launchComm = useLaunchComm(tokenResponse, onRefreshComms);
  const stopComm = useStopComm(tokenResponse, onRefreshComms);

  const commColumns = useMemo<ColumnDef<Comm>[]>(() => {
    return [
      {
        accessorKey: 'id',
        header: 'Comm ID',
        cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span>,
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => {
          const comm = row.original;

          return (
            <button type="button" className="text-left text-blue-700 hover:underline" onClick={() => setSelected({ id: comm.id, row: comm })}>
              {comm.title ?? comm.id}
            </button>
          );
        },
      },
      { accessorKey: 'eventType', header: 'Event Type' },
      { accessorKey: 'status', header: 'Status' },
      { accessorKey: 'created', header: 'Created On', cell: ({ row }) => formatDate(row.original.lastModifiedDate) },
      { id: 'lastModifiedDate', header: 'Last Modified', cell: ({ row }) => formatDate(row.original.lastModifiedDate) },
      { accessorKey: 'notificationStatus', header: 'Notification Status' },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const comm = row.original;

          const canCancel = comm.notificationStatus !== 'Stopped' && comm.notificationStatus !== 'Completed' && comm?.notificationStatus; // adjust to your real statuses

          return (
            <div className="flex justify-end">
              <Button variant="destructive" size="sm" disabled={!canCancel || stopComm.isPending} onClick={() => stopComm.mutate({ commId: comm.id })}>
                Stop
              </Button>
            </div>
          );
        },
      },
    ];
  }, [stopComm]);

  // For dev - list view pager
  const devPager = (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={comms.prevPage} disabled={comms.pageNumber <= 1}>
        Prev
      </Button>
      <div className="text-xs text-zinc-600">
        Page <strong className="text-zinc-900">{comms.pageNumber}</strong> / <strong className="text-zinc-900">{comms.totalPages}</strong>
      </div>
      <Button variant="secondary" size="sm" onClick={comms.nextPage} disabled={comms.pageNumber >= comms.totalPages}>
        Next
      </Button>
    </div>
  );

  // For prod - individual id's are pulled view /get/:id and we paginate via BCIC plan comm ids
  const prodPager = (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
        Prev
      </Button>

      <div className="text-xs text-zinc-600">
        Page <strong className="text-zinc-900">{page}</strong> / <strong className="text-zinc-900">{totalPages}</strong>
        <span className="ml-2 text-zinc-400">({totalIds} total)</span>
      </div>

      <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
        Next
      </Button>
    </div>
  );

  const rightSide = isDev ? devPager : prodPager;

  // Choose what the table should display
  const tableRows = isDev ? comms.rows : planComms.rows;

  // These are for the Section header
  const totalCount = isDev ? comms.totalCount : planComms.loadedCount;
  const tableError = isDev ? comms.error : (bcicPlanCommIds.error ?? planComms.error);

  function onLaunch() {
    // LaunchCommRequest
    const body: any = {
      title,
      mode,
      ...(description ? { description } : {}),
      ...(eventType ? { eventType } : {}),
      ...(templateId ? { templateId } : {}),
    };

    launchComm.mutate({ body });
  }

  if (selected) {
    const useFullRow = !isDev; // prod uses row; dev fetches by id

    return (
      <CommDetailView
        commId={selected.id}
        token={tokenResponse}
        useFullRow={useFullRow}
        fullRow={selected.row}
        onBack={() => setSelected(null)}
        right={
          <Button variant="destructive" size="sm" disabled={stopComm.isPending} onClick={() => stopComm.mutate({ commId: selected.id })}>
            Stop
          </Button>
        }
      />
    );
  }

  return (
    <>
      {commsError ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(commsError, null, 2)}</pre> : null}

      <Section title="Launch Communication" tone="blue" description="Fill out the fields below." right={launchComm.isPending ? <div className="text-xs text-emerald-700">Launching…</div> : null}>
        <div className="flex flex-col gap-6">
          {/* Required */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title" required>
              <input
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Earthquake - Galesburg, Michigan"
              />
            </Field>

            <Field label="Mode" required>
              <Select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                <option value="LIVE">LIVE</option>
                <option value="SIMULATION">SIMULATION</option>
                <option value="PREVIEW">PREVIEW</option>
              </Select>
            </Field>
          </div>

          {/* Optional basics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Event Type">
              <Select value={eventType} onChange={(e) => setEventType(e.target.value)} disabled={commEventTypes.isLoading} isLoading={commEventTypes.isLoading} loadingText="Loading event types…">
                <option value="">{commEventTypes.isLoading ? 'Loading event types…' : 'Select an event type'}</option>

                {commEventTypes.rows.map((et) => (
                  <option key={et.id} value={et.name}>
                    {et.name}
                  </option>
                ))}
              </Select>
            </Field>

            {commEventTypes.error ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(commEventTypes.error, null, 2)}</pre> : null}

            <Field label="Template">
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={commsTemplates.isLoading} isLoading={commsTemplates.isLoading} loadingText="Loading templates…">
                <option value="">{commsTemplates.isLoading ? 'Loading templates…' : 'Select a template (optional)'}</option>

                {commsTemplates.rows.map((t) => (
                  <option key={t.id} value={`commsTemplate://${t.id}`}>
                    {(t.title ?? t.name ?? t.id) + (t.eventType ? ` — ${t.eventType}` : '')}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Description">
              <textarea
                className="w-full rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </Field>
          </div>

          {/* Launch button + results */}
          <div className="flex items-start gap-3 flex-wrap">
            <Button onClick={onLaunch} disabled={launchComm.isPending || !title}>
              Launch
            </Button>

            {launchComm.isError ? (
              <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs max-w-full">
                {JSON.stringify(
                  {
                    message: (launchComm.error as any)?.message,
                    status: (launchComm.error as any)?.status,
                    data: (launchComm.error as any)?.data,
                  },
                  null,
                  2
                )}
              </pre>
            ) : null}

            {launchComm.isSuccess ? (
              <pre className="text-emerald-800 bg-emerald-50 ring-1 ring-emerald-200 p-3 rounded-xl overflow-auto text-xs max-w-full">{JSON.stringify(launchComm.data, null, 2)}</pre>
            ) : null}
          </div>
        </div>
      </Section>

      {/* Comms table */}
      <Section
        title="Communications"
        description={`Total: ${totalCount}`}
        tone="blue"
        right={rightSide}
        onRefresh={onRefreshComms}
        refreshing={isManualRefreshing}
        refreshDisabled={isManualRefreshing || isFetchingActive}>
        <DataTable data={tableRows} columns={commColumns} emptyText={isDev ? 'No communications found.' : 'No communications found for this plan.'} />
      </Section>

      {tableError ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(tableError, null, 2)}</pre> : null}
    </>
  );
};

export default CommsTab;
