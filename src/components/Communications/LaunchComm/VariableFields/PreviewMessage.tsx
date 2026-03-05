import React, { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import Card from 'components/Card';
import { ChevronDown, ChevronRight } from 'lucide-react';

type MessageContent = {
  type: string;
  title?: string;
  contentType?: string; // "text/plain" | "text/html"
  content?: string;
  paths?: string[];
};

type VariableDef = {
  id: string;
  name: string;
  token: string;
  uniqueKey: string;
  variableType?: string;
};

type PreviewMessagesProps = {
  contents: MessageContent[];
  variables: VariableDef[];
  valuesById: Record<string, string | string[] | null | undefined>;
  defaultOpen?: Record<string, boolean>;
  getChannelLabel?: (c: MessageContent) => string;
};

function normalizeKey(s: string) {
  return (s ?? '').trim().toLowerCase();
}

function toDisplayValue(v: string | string[] | null | undefined) {
  if (v == null) return '';
  return Array.isArray(v) ? v.join(', ') : String(v);
}

function buildValueIndex(variables: VariableDef[], valuesById: PreviewMessagesProps['valuesById']) {
  const byKey = new Map<string, string | string[] | null>();

  for (const v of variables) {
    const value = valuesById[v.id] ?? null;

    const keys = [v.id, v.name, v.token, v.uniqueKey, `custom.[${v.name}]`, `custom.${v.token}`];

    for (const k of keys) {
      const nk = normalizeKey(k);
      if (nk) byKey.set(nk, value);
    }
  }

  return { byKey };
}

function interpolateTemplate(raw: string, valueIndex: { byKey: Map<string, any> }) {
  if (!raw) return '';

  return raw.replace(/\{\{\{\s*([^}]+?)\s*\}\}\}/g, (_match, inner) => {
    const expr = String(inner).trim();

    const printListMatch = expr.match(/^printList\s+(.+)$/i);
    if (printListMatch) {
      const keyRaw = printListMatch[1].trim();
      const val = valueIndex.byKey.get(normalizeKey(keyRaw));
      return toDisplayValue(val);
    }

    const val = valueIndex.byKey.get(normalizeKey(expr));
    return toDisplayValue(val);
  });
}

function defaultGetChannelLabel(c: MessageContent) {
  const p = (c.paths ?? []).join('|').toLowerCase();
  if (p.includes('sms')) return 'SMS';
  if (p.includes('voice')) return 'Voice';
  return 'Email';
}

function isHtmlContentType(contentType?: string) {
  return (contentType ?? '').toLowerCase().includes('text/html');
}

export function PreviewMessages({ contents, variables, valuesById, defaultOpen, getChannelLabel = defaultGetChannelLabel }: PreviewMessagesProps) {
  const [open, setOpen] = useState<Record<string, boolean>>(defaultOpen ?? { Email: true, SMS: false, Voice: false });

  const valueIndex = useMemo(() => buildValueIndex(variables ?? [], valuesById ?? {}), [variables, valuesById]);

  const grouped = useMemo(() => {
    const map = new Map<string, MessageContent[]>();
    for (const c of contents ?? []) {
      const label = getChannelLabel(c);
      map.set(label, [...(map.get(label) ?? []), c]);
    }
    return map;
  }, [contents, getChannelLabel]);

  if (!contents?.length) return null;

  return (
    <div className="p-6">
      <div className="text-[22px] font-medium text-[#13151C] mb-4">Preview the Message</div>

      {Array.from(grouped.entries()).map(([label, items]) => {
        const isOpen = Boolean(open[label]);

        return (
          <div key={label} className="py-3">
            {/* Whole header row is clickable */}
            <button type="button" className="w-full flex items-center gap-2 text-left py-2 rounded-md hover:bg-zinc-50" onClick={() => setOpen((s) => ({ ...s, [label]: !s[label] }))}>
              {/* Chevron on the LEFT */}
              <span className="text-zinc-500">{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>

              <span className="font-medium text-zinc-900">{label}</span>
            </button>

            {isOpen ? (
              <div className="mt-3 space-y-4">
                {items.map((c, idx) => {
                  const interpolated = interpolateTemplate(c.content ?? '', valueIndex);
                  const title = c.title?.trim();
                  const html = isHtmlContentType(c.contentType);

                  const safeHtml = html ? DOMPurify.sanitize(interpolated) : '';

                  return (
                    // No grey background; keep spacing/padding similar
                    <div key={idx} className="rounded-xl p-4">
                      {title ? <div className="text-sm font-semibold text-zinc-900 mb-2">{title}</div> : null}

                      {html ? (
                        <div className="text-sm text-zinc-800 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: safeHtml }} />
                      ) : (
                        <div className="text-sm text-zinc-800 whitespace-pre-wrap">{interpolated || <span className="text-zinc-400">No content</span>}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
