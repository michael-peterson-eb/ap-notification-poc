import React from 'react';
import { ClipboardList, PackageOpen, Package, CalendarSync } from 'lucide-react';
import type { CommActivity } from 'hooks/comms/details/useCommActivities';
import { titleCase, safeDateTime } from 'utils/format';
import { formatDuration } from './CommInfoPanel';

const ACTION_LABELS: Record<string, string> = {
  INIT: 'Original Communication Sent',
  FOLLOWUP: 'Communication Follow-up',
  UPDATE: 'Communication Updated',
  RESEND: 'Communication Resent',
  CLOSE: 'Communication Closed',
  REOPEN: 'Communication Reactivated',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  INIT: <ClipboardList color="#405172" strokeWidth={1.5} size={16} />,
  FOLLOWUP: <CalendarSync color="#405172" strokeWidth={1.5} size={16} />,
  UPDATE: <CalendarSync color="#405172" strokeWidth={1.5} size={16} />,
  RESEND: <CalendarSync color="#405172" strokeWidth={1.5} size={16} />,
  CLOSE: <Package color="#405172" strokeWidth={1.5} size={16} />,
  REOPEN: <PackageOpen color="#405172" strokeWidth={1.5} size={16} />,
};

const ACTION_ONLY_TYPES = new Set(['CLOSE', 'REOPEN']);

type ActionRowProps = {
  label: string;
  subline: string;
  icon?: React.ReactNode;
};

function ActionRow({ label, subline, icon }: ActionRowProps) {
  return (
    <div className="py-3 mt-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon ?? ACTION_ICONS['INIT']}</div>
        <div>
          <div className="text-xs font-semibold text-[#405172]">{label}</div>
          <div className="mt-1 text-sm text-[#405172] font-normal">{subline}</div>
        </div>
      </div>
    </div>
  );
}

type MessageCardProps = {
  icon?: React.ReactNode;
  messageTypeLabel: string;
  sentLine: string;
  cardTitle: string;
  subAction?: string | null;
  recipientCount?: number | null;
  duration?: string | null;
  closedText?: string | null;
  meta?: { actionType?: string | null; priority?: string | null } | null;
  actionIcons?: React.ReactNode;
};

