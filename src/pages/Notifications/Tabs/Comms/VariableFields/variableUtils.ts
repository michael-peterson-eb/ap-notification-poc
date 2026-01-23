import type { CommVariableDef, SelectionOption } from './types';

export type VariableType = 'single-select' | 'multi-select' | 'textbox' | 'textarea' | 'date';

type VarProp = { type?: string; value?: any };

function getProp(def: any, propType: string): any | undefined {
  const props: VarProp[] = Array.isArray(def?.properties) ? def.properties : [];
  const hit = props.find((p) => String(p?.type ?? '').toLowerCase() === propType.toLowerCase());
  return hit?.value;
}

export const toStrArr = (raw: any): string[] => {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return String(raw ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
};

export const getLabelFor = (id: string, def?: any) => String(def?.name ?? def?.title ?? def?.displayName ?? `Variable ${id}`);

/** IMPORTANT: Everbridge list-variables uses `variableType` (Single/Multiple/Date/Textbox/Textarea) */
export function deriveVariableType(def?: CommVariableDef, templateType?: string): VariableType {
  const vt = String((def as any)?.variableType ?? (def as any)?.type ?? templateType ?? '').toLowerCase();

  if (vt === 'multiple' || vt.includes('multi')) return 'multi-select';
  if (vt === 'single' || vt.includes('single')) return 'single-select';
  if (vt === 'textarea') return 'textarea';
  if (vt === 'date' || vt.includes('date')) return 'date';
  if (vt === 'textbox' || vt.includes('text')) return 'textbox';

  // safe fallback
  return 'textbox';
}

/** Options come from properties[{type:"Option", value:[...]}] */
export function getVarOptionsFromDef(def?: CommVariableDef): SelectionOption[] | undefined {
  const v = getProp(def, 'Option');
  if (!Array.isArray(v)) return undefined;

  return v
    .map((x: any) => {
      const value = String(x ?? '').trim();
      return value ? { value, label: value } : null;
    })
    .filter(Boolean) as SelectionOption[];
}

/** Default comes from properties[{type:"DefaultValue", value:"..."|[]}] */
export function getDefaultValueFromDef(def?: CommVariableDef): any {
  const v = getProp(def, 'DefaultValue');
  return v ?? undefined;
}

/** Length comes from properties[{type:"Length", value:260}] */
export function getLengthFromDef(def?: CommVariableDef): number | undefined {
  const v = getProp(def, 'Length');
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Formatter comes from properties[{type:"DatetimeFormatter", value:"MM-dd-yyyy HH:mm:ss"}] */
export function getDatetimeFormatter(def?: CommVariableDef): string | undefined {
  const v = getProp(def, 'DatetimeFormatter');
  return v ? String(v) : undefined;
}

export function formatterHasTime(fmt?: string): boolean {
  // your API uses "MM-dd-yyyy HH:mm:ss"
  const f = String(fmt ?? '').toLowerCase();
  return f.includes('hh') || f.includes(':mm') || f.includes('mm:') || f.includes('ss') || f.includes('time');
}

export function isMeaningfullyFilled(val: any): boolean {
  if (val == null) return false;
  if (Array.isArray(val)) return val.map(String).some((s) => s.trim().length > 0);
  return String(val).trim().length > 0;
}

export function parseMulti(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return String(raw ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

// --- date helpers (unchanged if yours already work) ---
export function tryParseToDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  const s = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatForDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatForDatetimeLocalInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export function parseDateOnlyLocal(isoDate: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  return { y: Number(m[1]), m0: Number(m[2]) - 1, d: Number(m[3]) };
}

export function parseDatetimeLocal(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m0: Number(m[2]) - 1, d: Number(m[3]), hh: Number(m[4]), mm: Number(m[5]) };
}

const pad2 = (n: number) => String(n).padStart(2, '0');
export const formatMMDDYYYY = (y: number, m0: number, d: number) => `${pad2(m0 + 1)}-${pad2(d)}-${y}`;
export const formatMMDDYYYY_HHMMSS = (y: number, m0: number, d: number, hh: number, mm: number) => `${formatMMDDYYYY(y, m0, d)} ${pad2(hh)}:${pad2(mm)}:00`;

/** optional: map server messages that start with "<id>:" to "<name>:" */
export function mapValidationMessagesToLabels(messages: any[], defsById: Record<string, CommVariableDef>) {
  return (messages ?? []).map((m: any) => {
    const s = String(m ?? '').trim();

    const m1 = /^(\d+)\s*:\s*(.*)$/.exec(s);
    const m2 = /^Variable\s+(\d+)\s*:\s*(.*)$/i.exec(s);

    const id = m2?.[1] ?? m1?.[1];
    const rest = (m2?.[2] ?? m1?.[2] ?? s).replace(/^Variable value:\s*/i, '').trim();

    if (id && defsById[id]) return `${getLabelFor(id, defsById[id])}: ${rest}`;
    return s.replace(/^Variable value:\s*/i, '').trim();
  });
}
