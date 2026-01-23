// src/pages/Notifications/Tabs/Comms/commColumns.ts
import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '../../../../components/ui/button';
import { formatDate } from '../../../../utils/format';
import type { Comm } from '../../../../hooks/comms/list/useComms';

type StopCommShape = {
  isPending?: boolean;
  mutate: (args: { commId: string }) => void;
};

/**
 * Factory to create the comm table columns.
 * Keep this file pure: pass runtime dependencies (onSelect, stopComm) in.
 */
export default function getCommColumns(args: { onSelect: (comm: Comm) => void; stopComm: StopCommShape }): ColumnDef<Comm>[] {
  const { onSelect, stopComm } = args;

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
          <button type="button" className="text-left text-blue-700 hover:underline" onClick={() => onSelect(comm)}>
            {comm.title ?? comm.id}
          </button>
        );
      },
    },
    { accessorKey: 'eventType', header: 'Event Type' },
    { accessorKey: 'mode', header: 'Mode' },
    { accessorKey: 'status', header: 'Status' },
    {
      accessorKey: 'created',
      header: 'Created On',
      cell: ({ row }) => formatDate(row.original.lastModifiedDate),
    },
    { accessorKey: 'notificationStatus', header: 'Notification Status' },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const comm = row.original;
        const canCancel = comm.notificationStatus !== 'Stopped' && comm.notificationStatus !== 'Completed' && comm?.notificationStatus;

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
}
