import React, { useMemo } from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';

import { COMM_STATUS_META } from 'utils/comms/conts';

type Props = {
  confirmation: any;
};

export function RecipientsPanel({ confirmation }: Props) {
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

  const totalCount = confirmation.data?.totalCount ?? 0;

  const statusRows = useMemo(() => {
    // keep order exactly like the mock
    const wantedOrder = ['Confirmed', 'ConfirmedLate', 'Attempted', 'Unreachable'];

    return wantedOrder.map((key) => {
      // your pieData currently has name/value/fill; may not include key unless you added it
      const found = pieData.find((p: any) => p.key === key) ?? pieData.find((p: any) => p.name === (COMM_STATUS_META[key]?.label ?? key));

      const value = Number(found?.value ?? 0);
      const color = found?.fill ?? COMM_STATUS_META[key]?.color ?? '#6b7280';
      const label = key === 'Attempted' ? 'Not Confirmed' : (COMM_STATUS_META[key]?.label ?? found?.name ?? key);
      const pct = totalCount > 0 ? (value / totalCount) * 100 : 0;

      return { key, label, value, pct, color };
    });
  }, [pieData, totalCount]);

  const ConfirmationError = () => {
    if (confirmation.error) {
      const err: any = confirmation.error;
      const status = err?.status ?? err?.response?.status ?? err?.originalStatus;
      const is404 = status === 404;
      const is504 = status === 504;
      if (is404) {
        return (
          <div className="bg-amber-50 ring-1 ring-amber-200 p-3 rounded-xl text-sm text-amber-900">
            <div className="font-medium">We couldn’t find confirmation data yet.</div>
            <div className="mt-1 text-amber-800">If you just created this communication, it can take a few seconds to become available. Please wait a moment and refresh.</div>
          </div>
        );
      }

      if (is504) {
        return (
          <div className="bg-red-50 ring-1 ring-red-200 p-3 rounded-xl text-sm text-red-900">
            <div className="font-medium">Gateway Timeout</div>
            <div className="mt-1 text-red-800">The server took too long to respond. Please try again later.</div>
          </div>
        );
      }
      return <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(confirmation.error, null, 2)}</pre>;
    } else {
      return null;
    }
  };

  return (
    <div className="rounded-xl bg-[linear-gradient(0deg,rgba(29,100,232,0.01)_0%,rgba(29,100,232,0.01)_100%),linear-gradient(180deg,#FFF_0%,#FDFDFD_100%)] shadow-[0_4px_8px_0_rgba(0,0,0,0.08),0_6px_30px_-4px_rgba(29,100,232,0.25)]">
      <div className="border-b border-[#76A5FF] px-8 py-4">
        <span className="text-xl font-normal text-[#13151C]">Confirmation Status</span>
      </div>
      {confirmation.error && (
        <div className="p-8">
          <ConfirmationError />
        </div>
      )}
      {confirmation?.isLoading && <div className="p-8">Loading confirmation status…</div>}
      {!confirmation?.isLoading && !confirmation?.error && (
        <div className="flex p-8 gap-8">
          <div
            className="w-64 shrink-0 h-full flex flex-col items-center rounded-xl p-6
                            border-2 border-[rgba(104,118,143,0.15)]
                            bg-[linear-gradient(0deg,rgba(29,100,232,0.01)_0%,rgba(29,100,232,0.01)_100%),linear-gradient(180deg,#FFF_0%,#FDFDFD_100%)]
                            shadow-[0_4px_8px_0_rgba(0,0,0,0.08),0_6px_30px_-4px_rgba(29,100,232,0.25)]">
            <div>
              <div className="font-normal text-[#13151C] text-lg">Total Recipients</div>
              <div>
                <span className="font-normal text-black text-3xl">{confirmation?.data?.totalCount}</span>
              </div>
            </div>
            <div className="w-[200px] h-[300px] mt-6">
              <ResponsiveContainer width={200} height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85} // reduce a bit to guarantee no clipping
                    isAnimationActive={false}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex-1 rounded-xl p-6 bg-[rgba(29,100,232,0.02)] border border-[rgba(104,118,143,0.10)]">
            <div className="space-y-6">
              {statusRows.map((r) => (
                <div key={r.key}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-normal text-[#2B3445]">{r.label}</div>
                    <div className="text-sm font-semibold text-[#13151C]">{r.value}</div>
                  </div>

                  <div className="mt-2 h-3 w-full rounded-full bg-[rgba(104,118,143,0.15)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, r.pct))}%`,
                        backgroundColor: r.color,
                      }}
                    />
                  </div>

                  <div className="mt-2 text-xs text-[#6B7280]">{Math.round(r.pct)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
