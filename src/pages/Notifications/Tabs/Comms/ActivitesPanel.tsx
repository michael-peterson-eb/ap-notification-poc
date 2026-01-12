import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from 'components/DataTable';
import { Section } from '../../components';

import { formatDate } from 'utils/format';
import { useCommActivities, CommActivity } from 'hooks/comms/useCommActivities';
import { ClipboardList, Mail } from 'lucide-react';

type Props = {
  commId: string;
  token: any; // tokenResponse
  pageSize?: number; // default 100
};

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

function formatSentLine(createdAt?: string, createdBy?: CommActivity['createdBy']) {
  if (!createdAt) return 'Sent —';
  const d = new Date(createdAt);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const who = createdBy?.fullName ?? createdBy?.username ?? 'Unknown';
  return `Sent ${date} at ${time} by ${who}`;
}

function pickMessageTypeLabel(a: CommActivity) {
  const mt = a.messageType ?? '';
  if (!mt) return 'Message';
  // STANDARD -> Standard Message
  return `${titleCase(mt)} Message`;
}

function pickCardTitle(a: CommActivity) {
  // Best-effort: if backend ever sends a subject/title field, prefer it.
  return a.title ?? a.subject ?? a.name ?? (a.actionType ? titleCase(a.actionType) : 'Activity');
}

function pickSubActionLabel(a: CommActivity) {
  // If you later discover better labels per actionType, map them here.
  if (!a.actionType) return null;

  const map: Record<string, string> = {
    INIT: 'Original Communication Sent',
    STOP: 'Communication Stopped',
    CANCEL: 'Communication Cancelled',
    UPDATE: 'Communication Updated',
  };

  return map[a.actionType] ?? titleCase(a.actionType);
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return null;
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);

  if (hr >= 1) return `${hr} hour${hr === 1 ? '' : 's'}`;
  if (min >= 1) return `${min} min`;
  return `${sec} sec`;
}

function safeDateTime(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} at ${time}`;
}

export function ActivitiesPanel({ commId, token, pageSize = 100 }: Props) {
  const activities = useCommActivities(commId, { token, pageSize, enabled: !!commId });

  // You may want newest first; if API already returns newest first, remove this.
  const rows = useMemo(() => {
    const r = activities.rows ?? [];
    return [...r].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [activities.rows]);

  return (
    <Section title="Activities" tone="blue" variant="light" description={`Latest ${pageSize}`} right={activities.isFetching ? <div className="text-xs text-zinc-500">Refreshing…</div> : null}>
      {activities.error ? (
        <pre className="text-red-700 bg-red-50 ring-1 ring-red-200 p-3 rounded-xl overflow-auto text-xs">{JSON.stringify(activities.error, null, 2)}</pre>
      ) : activities.isLoading ? (
        <div className="text-sm text-zinc-600">Loading activities…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-zinc-600">No activities found.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((a, idx) => {
            const messageTypeLabel = pickMessageTypeLabel(a);
            const sentLine = formatSentLine(a.createdAt, a.createdBy);
            const cardTitle = pickCardTitle(a);
            const subAction = pickSubActionLabel(a);

            // Best-effort optional fields (these may not exist—safe fallbacks)
            const recipientCount = a.recipientCount ?? a.recipientsCount ?? a.recipients ?? null;

            // If you ever get start/stop timestamps:
            const startedAt: string | null = (a.startedAt as any) ?? null;
            const stoppedAt: string | null = (a.stoppedAt as any) ?? null;

            const startedMs = startedAt ? new Date(startedAt).getTime() : null;
            const stoppedMs = stoppedAt ? new Date(stoppedAt).getTime() : null;

            const duration = startedMs != null && stoppedMs != null ? formatDuration(stoppedMs - startedMs) : null;

            const stoppedText = safeDateTime(stoppedAt) ? `Stopped ${safeDateTime(stoppedAt)}` : null;

            return (
              <div key={`${a.createdAt ?? idx}-${idx}`} className="rounded-2xl bg-white ring-1 ring-zinc-200/70 shadow-sm">
                {/* Header */}
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-zinc-500" />
                      <div className="text-base font-semibold text-zinc-900">{messageTypeLabel}</div>
                    </div>

                    {/* right-side small actions (placeholders to match screenshot vibe) */}
                    <div className="flex items-center gap-2 text-zinc-500">
                      {/* You can wire these up later */}
                      {/* <Button variant="ghost" size="icon">…</Button> */}
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-zinc-600">{sentLine}</div>
                </div>

                {/* Inner highlight box */}
                <div className="px-5 pb-5">
                  <div className="rounded-2xl bg-blue-50/60 ring-1 ring-blue-200/70 px-5 py-4">
                    <div className="text-xl font-semibold text-zinc-900">{cardTitle}</div>

                    {subAction ? <div className="mt-1 text-base font-semibold text-zinc-700">{subAction}</div> : null}

                    {typeof recipientCount === 'number' ? (
                      <div className="mt-2 text-lg text-blue-700 font-medium">
                        {recipientCount} Recipient{recipientCount === 1 ? '' : 's'}
                      </div>
                    ) : null}

                    {duration || stoppedText ? (
                      <div className="mt-4">
                        <div className="text-base font-semibold text-zinc-700">Broadcast Duration</div>
                        <div className="mt-1 text-lg text-zinc-700">
                          {duration ? duration : '—'}
                          {stoppedText ? <span className="mx-2 text-zinc-400">|</span> : null}
                          {stoppedText ? stoppedText : null}
                        </div>
                      </div>
                    ) : null}

                    {/* optional meta line for debugging/extra info */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                      <ClipboardList className="h-3.5 w-3.5" />
                      <span>Action: {a.actionType ?? '—'}</span>
                      {a.priority ? <span className="text-zinc-300">•</span> : null}
                      {a.priority ? <span>Priority: {titleCase(a.priority)}</span> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
