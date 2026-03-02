import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '../../ui/button';
import type { Comm } from '../../../hooks/comms/list/useComms';
import { type Permission } from 'utils/permissions';
import { cn } from 'lib/utils';

type StopCommShape = {
  isPending?: boolean;
  mutate: (args: { commId: string }) => void;
};

function formatRelative(dateIso: any) {
  const d = new Date(dateIso);
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function toTitleCase(value: string | null | undefined) {
  if (!value) return '';
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function getCommColumns(args: { onSelect: (comm: Comm) => void; stopComm: StopCommShape; permissions: Permission[] }): ColumnDef<Comm>[] {
  const { onSelect, stopComm, permissions } = args;

  type ThreadStatus = 'ACTIVE' | 'INACTIVE';

  function resolveThreadStatus(row: any): ThreadStatus {
    // DEV/list shape: threadStatus already present
    const ts = row?.threadStatus;
    if (typeof ts === 'string' && ts.length) {
      const normalized = ts.toUpperCase();
      if (normalized === 'ACTIVE' || normalized === 'INACTIVE') return normalized as ThreadStatus;
    }

    // PROD/item shape: boolean `active`
    const active = row?.active;
    if (typeof active === 'boolean') return active ? 'ACTIVE' : 'INACTIVE';

    // Fallback if neither field exists
    return 'INACTIVE';
  }

  function resolveThreadStatusLabel(row: any): string {
    const status = resolveThreadStatus(row);
    return status === 'ACTIVE' ? 'Active' : 'Inactive';
  }

  const columns: ColumnDef<Comm>[] = [
    {
      accessorKey: 'threadStatus',
      header: 'Status',
      cell: ({ row }) => <StatusCell status={toTitleCase(resolveThreadStatusLabel(row.original))} />,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => <span className="text-[#405172] font-normal text-sm">{toTitleCase(row.original.priority)}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Name',
      cell: ({ row }) => {
        const comm = row.original;
        return (
          <button type="button" className="text-left text-sm font-normal text-[#070D1A] hover:underline" onClick={() => onSelect(comm)}>
            {comm.title ?? comm.id}
          </button>
        );
      },
    },
    {
      accessorKey: 'eventType',
      header: 'Event Type',
      cell: ({ row }) => <Pill>{row.original.eventType}</Pill>,
    },
    {
      accessorKey: 'createdDate',
      header: 'Launched Time',
      cell: ({ row }) => <span className="block font-medium text-sm text-[#405172]">{formatRelative(row.original.createdDate)}</span>,
    },
    {
      accessorKey: 'mode',
      header: 'Mode',
      cell: ({ row }) => <span className="block font-medium text-sm text-[#405172]">{toTitleCase(row.original.mode)}</span>,
    },
  ];

  if (permissions.includes('bc.comms.launch')) {
    columns.push({
      id: 'actions',
      accessorKey: '',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const comm = row.original;
        const canCancel = !!comm.notificationStatus && comm.notificationStatus !== 'Stopped' && comm.notificationStatus !== 'Completed';

        return (
          <div className="flex justify-end">
            <Button variant="destructive" size="sm" disabled={!canCancel || stopComm.isPending} onClick={() => stopComm.mutate({ commId: comm.id })}>
              Stop
            </Button>
          </div>
        );
      },
    });
  }

  return columns;
}

function StatusCell({ status }: { status: string }) {
  const s = String(status ?? '');
  const isActive = s.toLowerCase() === 'active';

  return (
    <div className="flex items-center gap-3">
      <span className={cn('h-2.5 w-2.5 rounded-full', isActive ? 'bg-green-500' : 'bg-slate-300')} />
      <span className="font-normal text-[#070D1A] text-sm">{s}</span>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-[#E8ECFF] px-3 py-1 text-sm font-medium text-[#405172]">{children}</span>;
}