function MessageCard({ icon, messageTypeLabel, sentLine, cardTitle, subAction, recipientCount, duration, closedText, meta, actionIcons }: MessageCardProps) {
  return (
    <>
      <ActionRow icon={icon} label={messageTypeLabel} subline={sentLine} />
      <div className="px-4">
        <div
          className="
          bg-white !px-5 !py-4 border-2
            rounded-xl
            bg-[linear-gradient(0deg,rgba(29,100,232,0.01)_0%,rgba(29,100,232,0.01)_100%),linear-gradient(180deg,#fff_0%,#fdfdfd_100%)]
            shadow-[0_4px_8px_0_rgba(0,0,0,0.08),0_6px_30px_-4px_rgba(29,100,232,0.25)]
            ">
          <div className="text-sm font-semibold text-black">{cardTitle}</div>

          {subAction ? <div className="mt-1 text-xs font-semibold text-[#405172]">{subAction}</div> : null}

          {typeof recipientCount === 'number' ? (
            <div className="mt-1 text-xs font-normal text-[#005EF9]">
              {recipientCount} Recipient{recipientCount === 1 ? '' : 's'}
            </div>
          ) : null}

          {(duration || closedText) && (
            <div className="mt-2">
              <div className="text-xs font-semibold text-[#405172]">Broadcast Duration</div>
              <div className="mt-1 text-sm text-zinc-700">
                <span className="text-[#405172] font-semibold">{duration}</span>
                {closedText ? (
                  <>
                    <span className="mx-1 text-[#405172] font-normal">|</span>
                    <span className="text-[#405172] font-normal">{closedText}</span>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ActivityRowOrCard({ activity, comm, recipientCount }: { activity: CommActivity; comm: any; recipientCount: number }) {
  // who created it
  const fullName = activity.createdBy?.fullName;

  // sent line (relative -> fallback full)
  const sentLine = (() => {
    if (!activity.createdAt) return 'Sent —';
    const d = new Date(activity.createdAt);
    const now = Date.now();
    const diffMs = Math.max(0, now - d.getTime());
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    if (hr < 24 && hr >= 1) return `Sent ${hr}h ago by ${fullName}`;
    if (min < 60 && min >= 1) return `Sent ${min}m ago by ${fullName}`;
    if (sec < 60) return `Sent ${sec}s ago by ${fullName}`;
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `Sent ${date} at ${time} by ${fullName}`;
  })();

  // message label & title
  const messageTypeLabel = (() => {
    const mt = activity.messageType ?? '';
    if (!mt) return 'Message';
    return `${titleCase(mt)} Message`;
  })();
  const cardTitle = activity.title ?? activity.subject ?? activity.name ?? (activity.actionType ? titleCase(activity.actionType) : 'Activity');

  // subAction label (for message card) — use ACTION_LABELS for known mapping
  const subAction = activity.actionType ? (ACTION_LABELS[activity.actionType] ?? titleCase(activity.actionType)) : null;

  // recipient detection

  // start/stop/duration and closed text
    // start/stop/duration and closed text
  const startedAt: string | null = (comm as any).created ?? null;
  const stoppedAt: string | null = (comm as any).closedAt ?? null;
  const startedMs = startedAt ? new Date(startedAt).getTime() : null;
  const stoppedMs = stoppedAt ? new Date(stoppedAt).getTime() : null;

  // use formatDuration(createdMs, closedMs) which falls back to Date.now() when closedMs is null
  const duration = formatDuration(startedMs, stoppedMs);
  const closedText = stoppedAt ? `Closed ${safeDateTime(stoppedAt)}` : null;

  // action row label + subline (precomputed once)
  const actionRowLabel = activity.actionType ? (ACTION_LABELS[activity.actionType] ?? titleCase(activity.actionType)) : 'Activity';
  const actionRowSubline = (() => {
    if (!activity.createdAt) return '';
    const d = new Date(activity.createdAt);
    const now = Date.now();
    const mins = Math.floor(Math.max(0, now - d.getTime()) / 60000);
    if (mins < 60) {
      const verb =
        activity.actionType && (activity.actionType === 'REOPEN' || activity.actionType === 'REACTIVATE')
          ? 'Reactivated'
          : activity.actionType && (activity.actionType === 'CLOSE' || activity.actionType === 'CLOSED')
            ? 'Closed'
            : (ACTION_LABELS[activity.actionType] ?? titleCase(activity.actionType ?? ''));
      return `${verb} ${mins}m ago by ${fullName}`;
    }
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const verb =
      activity.actionType && (activity.actionType === 'REOPEN' || activity.actionType === 'REACTIVATE')
        ? 'Reactivated'
        : activity.actionType && (activity.actionType === 'CLOSE' || activity.actionType === 'CLOSED')
          ? 'Closed'
          : (ACTION_LABELS[activity.actionType] ?? titleCase(activity.actionType ?? ''));
    return `${verb} ${date} at ${time} by ${fullName}`;
  })();

  const meta = {
    actionType: activity.actionType ?? null,
    priority: (activity as any).priority ?? null,
  };

  // pick icon from centralized map (fallback to ClipboardList)
  const icon = activity.actionType ? (ACTION_ICONS[activity.actionType] ?? <ClipboardList className="h-5 w-5 text-zinc-500" />) : <ClipboardList className="h-5 w-5 text-zinc-500" />;

  // rendering rules:
  // - message card for INIT or messageType === 'STANDARD' (or other message-like actions)
  // - compact action rows for CLOSE / REOPEN
  if ((activity.actionType === 'INIT' || activity.messageType === 'STANDARD' || activity.actionType === 'FOLLOWUP' || activity.actionType === 'RESEND') && activity.actionType !== 'CLOSE') {
    return (
      <MessageCard
        icon={icon}
        messageTypeLabel={messageTypeLabel}
        sentLine={sentLine}
        cardTitle={cardTitle}
        subAction={subAction}
        recipientCount={typeof recipientCount === 'number' ? recipientCount : null}
        duration={duration}
        closedText={closedText}
        meta={meta}
      />
    );
  }

  if (activity.actionType && ACTION_ONLY_TYPES.has(activity.actionType)) {
    return <ActionRow label={actionRowLabel} subline={actionRowSubline} icon={icon} />;
  }

  // fallback: if there's a messageType prefer MessageCard, otherwise ActionRow
  if (activity.messageType) {
    return (
      <MessageCard
        icon={icon}
        messageTypeLabel={messageTypeLabel}
        sentLine={sentLine}
        cardTitle={cardTitle}
        subAction={subAction}
        recipientCount={typeof recipientCount === 'number' ? recipientCount : null}
        duration={duration}
        closedText={closedText}
        meta={meta}
      />
    );
  }

  return <ActionRow label={actionRowLabel} subline={actionRowSubline} icon={icon} />;
}
