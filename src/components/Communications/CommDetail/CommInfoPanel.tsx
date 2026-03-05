import { toTitleCase, StatusCell } from '../ListComms/commColumns';
import { formatDate } from 'utils/format';

export function CommInfoPanel({ comm }) {
  if (!comm) return null;

  return (
    <div className="mt-4 border-t border-[#96A3BD] pt-6 pb-4 border-b">
      <div className="flex items-start gap-x-6">
        {/* Priority */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-[#070D1A] whitespace-nowrap">Priority</div>
          <div className="inline-flex items-center rounded-lg bg-[#AEC8F7] text-[#0B0B14] text-sm font-medium px-3 py-1.5">{toTitleCase(comm.priority)}</div>
        </div>

        {/* Event Type */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-[#070D1A] whitespace-nowrap">Event Type</div>
          <div className="inline-flex items-center rounded-lg bg-[#AEC8F7] text-[#0B0B14] text-sm font-medium px-3 py-1.5">{toTitleCase(comm.eventType)}</div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-[#070D1A] whitespace-nowrap">Status</div>
          <div className="py-1.5">
            <StatusCell status={comm.active} />
          </div>
        </div>

        {/* Launch Time */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-[#070D1A] whitespace-nowrap">Launch Time</div>
          <div className="text-sm font-normal text-[#405172] whitespace-nowrap py-1.5">{formatDate(comm.created)}</div>
        </div>

        {/* Creator */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-[#070D1A] whitespace-nowrap">Creator</div>
          <div className="text-sm font-medium text-[#405172] whitespace-nowrap py-1.5">{comm.launchedBy}</div>
        </div>

        {/* Duration */}
        {/* <div className="flex flex-col gap-2 py-1.5">
          <div className="text-sm font-semibold text-[#070D1A] whitespace-nowrap">Duration</div>

          <div className="text-sm font-medium text-[#405172] whitespace-nowrap">
            {(() => {
              const createdIso = (comm as any).created as string | undefined;
              const closedIso = (comm as any).closedAt as string | undefined;

              const createdMs = createdIso ? Date.parse(createdIso) : null;
              const closedMs = closedIso ? Date.parse(closedIso) : null;

              const base = formatDuration(createdMs, closedMs) ?? '-';

              if (!closedMs) return base;

              const closedMins = Math.max(0, Math.round((Date.now() - closedMs) / 60000));

              return (
                <>
                  <span className="text-[#405172] font-semibold">{base}</span>
                  <span className="mx-2 text-[#405172] font-normal">|</span>
                  <span className="text-[#405172] font-normal">Closed {closedMins}m ago</span>
                </>
              );
            })()}
          </div>
        </div> */}
      </div>
    </div>
  );
}

export function formatDuration(createdMs?: number | null, closedMs?: number | null) {
  if (!createdMs) return null;
  const start = typeof createdMs === 'number' ? createdMs : Number(createdMs);
  const end = closedMs ? (typeof closedMs === 'number' ? closedMs : Number(closedMs)) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;

  const diff = Math.max(0, end - start);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}${remMin ? ` ${remMin}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''}`;
}
