import React, { useMemo, useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserCircle } from 'lucide-react';

import { Button } from 'components/ui/button';
import { DataTable } from 'components/DataTable';
import { Section } from '../../components';

import { COMM_STATUS_META } from 'utils/comms/conts';
import { useCommConfirmationStatus } from 'hooks/comms/details/useCommConfirmationStatus';
import { useCommRecipientLogs, CommRecipientLog } from 'hooks/comms/details/useCommRecipientLogs';

const DEFAULT_STATUSES = ['Confirmed', 'ConfirmedLate', 'Attempted', 'Duplicate', 'Unreachable'];

type Props = {
  commId: string;
  token: any;
  // optional override
  statuses?: string[];
  defaultPageSize?: number; // default 50
};

export function RecipientsPanel({ commId, token, statuses = DEFAULT_STATUSES, defaultPageSize = 50 }: Props) {
  // pagination state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(defaultPageSize);

  // reset page when comm changes
  useEffect(() => {
    setPageNumber(1);
  }, [commId]);

  // --- Summary (pie) ---
  const confirmation = useCommConfirmationStatus(commId, { token, enabled: !!commId });

  const pieData = useMemo(() => {
    const d = confirmation.data;
    if (!d) return [];

    // Map API fields to status buckets
    // NOTE: pendingConfirmedCount is treated as "Attempted" in your earlier flow; adjust if you later add a dedicated "Pending" status
    const items = [
      { key: 'Confirmed', value: d.confirmedCount },
      { key: 'Attempted', value: d.pendingConfirmedCount },
      { key: 'Unreachable', value: d.unreachableCount },
      { key: 'ConfirmedLate', value: d.confirmedLateCount },
    ];

    return items.map((x) => ({
      name: COMM_STATUS_META[x.key]?.label ?? x.key,
      value: x.value,
      fill: COMM_STATUS_META[x.key]?.color ?? '#6b7280',
    }));
  }, [confirmation.data]);

  // --- Recipient logs (table) ---
  const recipientLogs = useCommRecipientLogs(
    commId
      ? {
          commId,
          statuses,
          pageSize,
          pageNumber,
        }
      : null,
    { token, enabled: !!commId }
  );

  const { hasNextPage, hasPrevPage } = recipientLogs;

  const pager = (hasNextPage || hasPrevPage) && (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" disabled={!recipientLogs.hasPrevPage || recipientLogs.isFetching} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>
        Prev
      </Button>

      <div className="text-xs text-zinc-600">
        Page <strong className="text-zinc-900">{recipientLogs.pageNumber}</strong>
        <span className="mx-2 text-zinc-300">•</span>
        Size <strong className="text-zinc-900">{recipientLogs.pageSize}</strong>
      </div>

      <Button variant="secondary" size="sm" disabled={!recipientLogs.hasNextPage || recipientLogs.isFetching} onClick={() => setPageNumber((p) => p + 1)}>
        Next
      </Button>
    </div>
  );

  const columns = useMemo<ColumnDef<CommRecipientLog>[]>(() => {
    return [
      {
        id: 'statusIcon',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.original.status;
          const meta = COMM_STATUS_META[status] ?? { label: status, color: '#6b7280', icon: UserCircle };
          const Icon = meta.icon;

          return (
            <div className="flex items-center justify-center w-7 h-7 rounded-full" style={{ backgroundColor: `${meta.color}15` }}>
              <Icon className="h-4 w-4" style={{ color: meta.color }} />
            </div>
          );
        },
      },
      {
        accessorKey: 'fullName',
        header: 'Recipient',
        cell: ({ row }) => (
          <div className="min-w-[180px]">
            <div className="text-sm font-medium text-zinc-900">{row.original.fullName ?? row.original.recipientId}</div>
            <div className="text-xs text-zinc-500">
              {row.original.externalId ? <span className="mr-2">ID: {row.original.externalId}</span> : null}
              <span className="font-mono">RID: {row.original.recipientId}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          const meta = COMM_STATUS_META[status] ?? { label: status, color: '#6b7280', icon: UserCircle };
          return (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
              {meta.label}
            </span>
          );
        },
      },
      {
        id: 'email',
        header: 'Email',
        cell: ({ row }) => {
          const email = row.original.recipientLogByPath?.find((p) => p.pathCategory === 'EMAIL')?.pathValue ?? '';
          return <span className="text-xs text-zinc-700">{email}</span>;
        },
      },
      {
        id: 'sms',
        header: 'SMS',
        cell: ({ row }) => {
          const sms = row.original.recipientLogByPath?.find((p) => p.pathCategory === 'SMS')?.pathValue ?? '';
          return <span className="text-xs text-zinc-700">{sms}</span>;
        },
      },
      {
        accessorKey: 'firstAttemptDate',
        header: 'First Attempt',
        cell: ({ row }) => {
          const d = row.original.firstAttemptDate ? new Date(row.original.firstAttemptDate) : null;
          return <span className="text-xs text-zinc-500">{d ? d.toLocaleString() : ''}</span>;
        },
      },
    ];
  }, []);

  return (
    <>
      {/* Chart section */}
      <div className="mt-6">
        <Section
          title="Recipient Confirmation"
          variant="light"
          tone="blue"
          description={confirmation.data ? `Total: ${confirmation.data.totalCount}` : 'Confirmation counts by status.'}
          right={confirmation.isFetching ? <div className="text-xs text-zinc-500">Refreshing…</div> : null}>
          {confirmation.error ? (
            (() => {
              const err: any = confirmation.error;
              const status = err?.status ?? err?.response?.status ?? err?.originalStatus;
              const is404 = status === 404;

              if (is404) {
                return (
                  <div className="bg-amber-50 ring-1 ring-amber-200 p-3 rounded-xl text-sm text-amber-900">
                    <div className="font-medium">We couldn’t find confirmation data yet.</div>
                    <div className="mt-1 text-amber-800">If you just created this communication, it can take a few seconds to become available. Please wait a moment and refresh.</div>
                  </div>
                );
              }

              return <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(confirmation.error, null, 2)}</pre>;
            })()
          ) : confirmation.isLoading ? (
            <div className="text-sm text-zinc-600">Loading confirmation status…</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} isAnimationActive={false} />
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>

      {/* Recipients table section */}
      <div className="mt-6">
        <Section title="Recipients" variant="light" tone="blue" right={pager}>
          {recipientLogs.error ? <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(recipientLogs.error, null, 2)}</pre> : null}

          <DataTable data={recipientLogs.rows} columns={columns} emptyText={recipientLogs.isLoading ? 'Loading recipients…' : 'No recipients found.'} />
        </Section>
      </div>
    </>
  );
}
