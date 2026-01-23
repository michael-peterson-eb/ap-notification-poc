import React, { useMemo } from 'react';
import { Button } from '../../../../components/ui/button';
import type { CommTemplateDetail } from 'hooks/comms/list/useCommTemplatesByIds';

type Props = {
  // data
  title: string;
  templateId?: string | null;
  selectedTemplateDetail?: CommTemplateDetail | null;

  // state
  isTemplateDetailMissing?: boolean;
  isPending?: boolean;

  // callbacks
  onCancel: () => void;
  onConfirm: () => void;
};

// ✅ NEW: helper to format template recipients into readable lines
function formatRecipients(template: CommTemplateDetail | null): string[] {
  const r = template?.recipients;
  if (!r) return [];

  const lines: string[] = [];

  const pushList = (label: string, arr?: any[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return;

    for (const item of arr) {
      if (!item) continue;

      if (item.type === 'Name') {
        const parts = [item.firstName, item.middleInitial, item.lastName, item.suffix].filter(Boolean);
        lines.push(`${label}: ${parts.join(' ')}`);
        continue;
      }

      if (item.type === 'Id' && item.id) {
        lines.push(`${label}: ID ${item.id}`);
        continue;
      }

      if (item.type === 'ExternalId' && item.externalId) {
        lines.push(`${label}: ExternalId ${item.externalId}`);
        continue;
      }

      if (item.type === 'ResultSet' && item.id) {
        lines.push(`${label}: ResultSet ${item.id}`);
        continue;
      }

      // fallback
      try {
        lines.push(`${label}: ${JSON.stringify(item)}`);
      } catch {
        lines.push(`${label}: [unprintable item]`);
      }
    }
  };

  pushList('Contact', r.contacts);
  pushList('Group', r.groups);
  pushList('Rule', r.rules);
  pushList('Query', r.query);
  pushList('PublicUser', r.publicUsers);

  if (r.excluded?.contacts?.length) {
    pushList('Excluded Contact', r.excluded.contacts);
  }

  return lines;
}

const RecipientsPreviewPanel: React.FC<Props> = ({ title, templateId, selectedTemplateDetail, isTemplateDetailMissing, isPending, onCancel, onConfirm }) => {
  const recipients = useMemo(() => formatRecipients(selectedTemplateDetail), [selectedTemplateDetail]);

  return (
    <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-4">
      <div className="font-semibold text-amber-900">Confirm launch</div>

      <div className="text-sm text-amber-900/80 mt-1">
        You’re about to send <span className="font-medium">{title}</span>
        {templateId ? (
          <>
            {' '}
            using template <span className="font-medium">{selectedTemplateDetail?.name ?? selectedTemplateDetail?.id ?? templateId}</span>.
          </>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="mt-1 flex items-baseline gap-1 text-xs text-amber-900/70">
          <span>This will go to</span>
          <span className="font-extrabold">{recipients?.length ?? 0}</span>
          <span>recipient{(recipients?.length ?? 0) === 1 ? '' : 's'}.</span>
        </div>

        <div className="mt-2">
          {templateId && isTemplateDetailMissing ? (
            <div className="text-xs text-amber-900/70 mt-1">No recipient details available (template detail not loaded).</div>
          ) : !recipients || recipients.length === 0 ? (
            <div className="text-xs text-amber-900/70 mt-1">No recipients found in this template detail.</div>
          ) : (
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-900/90 max-h-48 overflow-auto">
              {recipients.map((line, idx) => (
                <li key={idx} className="font-mono">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Button variant="secondary" onClick={onCancel} disabled={Boolean(isPending)}>
          Cancel
        </Button>

        <Button onClick={onConfirm} disabled={Boolean(isPending) || !title}>
          {isPending ? 'Launching…' : 'Confirm & Launch'}
        </Button>
      </div>
    </div>
  );
};

export default RecipientsPreviewPanel;
