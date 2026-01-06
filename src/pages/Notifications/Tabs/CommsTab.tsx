import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '../../../components/ui/button';
import { Field, Section } from '../components';
import { DataTable } from '../../../components/DataTable';
import { formatDate } from '../../../utils/format';
import { useComms, Comm } from '../../../hooks/useComms';
import { useLaunchComm } from '../../../hooks/useLaunchComm';

const CommsTab = () => {
  const comms = useComms({});
  const launchComm = useLaunchComm();
  const [launchPayload, setLaunchPayload] = useState<string>(
    JSON.stringify(
      {
        // communicationId: null,
        // title: 'Test launch',
      },
      null,
      2
    )
  );

  const commsError = comms.error ?? null;

  const commColumns = useMemo<ColumnDef<Comm>[]>(() => {
    return [
      {
        accessorKey: 'id',
        header: 'Comm ID',
        cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span>,
      },
      { accessorKey: 'title', header: 'Title' },
      { accessorKey: 'eventType', header: 'Event Type' },
      { accessorKey: 'status', header: 'Status' },
      { id: 'lastModifiedDate', header: 'Last Modified', cell: ({ row }) => formatDate(row.original.lastModifiedDate) },
    ];
  }, []);

  const commsPager = (
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
  return (
    <>
      {commsError ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(commsError, null, 2)}</pre> : null}

      <Section
        title="Launch Communication"
        tone="blue"
        description="Paste the launch request body your tenant expects (start small and iterate)."
        right={launchComm.isPending ? <div className="text-xs text-emerald-700">Launching…</div> : null}>
        <div className="flex flex-col gap-3">
          <textarea
            className="w-full min-h-[180px] font-mono text-xs p-3 rounded-xl bg-white ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={launchPayload}
            onChange={(e) => setLaunchPayload(e.target.value)}
          />
          <div className="flex items-start gap-3 flex-wrap">
            <Button
              onClick={() => {
                const body = JSON.parse(launchPayload);
                launchComm.mutate({ body });
              }}>
              Launch
            </Button>

            {launchComm.isError ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs max-w-full">{JSON.stringify(launchComm.error, null, 2)}</pre> : null}

            {launchComm.isSuccess ? (
              <pre className="text-emerald-800 bg-emerald-50 ring-1 ring-emerald-200 p-3 rounded-xl overflow-auto text-xs max-w-full">{JSON.stringify(launchComm.data, null, 2)}</pre>
            ) : null}
          </div>
        </div>
      </Section>

      {/* Comms table */}
      <Section title="Communications" description={`Total: ${comms.totalCount}`} tone="blue" right={commsPager}>
        <DataTable data={comms.rows} columns={commColumns} emptyText="No communications found." />
      </Section>
    </>
  );
};

export default CommsTab;
